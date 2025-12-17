'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  getSession,
  getSessionAnswers,
  getTopic,
  getSubject,
  getGradeLabel,
  createSession,
} from '@/lib/api';
import type { LearningSession, SessionAnswer, Topic, Subject } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Home,
  RotateCcw,
  TrendingUp,
  Clock,
  Target,
  Award,
  CheckCircle2,
  XCircle,
  Share2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function ResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    loadResults();
  }, [params.sessionId]);

  async function loadResults() {
    try {
      setLoading(true);
      const [sessionData, sessionAnswers] = await Promise.all([
        getSession(params.sessionId),
        getSessionAnswers(params.sessionId),
      ]);

      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);
      setAnswers(sessionAnswers);

      if (sessionData.topic_id) {
        const [topicData] = await Promise.all([
          getTopic(sessionData.topic_id),
        ]);

        setTopic(topicData);

        if (topicData) {
          const subjectData = await getSubject(topicData.subject_id);
          setSubject(subjectData);
        }
      }
    } catch (error) {
      console.error('Error loading results:', error);
      alert('Failed to load results');
      router.push('/home');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(mode: 'practice' | 'test' | 'timed', isSameMode: boolean) {
    if (!session || !topic || !subject || !userId) return;

    try {
      setCreatingSession(true);

      // Create a new session with the same topic and question count
      const newSession = await createSession({
        userId,
        subjectId: session.subject_id,
        topicId: session.topic_id!,
        mode,
        totalQuestions: session.total_questions,
        timeLimit: mode === 'timed' ? (session.time_limit_seconds || 30) : undefined,
      });

      // Navigate to the appropriate mode page
      router.push(`/${mode}/${newSession.id}`);
    } catch (error) {
      console.error('Error creating retry session:', error);
      alert('Failed to start new session. Please try again.');
      setCreatingSession(false);
    }
  }

  function getModeConfig(mode: 'practice' | 'test' | 'timed') {
    const configs = {
      practice: {
        name: 'Practice Mode',
        color: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700',
        icon: <Target className="w-5 h-5" />,
      },
      test: {
        name: 'Test Mode',
        color: 'bg-purple-600',
        hoverColor: 'hover:bg-purple-700',
        icon: <Award className="w-5 h-5" />,
      },
      timed: {
        name: 'Timed Challenge',
        color: 'bg-orange-600',
        hoverColor: 'hover:bg-orange-700',
        icon: <Zap className="w-5 h-5" />,
      },
    };
    return configs[mode];
  }

  function getAlternativeModes() {
    const allModes: ('practice' | 'test' | 'timed')[] = ['practice', 'test', 'timed'];
    return allModes.filter(mode => mode !== session?.mode);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Session not found</p>
      </div>
    );
  }

  const score = session.score_percentage || 0;
  const gradeInfo = getGradeLabel(score);
  const incorrectCount = session.total_questions - session.correct_answers;
  const timeInMinutes = Math.floor(session.time_spent_seconds / 60);
  const timeInSeconds = session.time_spent_seconds % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Celebration Header */}
        <div className="text-center py-8">
          <div className="text-8xl mb-4 animate-bounce">{gradeInfo.emoji}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{gradeInfo.label}!</h1>
          <p className="text-lg text-gray-600">
            You scored <span className="font-bold text-indigo-600">{Math.round(score)}%</span> in {session.mode} mode
          </p>
        </div>

        {/* Score Card */}
        <Card variant="gradient" className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <div className="text-center py-6">
            <p className="text-white/90 mb-2">Your Score</p>
            <p className="text-7xl font-bold mb-2">{Math.round(score)}%</p>
            <p className="text-white/80">
              {session.correct_answers} out of {session.total_questions} correct
            </p>
          </div>
          
          {/* Circular Progress */}
          <div className="mt-6">
            <ProgressBar
              value={score}
              color="success"
              showLabel
            />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{session.correct_answers}</p>
            <p className="text-xs text-gray-600">Correct</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{incorrectCount}</p>
            <p className="text-xs text-gray-600">Incorrect</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{timeInMinutes}:{timeInSeconds.toString().padStart(2, '0')}</p>
            <p className="text-xs text-gray-600">Time Spent</p>
          </Card>

          <Card className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{Math.round(score)}%</p>
            <p className="text-xs text-gray-600">Accuracy</p>
          </Card>
        </div>

        {/* Performance Analysis */}
        <Card>
          <h3 className="font-bold text-lg text-gray-900 mb-4">Performance Analysis</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Correct Answers</span>
                <span className="text-sm font-semibold text-green-600">
                  {session.correct_answers} / {session.total_questions}
                </span>
              </div>
              <ProgressBar value={(session.correct_answers / session.total_questions) * 100} color="success" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Incorrect Answers</span>
                <span className="text-sm font-semibold text-red-600">
                  {incorrectCount} / {session.total_questions}
                </span>
              </div>
              <ProgressBar value={(incorrectCount / session.total_questions) * 100} color="error" />
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="bg-blue-50 border-2 border-blue-200">
          <div className="flex gap-3">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Recommendations</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {score >= 80 && (
                  <li>🌟 Excellent work! You've mastered this topic. Try a more challenging topic or timed mode.</li>
                )}
                {score >= 60 && score < 80 && (
                  <>
                    <li>👍 Good job! Review the questions you got wrong to improve further.</li>
                    <li>📚 Consider practicing more questions in this topic to boost your accuracy.</li>
                  </>
                )}
                {score < 60 && (
                  <>
                    <li>📖 Keep practicing! Try practice mode to see detailed explanations.</li>
                    <li>💪 Focus on understanding the concepts before attempting more questions.</li>
                    <li>🎯 Use hints in practice mode to learn the material better.</li>
                  </>
                )}
                <li>🔥 Come back tomorrow to maintain your streak!</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Quick Retry Section */}
        {topic && (
          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="mb-4">
              <h3 className="font-bold text-xl text-gray-900 mb-1">Ready for More? 🚀</h3>
              <p className="text-sm text-gray-600">
                Practice the same topic again or try a different learning mode
              </p>
            </div>

            {/* Primary Retry Button - Same Mode */}
            <div className="space-y-3">
              <button
                onClick={() => handleRetry(session!.mode, true)}
                disabled={creatingSession}
                className={`
                  w-full flex items-center justify-center gap-2
                  ${getModeConfig(session!.mode).color}
                  ${getModeConfig(session!.mode).hoverColor}
                  text-white font-semibold py-4 text-lg
                  rounded-xl
                  transform transition-all hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  shadow-lg
                `}
              >
                <RefreshCw className="w-5 h-5" />
                {creatingSession ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </span>
                ) : (
                  `Practice This Topic Again (${getModeConfig(session!.mode).name})`
                )}
              </button>

              {/* Alternative Mode Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAlternativeModes().map(mode => {
                  const config = getModeConfig(mode);
                  return (
                    <Button
                      key={mode}
                      variant="outline"
                      size="full"
                      leftIcon={config.icon}
                      onClick={() => handleRetry(mode, false)}
                      disabled={creatingSession}
                      className={`
                        border-2 font-semibold
                        hover:${config.color.replace('bg-', 'border-')}
                        hover:text-white
                        transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      style={{
                        borderColor: config.color.includes('blue') ? '#2563eb' :
                                    config.color.includes('purple') ? '#9333ea' : '#ea580c'
                      }}
                    >
                      Try {config.name}
                    </Button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-500 text-center mt-2">
                Each session will have {session!.total_questions} questions
                {session!.mode === 'timed' && session!.time_limit_seconds &&
                  ` with ${session!.time_limit_seconds}s per question`}
              </p>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="primary"
            size="full"
            leftIcon={<Home className="w-5 h-5" />}
            onClick={() => router.push('/home')}
          >
            Back to Home
          </Button>

          <Link href={`/topics/${subject?.id}`}>
            <Button
              variant="outline"
              size="full"
              leftIcon={<RotateCcw className="w-5 h-5" />}
            >
              View All Topics
            </Button>
          </Link>
        </div>

        {/* Share Button (Placeholder) */}
        <Button
          variant="ghost"
          size="full"
          leftIcon={<Share2 className="w-5 h-5" />}
          onClick={() => alert('Share feature coming soon!')}
        >
          Share Your Score
        </Button>

        {/* Session Info */}
        <Card variant="outlined" className="bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Subject</p>
              <p className="font-semibold text-gray-900">{subject?.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Topic</p>
              <p className="font-semibold text-gray-900">{topic?.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Mode</p>
              <p className="font-semibold text-gray-900 capitalize">{session.mode}</p>
            </div>
            <div>
              <p className="text-gray-600">Completed</p>
              <p className="font-semibold text-gray-900">
                {new Date(session.completed_at || '').toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
