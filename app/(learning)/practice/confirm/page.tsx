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
  const { userId, isGuest } = useAuth();
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
    if ((!userId && !isGuest) || !subject) return;

    try {
      setCreatingSession(true);

      // Create session with multi-topic support (guest or authenticated)
      const session = await createSession({
        userId: userId || '',
        subjectId: subject.id,
        topicIds: topicIds.length > 1 ? topicIds : undefined,
        topicId: topicIds.length === 1 ? topicIds[0] : undefined,
        mode: 'practice',
        totalQuestions: questionCount,
        isGuest: isGuest,
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <p className="text-sm sm:text-base text-gray-600">Subject not found</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="text-2xl sm:text-3xl flex-shrink-0">{subject.icon || '📚'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{subject.name}</p>
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Confirm Practice Session</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Confirmation Card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/80 shadow-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Your Practice Set</h2>
              <p className="text-sm sm:text-base text-gray-700 mb-4">
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
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-white rounded-lg border border-indigo-100/80 shadow-sm"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-medium text-gray-900 text-sm sm:text-base break-words">{topic.name}</span>
                          {topic.difficulty && (
                            <Badge variant={
                              topic.difficulty === 'Easy' ? 'success' :
                              topic.difficulty === 'Medium' ? 'warning' :
                              'error'
                            } size="sm" className="flex-shrink-0">
                              {topic.difficulty}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-indigo-600 text-sm sm:text-base whitespace-nowrap flex-shrink-0 sm:ml-auto">
                      {count} questions
                    </span>
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
        <Card className="shadow-md border-gray-200/80">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Session Details</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-600">Mode</span>
              <Badge variant="info" size="sm">Practice Mode</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-600">Total Questions</span>
              <span className="font-semibold text-sm sm:text-base text-gray-900">{questionCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-600">Topics</span>
              <span className="font-semibold text-sm sm:text-base text-gray-900">{topics.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm sm:text-base text-gray-600">Subject</span>
              <span className="font-semibold text-sm sm:text-base text-gray-900 truncate ml-2">{subject.name}</span>
            </div>
          </div>
        </Card>

        {/* Features Reminder */}
        <Card variant="outlined" className="border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
          <div className="flex gap-3">
            <div className="text-xl sm:text-2xl flex-shrink-0">💡</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Practice Mode Features</p>
              <ul className="space-y-1 text-xs sm:text-sm text-gray-700">
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="md"
            onClick={handleGoBack}
            disabled={creatingSession}
            className="w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px] order-2 sm:order-1"
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleStartPractice}
            disabled={creatingSession}
            leftIcon={<Play className="w-4 h-4 sm:w-5 sm:h-5" />}
            className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] order-1 sm:order-2 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
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
