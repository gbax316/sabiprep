'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getTopic, getSubject, createSession, getRandomQuestions } from '@/lib/api';
import type { Topic, Subject } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Target,
  Clock,
  Lightbulb,
  Award,
  Zap,
  ChevronRight,
} from 'lucide-react';

export default function ModeSelectPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState(30);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    loadTopicData();
  }, [topicId]);

  async function loadTopicData() {
    try {
      setLoading(true);
      const topicData = await getTopic(topicId);
      setTopic(topicData);

      if (topicData) {
        const subjectData = await getSubject(topicData.subject_id);
        setSubject(subjectData);
      }
    } catch (error) {
      console.error('Error loading topic:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startMode(mode: 'practice' | 'test' | 'timed') {
    if (!topic || !subject || !userId) return;

    try {
      setCreatingSession(true);

      // Create session
      const session = await createSession({
        userId,
        subjectId: subject.id,
        topicId: topic.id,
        mode,
        totalQuestions: questionCount,
        timeLimit: mode === 'timed' ? timeLimit : undefined,
      });

      // Navigate to the appropriate mode page
      router.push(`/${mode}/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setCreatingSession(false);
    }
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

  if (!topic || !subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-900">Topic not found</p>
          <Link href="/subjects" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  const modes = [
    {
      id: 'practice',
      name: 'Practice Mode',
      description: 'Learn at your own pace with hints and explanations',
      icon: <Lightbulb className="w-8 h-8" />,
      color: 'bg-blue-500',
      features: ['💡 Hints available', '📖 Detailed solutions', '⏮️ Go back anytime', '📊 Track progress'],
      recommended: true,
    },
    {
      id: 'test',
      name: 'Test Mode',
      description: 'Challenge yourself without hints to see what you know',
      icon: <Award className="w-8 h-8" />,
      color: 'bg-purple-500',
      features: ['🎯 No hints', '📝 Answer all questions', '🔍 Review at end', '🏆 Get your score'],
      recommended: false,
    },
    {
      id: 'timed',
      name: 'Timed Challenge',
      description: 'Configurable time limit per question - test your speed and accuracy',
      icon: <Zap className="w-8 h-8" />,
      color: 'bg-orange-500',
      features: ['⚡ Choose your time limit', '🚀 Auto-advance', '⏱️ Beat the clock', '💯 Instant scoring'],
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/topics/${subject.id}`}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl">{subject.icon || '📚'}</div>
              <div>
                <p className="text-sm text-gray-600">{subject.name}</p>
                <h1 className="text-xl font-bold text-gray-900">{topic.name}</h1>
              </div>
            </div>
            {topic.difficulty && (
              <Badge variant={
                topic.difficulty === 'Easy' ? 'success' :
                topic.difficulty === 'Medium' ? 'warning' :
                'error'
              }>
                {topic.difficulty}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Topic Info */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{topic.total_questions}</p>
              <p className="text-sm text-gray-600">Questions Available</p>
            </div>
          </div>
        </Card>

        {/* Question Count Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How many questions do you want to answer?
          </label>
          <div className="flex gap-2">
            {[10, 20, 30, 40].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                disabled={count > topic.total_questions}
                className={`
                  flex-1 py-3 rounded-xl font-semibold transition-all
                  ${questionCount === count
                    ? 'bg-indigo-600 text-white'
                    : count > topic.total_questions
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-600'
                  }
                `}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit Selector (for Timed Mode only) */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-orange-600" />
            <label className="text-sm font-medium text-gray-900">
              Time Limit per Question (for Timed Mode)
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 60].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setTimeLimit(seconds)}
                className={`
                  py-3 rounded-xl font-semibold transition-all
                  ${timeLimit === seconds
                    ? 'bg-orange-600 text-white'
                    : 'bg-white border-2 border-orange-200 text-gray-700 hover:border-orange-600'
                  }
                `}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This setting only applies to Timed Challenge mode
          </p>
        </div>

        {/* Mode Selection */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Choose Your Learning Mode</h2>
          <div className="space-y-4">
            {modes.map((mode) => (
              <Card
                key={mode.id}
                variant={questionCount > topic.total_questions ? 'outlined' : 'elevated'}
                className={`
                  cursor-pointer transition-all
                  ${questionCount <= topic.total_questions ? 'hover:shadow-xl hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'}
                `}
                onClick={() => {
                  if (questionCount <= topic.total_questions) {
                    startMode(mode.id as 'practice' | 'test' | 'timed');
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`${mode.color} text-white p-4 rounded-2xl flex-shrink-0`}>
                    {mode.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-900">{mode.name}</h3>
                      {mode.recommended && (
                        <Badge variant="success" size="sm">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{mode.description}</p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-2">
                      {mode.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs text-gray-700">
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <Card variant="outlined" className="border-indigo-200 bg-indigo-50">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Pro Tip</p>
              <p className="text-sm text-gray-700">
                Start with Practice Mode to get familiar with the questions, then test yourself with Test or Timed modes!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
