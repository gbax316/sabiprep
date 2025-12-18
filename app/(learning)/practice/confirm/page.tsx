'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics, createSession } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  BookOpen,
} from 'lucide-react';

function PracticeConfirmContent() {
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const subjectId = searchParams?.get('subjectId') || '';
  const questionCount = parseInt(searchParams?.get('questionCount') || '20');
  const topicIds = searchParams?.get('topicIds')?.split(',') || [];
  const mode = searchParams?.get('mode') || 'mix';

  useEffect(() => {
    loadData();
  }, [subjectId]);

  async function loadData() {
    try {
      setLoading(true);
      const [subjectData, allTopics] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);

      setSubject(subjectData);
      // Filter to only selected topics
      const selectedTopics = allTopics.filter(t => topicIds.includes(t.id));
      setTopics(selectedTopics);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
      router.push('/practice');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartPractice() {
    if (!userId || !subject) return;

    try {
      setCreatingSession(true);

      // Create session with multi-topic support
      const session = await createSession({
        userId,
        subjectId: subject.id,
        topicIds: topicIds.length > 1 ? topicIds : undefined,
        topicId: topicIds.length === 1 ? topicIds[0] : undefined,
        mode: 'practice',
        totalQuestions: questionCount,
      });

      // Navigate to practice session
      router.push(`/practice/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start practice session. Please try again.');
      setCreatingSession(false);
    }
  }

  function handleGoBack() {
    router.back();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Subject not found</p>
      </div>
    );
  }

  // Calculate topic distribution for display
  const getTopicDistribution = () => {
    if (mode === 'mix') {
      const questionsPerTopic = Math.ceil(questionCount / topics.length);
      return topics.map(topic => ({
        topic,
        count: Math.min(questionsPerTopic, topic.total_questions),
      }));
    } else {
      // For specific topics, distribute proportionally
      const totalAvailable = topics.reduce((sum, t) => sum + t.total_questions, 0);
      return topics.map(topic => ({
        topic,
        count: Math.round((topic.total_questions / totalAvailable) * questionCount),
      }));
    }
  };

  const topicDistribution = getTopicDistribution();
  const totalDistributed = topicDistribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl">{subject.icon || '📚'}</div>
              <div>
                <p className="text-sm text-gray-600">{subject.name}</p>
                <h1 className="text-xl font-bold text-gray-900">Confirm Practice Session</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Confirmation Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Your Practice Set</h2>
              <p className="text-gray-700 mb-4">
                {mode === 'mix' 
                  ? `${questionCount} questions from ${topics.length} topics`
                  : `${questionCount} questions from ${topics.length} selected topic${topics.length > 1 ? 's' : ''}`
                }
              </p>
              
              {/* Topic Breakdown */}
              <div className="mt-4 space-y-2">
                {topicDistribution.map(({ topic, count }) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <span className="font-medium text-gray-900">{topic.name}</span>
                      {topic.difficulty && (
                        <Badge variant={
                          topic.difficulty === 'Easy' ? 'success' :
                          topic.difficulty === 'Medium' ? 'warning' :
                          'error'
                        } size="sm">
                          {topic.difficulty}
                        </Badge>
                      )}
                    </div>
                    <span className="font-semibold text-indigo-600">{count} questions</span>
                  </div>
                ))}
              </div>

              {totalDistributed !== questionCount && (
                <p className="text-xs text-gray-500 mt-3">
                  Note: Question distribution may vary slightly based on available questions per topic.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Session Details */}
        <Card>
          <h3 className="font-bold text-lg text-gray-900 mb-4">Session Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Mode</span>
              <Badge variant="info">Practice Mode</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Questions</span>
              <span className="font-semibold text-gray-900">{questionCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Topics</span>
              <span className="font-semibold text-gray-900">{topics.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Subject</span>
              <span className="font-semibold text-gray-900">{subject.name}</span>
            </div>
          </div>
        </Card>

        {/* Features Reminder */}
        <Card variant="outlined" className="border-blue-200 bg-blue-50">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Practice Mode Features</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✅ Hints available when you're stuck</li>
                <li>✅ Detailed solutions with explanations</li>
                <li>✅ Navigate freely between questions</li>
                <li>✅ No time pressure - learn at your own pace</li>
                <li>✅ Track your progress in real-time</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="full"
            onClick={handleGoBack}
            disabled={creatingSession}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="full"
            onClick={handleStartPractice}
            disabled={creatingSession}
            leftIcon={<Play className="w-5 h-5" />}
          >
            {creatingSession ? 'Starting Session...' : 'Begin Practice'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PracticeConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PracticeConfirmContent />
    </Suspense>
  );
}
