'use client';

import React, { useEffect, useState, use, useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import {
  getSession,
  getSessionAnswers,
  getQuestionsByIds,
  getTopic,
  getSubject,
  getGradeLabel,
  createSession,
  getTopics,
} from '@/lib/api';
import type { LearningSession, SessionAnswer, Topic, Subject, Question } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Home,
  RotateCcw,
  TrendingUp,
  Clock,
  Timer,
  Target,
  Award,
  CheckCircle2,
  XCircle,
  Share2,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [topicAnalytics, setTopicAnalytics] = useState<Map<string, {
    correct: number;
    total: number;
    hintsUsed: number;
    solutionsViewed: number;
    firstAttemptCorrect: number;
  }>>(new Map());

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  async function loadResults() {
    try {
      setLoading(true);
      const [sessionData, sessionAnswers] = await Promise.all([
        getSession(sessionId),
        getSessionAnswers(sessionId),
      ]);

      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);
      setAnswers(sessionAnswers);

      // Load subject and topics in parallel
      const [subjectData, allTopics] = await Promise.all([
        getSubject(sessionData.subject_id),
        getTopics(sessionData.subject_id),
      ]);
      setSubject(subjectData);

      // Get questions from session answers (much faster than re-fetching random questions)
      const questionIds = sessionAnswers.map(a => a.question_id);
      const questionsData = await getQuestionsByIds(questionIds);
      setQuestions(questionsData);

      // Load topics - support both single and multi-topic
      let topicsData: Topic[] = [];
      if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        // Multi-topic session
        topicsData = allTopics.filter(t => sessionData.topic_ids!.includes(t.id));
        setTopics(topicsData);
        if (topicsData.length > 0) {
          setTopic(topicsData[0]);
        }
      } else {
        // Single topic session
        const topicId = sessionData.topic_id || sessionData.topic_ids?.[0];
        if (topicId) {
          const topicData = await getTopic(topicId);
          setTopic(topicData);
          if (topicData) {
            topicsData = [topicData];
            setTopics([topicData]);
          }
        }
      }

      // Calculate topic-specific analytics
      const analytics = new Map<string, {
        correct: number;
        total: number;
        hintsUsed: number;
        solutionsViewed: number;
        firstAttemptCorrect: number;
      }>();

      sessionAnswers.forEach(answer => {
        const topicId = answer.topic_id || sessionData.topic_id || sessionData.topic_ids?.[0];
        if (!topicId) return;

        const current = analytics.get(topicId) || {
          correct: 0,
          total: 0,
          hintsUsed: 0,
          solutionsViewed: 0,
          firstAttemptCorrect: 0,
        };

        current.total++;
        if (answer.is_correct) current.correct++;
        if (answer.hint_used) current.hintsUsed++;
        if (answer.solution_viewed) current.solutionsViewed++;
        if (answer.first_attempt_correct) current.firstAttemptCorrect++;

        analytics.set(topicId, current);
      });

      setTopicAnalytics(analytics);
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

  // Compute topic breakdown component for test/timed modes
  // This must be called before any early returns to follow Rules of Hooks
  const topicBreakdownComponent = useMemo(() => {
    if (!session || !(session.mode === 'test' || session.mode === 'timed') || topics.length === 0 || topicAnalytics.size === 0) {
      return null;
    }

    // For timed mode, get time data from the already calculated topicTimeStats
    const timedTopicTimeStats = session.mode === 'timed' && session.time_limit_seconds && answers.length > 0 ? (() => {
      // Reuse the topicTimeStats from the timed mode analytics section
      const topicTimeMap = new Map<string, { totalTime: number; avgTime: number; count: number; topic: Topic }>();
      
      answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        if (!question) return;
        
        const topicId = answer.topic_id || question.topic_id || session.topic_id || session.topic_ids?.[0];
        if (!topicId) return;
        
        const topic = topics.find(t => t.id === topicId);
        if (!topic) return;
        
        const current = topicTimeMap.get(topicId) || {
          topic,
          totalTime: 0,
          avgTime: 0,
          count: 0,
        };
        
        current.count++;
        current.totalTime += answer.time_spent_seconds || 0;
        current.avgTime = current.count > 0 ? current.totalTime / current.count : 0;
        
        topicTimeMap.set(topicId, current);
      });
      
      return topicTimeMap;
    })() : null;

    const isTimedMode = session.mode === 'timed';

    const formatTimeForTable = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <Card>
        <h3 className="font-bold text-lg text-gray-900 mb-4">Topic Performance Breakdown</h3>
        
        {/* Summary Stats */}
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
          <div className={`grid ${isTimedMode && timedTopicTimeStats ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
            <div>
              <div className="text-2xl font-bold text-indigo-600">
                {Array.from(topicAnalytics.values()).reduce((sum, a) => sum + a.total, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Questions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Array.from(topicAnalytics.values()).reduce((sum, a) => sum + a.correct, 0)}
              </div>
              <div className="text-xs text-gray-600">Correct</div>
            </div>
            {isTimedMode && timedTopicTimeStats && (() => {
              const totalTime = Array.from(timedTopicTimeStats.values()).reduce((sum, t) => sum + t.totalTime, 0);
              const totalCount = Array.from(timedTopicTimeStats.values()).reduce((sum, t) => sum + t.count, 0);
              const avgTime = totalCount > 0 ? totalTime / totalCount : 0;
              return (
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatTimeForTable(avgTime)}
                  </div>
                  <div className="text-xs text-gray-600">Avg Time/Q</div>
                </div>
              );
            })()}
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  (Array.from(topicAnalytics.values()).reduce((sum, a) => sum + a.correct, 0) /
                   Array.from(topicAnalytics.values()).reduce((sum, a) => sum + a.total, 0)) * 100
                )}%
              </div>
              <div className="text-xs text-gray-600">Overall Score</div>
            </div>
          </div>
        </div>

      {/* Topic Breakdown Table */}
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Topic</th>
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Questions</th>
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Correct</th>
                {isTimedMode && timedTopicTimeStats && (
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Avg Time</th>
                )}
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Score</th>
                <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Rating</th>
              </tr>
            </thead>
            <tbody>
              {topics
                .map(topic => {
                  const analytics = topicAnalytics.get(topic.id);
                  if (!analytics || analytics.total === 0) return null;
                  
                  const score = Math.round((analytics.correct / analytics.total) * 100);
                  let rating: string;
                  let ratingColor: string;
                  
                  if (score >= 85) {
                    rating = 'Excellent';
                    ratingColor = 'text-emerald-600';
                  } else if (score >= 70) {
                    rating = 'Good';
                    ratingColor = 'text-blue-600';
                  } else if (score >= 60) {
                    rating = 'Fair';
                    ratingColor = 'text-amber-600';
                  } else {
                    rating = 'Needs Improvement';
                    ratingColor = 'text-red-600';
                  }
                  
                  return { topic, analytics, score, rating, ratingColor };
                })
                .filter(Boolean)
                .sort((a, b) => b!.score - a!.score)
                .map((item) => (
                  <tr key={item!.topic.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 min-h-[48px]">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {topics.indexOf(item!.topic) === 0 && '📊'}
                          {topics.indexOf(item!.topic) === 1 && '📐'}
                          {topics.indexOf(item!.topic) === 2 && '📈'}
                          {topics.indexOf(item!.topic) === 3 && '🔢'}
                          {topics.indexOf(item!.topic) === 4 && '📉'}
                          {topics.indexOf(item!.topic) > 4 && '📚'}
                        </span>
                        <span className="font-medium text-xs sm:text-sm text-gray-900">{item!.topic.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">{item!.analytics.total}</td>
                    <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700">{item!.analytics.correct}</td>
                    {isTimedMode && timedTopicTimeStats && (() => {
                      const timeData = timedTopicTimeStats.get(item!.topic.id);
                      const avgTime = timeData?.avgTime || 0;
                      const expectedTime = session.time_limit_seconds ? session.time_limit_seconds / session.total_questions : 0;
                      const timeStatus = avgTime > 0 ? (avgTime < expectedTime ? 'fast' : avgTime > expectedTime * 1.5 ? 'slow' : 'good') : null;
                      
                      return (
                        <td className="text-center py-2 sm:py-3 px-2 sm:px-4">
                          {avgTime > 0 ? (
                            <>
                              <span className={`font-semibold text-xs sm:text-sm ${
                                timeStatus === 'fast' ? 'text-green-600' : 
                                timeStatus === 'good' ? 'text-blue-600' : 
                                'text-amber-600'
                              }`}>
                                {formatTimeForTable(avgTime)}
                              </span>
                              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                                {timeStatus === 'fast' ? '⚡ Fast' : timeStatus === 'good' ? '✓ Good' : '⚠️ Slow'}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">N/A</span>
                          )}
                        </td>
                      );
                    })()}
                    <td className="text-center py-2 sm:py-3 px-2 sm:px-4">
                      <span className="font-bold text-xs sm:text-sm text-gray-900">{item!.score}%</span>
                    </td>
                    <td className="text-center py-2 sm:py-3 px-2 sm:px-4">
                      <span className={`font-semibold text-xs sm:text-sm ${item!.ratingColor}`}>
                        {item!.rating}
                        {item!.score < 75 && ' ⚠️'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weak Areas Identified */}
      {topics.some(t => {
        const analytics = topicAnalytics.get(t.id);
        if (!analytics || analytics.total === 0) return false;
        const score = Math.round((analytics.correct / analytics.total) * 100);
        return score < 75;
      }) && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-900 mb-2">Weak Areas Identified:</h4>
          <div className="flex flex-wrap gap-2">
            {topics
              .map(topic => {
                const analytics = topicAnalytics.get(topic.id);
                if (!analytics || analytics.total === 0) return null;
                const score = Math.round((analytics.correct / analytics.total) * 100);
                if (score < 75) {
                  return { topic, score };
                }
                return null;
              })
              .filter(Boolean)
              .map((item) => (
                <Badge key={item!.topic.id} variant="warning" size="sm">
                  {item!.topic.name} ({item!.score}%)
                </Badge>
              ))}
          </div>
          <p className="text-sm text-amber-800 mt-2">
            Focus on practicing these topics to improve your overall performance.
          </p>
        </div>
      )}
    </Card>
    );
  }, [session, topics, topicAnalytics, answers, questions]);

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
  
  // For test mode, calculate from actual answers (all questions should be answered)
  // For practice mode, use session data
  const isTestMode = session.mode === 'test';
  const isTimedMode = session.mode === 'timed';
  
  let correctCount: number;
  let incorrectCount: number;
  let totalAnswered: number;
  let calculatedAccuracy: number;
  
  if (isTestMode) {
    // Test mode: calculate from answers (all questions should have answers)
    correctCount = answers.filter(a => a.is_correct === true).length;
    totalAnswered = answers.length;
    incorrectCount = totalAnswered - correctCount;
    calculatedAccuracy = totalAnswered > 0 
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;
  } else if (isTimedMode) {
    // Timed mode: calculate from actual answers only (may have unanswered questions)
    // Only count questions that were actually answered
    totalAnswered = answers.length; // Actual number of questions answered
    correctCount = answers.filter(a => a.is_correct === true).length; // Actual correct answers
    incorrectCount = answers.filter(a => a.is_correct === false).length; // Actual incorrect answers
    // Accuracy is based on answered questions only
    calculatedAccuracy = totalAnswered > 0 
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;
  } else {
    // Practice mode: use session data
    correctCount = session.correct_answers;
    totalAnswered = session.questions_answered || answers.length;
    incorrectCount = totalAnswered - correctCount;
    calculatedAccuracy = Math.round(score);
  }
  
  // Time calculation - use actual session time
  const totalTimeSeconds = session.time_spent_seconds || 0;
  const timeInMinutes = Math.floor(totalTimeSeconds / 60);
  const timeInSeconds = totalTimeSeconds % 60;
  
  // Calculate enhanced metrics (only for practice mode)
  const firstAttemptCorrect = answers.filter(a => a.first_attempt_correct === true).length;
  const firstAttemptAccuracy = answers.length > 0 
    ? Math.round((firstAttemptCorrect / answers.length) * 100) 
    : 0;
  const hintsUsed = isTestMode ? 0 : answers.filter(a => a.hint_used).length;
  const solutionsViewed = isTestMode ? 0 : answers.filter(a => a.solution_viewed).length;
  const finalAccuracy = calculatedAccuracy;

  // Calculate speed vs accuracy data for timed mode (needed for Strengths & Weaknesses section)
  const timedSpeedAccuracyData = (() => {
    if (session.mode !== 'timed' || !session.time_limit_seconds || answers.length === 0) {
      return null;
    }

    const expectedTimePerQuestion = session.time_limit_seconds / session.total_questions;
    
    // Calculate topic-wise performance with time
    const topicTimeStats = new Map<string, {
      topic: Topic;
      total: number;
      correct: number;
      totalTime: number;
      avgTime: number;
    }>();
    
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.question_id);
      if (!question) return;
      
      const topicId = answer.topic_id || question.topic_id || session.topic_id || session.topic_ids?.[0];
      if (!topicId) return;
      
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;
      
      const current = topicTimeStats.get(topicId) || {
        topic,
        total: 0,
        correct: 0,
        totalTime: 0,
        avgTime: 0,
      };
      
      current.total++;
      if (answer.is_correct) current.correct++;
      current.totalTime += answer.time_spent_seconds || 0;
      
      topicTimeStats.set(topicId, current);
    });
    
    // Calculate averages
    topicTimeStats.forEach((stats, _) => {
      stats.avgTime = stats.total > 0 ? stats.totalTime / stats.total : 0;
    });
    
    // Speed vs Accuracy analysis
    const speedAccuracyData = Array.from(topicTimeStats.values()).map(stats => ({
      topic: stats.topic,
      speed: stats.avgTime < expectedTimePerQuestion ? 'fast' : 'slow',
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      avgTime: stats.avgTime,
      correct: stats.correct,
      total: stats.total,
    }));
    
    const fastAccurate = speedAccuracyData.filter(d => d.speed === 'fast' && d.accuracy >= 70);
    const fastInaccurate = speedAccuracyData.filter(d => d.speed === 'fast' && d.accuracy < 70);
    const slowAccurate = speedAccuracyData.filter(d => d.speed === 'slow' && d.accuracy >= 70);
    const slowInaccurate = speedAccuracyData.filter(d => d.speed === 'slow' && d.accuracy < 70);
    
    return {
      speedAccuracyData,
      fastAccurate,
      fastInaccurate,
      slowAccurate,
      slowInaccurate,
    };
  })();


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-8 sm:pb-12">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Back to Home Button */}
        <div className="flex items-center justify-start">
          <Link href="/home">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-gray-700 hover:text-gray-900 text-xs sm:text-sm"
            >
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Celebration Header */}
        <div className="text-center py-4 sm:py-8">
          {isTimedMode ? (
            <>
              <div className="text-4xl sm:text-6xl md:text-8xl mb-2 sm:mb-4">⚡</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 px-2">Timed Exam Complete!</h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 px-2">
                You scored <span className="font-bold text-orange-600">{finalAccuracy}%</span> under time pressure
                {totalAnswered < session.total_questions && (
                  <span className="block text-xs sm:text-sm text-gray-500 mt-1">
                    ({totalAnswered} of {session.total_questions} questions answered)
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl sm:text-6xl md:text-8xl mb-2 sm:mb-4 animate-bounce">{gradeInfo.emoji}</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 px-2">{gradeInfo.label}!</h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 px-2">
                You scored <span className="font-bold text-indigo-600">{Math.round(score)}%</span> in {session.mode} mode
              </p>
            </>
          )}
        </div>

        {/* Score Card - Different layouts for each mode */}
        {isTimedMode ? (
          // Timed Mode: Speed & Accuracy Focus
          <Card variant="gradient" className="bg-gradient-to-br from-orange-600 to-pink-600 text-white">
            <div className="text-center py-4 sm:py-6 md:py-8">
              <p className="text-white/90 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">Speed & Accuracy Score</p>
              <p className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-2 sm:mb-4">{finalAccuracy}%</p>
              <p className="text-white/80 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 px-2">
                {correctCount} correct out of {totalAnswered} answered
                {totalAnswered < session.total_questions && (
                  <span className="block text-xs sm:text-sm mt-1">
                    ({session.total_questions - totalAnswered} unanswered)
                  </span>
                )}
              </p>
              <div className="mt-4 sm:mt-6">
                <ProgressBar
                  value={finalAccuracy}
                  color="success"
                  showLabel
                />
              </div>
              {session.time_limit_seconds && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                  <p className="text-white/90 text-xs sm:text-sm">
                    {totalAnswered === session.total_questions 
                      ? '✅ Completed all questions' 
                      : `⚠️ ${session.total_questions - totalAnswered} questions unanswered`}
                  </p>
                  <p className="text-white/80 text-[10px] sm:text-xs mt-1">
                    Accuracy: {finalAccuracy}% (based on answered questions)
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : isTestMode ? (
          // Test Mode: Single Score Card
          <Card variant="gradient" className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
            <div className="text-center py-4 sm:py-6 md:py-8">
              <p className="text-white/90 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">Your Score</p>
              <p className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-2 sm:mb-4">{finalAccuracy}%</p>
              <p className="text-white/80 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 px-2">
                {correctCount} out of {isTimedMode ? totalAnswered : session.total_questions} questions correct
                {isTimedMode && totalAnswered < session.total_questions && (
                  <span className="block text-xs sm:text-sm mt-1 text-white/70">
                    ({session.total_questions - totalAnswered} unanswered)
                  </span>
                )}
              </p>
              <div className="mt-4 sm:mt-6">
                <ProgressBar
                  value={finalAccuracy}
                  color="success"
                  showLabel
                />
              </div>
            </div>
          </Card>
        ) : (
          // Practice Mode: First Attempt vs Final
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* First Attempt Score */}
            <Card variant="gradient" className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <div className="text-center py-4 sm:py-6">
                <p className="text-white/90 mb-1 sm:mb-2 text-xs sm:text-sm">First Attempt Score</p>
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-1 sm:mb-2">{firstAttemptAccuracy}%</p>
                <p className="text-white/80 text-xs sm:text-sm">
                  {firstAttemptCorrect} out of {answers.length} correct on first try
                </p>
              </div>
              <div className="mt-3 sm:mt-4">
                <ProgressBar
                  value={firstAttemptAccuracy}
                  color="success"
                  showLabel
                />
              </div>
            </Card>

            {/* Final Score */}
            <Card variant="gradient" className="bg-gradient-to-br from-green-600 to-emerald-600 text-white">
              <div className="text-center py-4 sm:py-6">
                <p className="text-white/90 mb-1 sm:mb-2 text-xs sm:text-sm">Final Score</p>
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-1 sm:mb-2">{finalAccuracy}%</p>
                <p className="text-white/80 text-xs sm:text-sm">
                  {correctCount} out of {isTimedMode ? totalAnswered : session.total_questions} correct
                  {isTimedMode && totalAnswered < session.total_questions && (
                    <span className="text-[10px] sm:text-xs text-white/70"> ({session.total_questions - totalAnswered} unanswered)</span>
                  )}
                </p>
              </div>
              <div className="mt-3 sm:mt-4">
                <ProgressBar
                  value={finalAccuracy}
                  color="success"
                  showLabel
                />
              </div>
            </Card>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 ${isTestMode ? 'md:grid-cols-3' : isTimedMode ? 'md:grid-cols-4' : 'md:grid-cols-4'} gap-2 sm:gap-3 md:gap-4`}>
          <Card className="text-center p-3 sm:p-4">
            <div className="w-8 h-8 sm:w-10 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-6 text-green-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{correctCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-600">Correct</p>
          </Card>

          <Card className="text-center p-3 sm:p-4">
            <div className="w-8 h-8 sm:w-10 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-6 text-red-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{incorrectCount}</p>
            <p className="text-[10px] sm:text-xs text-gray-600">Incorrect</p>
          </Card>

          <Card className="text-center p-3 sm:p-4">
            <div className="w-8 h-8 sm:w-10 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-6 text-blue-600" />
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
              {timeInMinutes > 0 
                ? `${timeInMinutes}m ${timeInSeconds}s`
                : `${timeInSeconds}s`
              }
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600">Time Spent</p>
          </Card>

          {isTimedMode && session.time_limit_seconds && (
            <Card className="text-center p-3 sm:p-4">
              <div className="w-8 h-8 sm:w-10 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Timer className="w-4 h-4 sm:w-5 sm:h-6 text-orange-600" />
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                {Math.floor(session.time_limit_seconds / 60)}m
              </p>
              <p className="text-[10px] sm:text-xs text-gray-600">Time Limit</p>
            </Card>
          )}
          {!isTestMode && !isTimedMode && (
            <Card className="text-center p-3 sm:p-4">
              <div className="w-8 h-8 sm:w-10 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Target className="w-4 h-4 sm:w-5 sm:h-6 text-purple-600" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{finalAccuracy}%</p>
              <p className="text-[10px] sm:text-xs text-gray-600">Accuracy</p>
            </Card>
          )}
        </div>

        {/* Enhanced Session Summary */}
        <Card className="p-4 sm:p-6">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">
            {isTimedMode ? '⚡ Speed & Time Management Summary' : 'Session Summary'}
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {totalAnswered} of {session.total_questions} questions
                </p>
                {isTimedMode && totalAnswered < session.total_questions && (
                  <p className="text-[10px] sm:text-xs text-amber-600 mt-1">
                    ⚠️ {session.total_questions - totalAnswered} unanswered
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">
                  {isTimedMode ? 'Time Used' : 'Time Spent'}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {timeInMinutes > 0 
                    ? `${timeInMinutes}m ${timeInSeconds}s`
                    : `${timeInSeconds}s`
                  }
                </p>
                {isTimedMode && session.time_limit_seconds ? (
                  <p className="text-xs text-gray-500 mt-1">
                    of {Math.floor(session.time_limit_seconds / 60)}m {session.time_limit_seconds % 60}s allocated
                  </p>
                ) : totalAnswered > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Avg {Math.round(totalTimeSeconds / totalAnswered)}s per question
                  </p>
                ) : null}
              </div>
            </div>

            {isTimedMode ? (
              // Timed Mode: Show speed vs accuracy balance
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Accuracy Score</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {finalAccuracy}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {correctCount} correct out of {totalAnswered} answered
                      {totalAnswered < session.total_questions && (
                        <span className="text-amber-600"> ({session.total_questions - totalAnswered} unanswered)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Time Efficiency</p>
                    {session.time_limit_seconds && totalTimeSeconds > 0 ? (
                      <>
                        <p className={`text-3xl font-bold ${
                          totalTimeSeconds <= session.time_limit_seconds ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round((totalTimeSeconds / session.time_limit_seconds) * 100)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {totalTimeSeconds <= session.time_limit_seconds 
                            ? 'Used efficiently ✓' 
                            : 'Exceeded time limit'}
                        </p>
                      </>
                    ) : (
                      <p className="text-3xl font-bold text-gray-400">N/A</p>
                    )}
                  </div>
                </div>
                {/* Performance Rating */}
                {session.time_limit_seconds && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Performance Rating</p>
                    {(() => {
                      // Use actual time from answers if available
                      const actualTimeUsed = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
                      const timeUsed = actualTimeUsed > 0 ? actualTimeUsed : totalTimeSeconds;
                      const timeEfficiency = timeUsed <= session.time_limit_seconds;
                      const completionRate = (totalAnswered / session.total_questions) * 100;
                      const speedAccuracyBalance = finalAccuracy >= 70 && timeEfficiency && completionRate >= 80;
                      
                      if (speedAccuracyBalance && completionRate >= 90) {
                        return <p className="text-orange-900">⚡ Excellent - Maintained good accuracy while managing time effectively!</p>;
                      } else if (finalAccuracy >= 70 && timeEfficiency && completionRate >= 70) {
                        return <p className="text-orange-800">✓ Good - Balanced speed and accuracy. Keep practicing!</p>;
                      } else if (finalAccuracy >= 70 && !timeEfficiency) {
                        return <p className="text-amber-800">⚠️ Accurate but exceeded time - Focus on building speed without losing accuracy</p>;
                      } else if (finalAccuracy < 70 && timeEfficiency && completionRate >= 80) {
                        return <p className="text-amber-800">⚠️ Fast but inaccurate - Slow down slightly to improve accuracy</p>;
                      } else if (completionRate < 70) {
                        return <p className="text-red-800">⚠️ Low completion rate - Practice pacing to answer more questions</p>;
                      } else {
                        return <p className="text-red-800">⚠️ Needs improvement - Practice time management and accuracy</p>;
                      }
                    })()}
                  </div>
                )}
              </div>
            ) : isTestMode ? (
              // Test Mode: Show only accuracy
              <div className="pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Test Score</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {finalAccuracy}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {correctCount} correct out of {isTimedMode ? totalAnswered : session.total_questions} answered
                    {isTimedMode && totalAnswered < session.total_questions && (
                      <span className="text-amber-600"> ({session.total_questions - totalAnswered} unanswered)</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              // Practice Mode: Show first attempt and final
              <>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">First Attempt Accuracy</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {firstAttemptAccuracy}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {firstAttemptCorrect} / {answers.length} correct on first try
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Final Accuracy</p>
                    <p className="text-2xl font-bold text-green-600">
                      {finalAccuracy}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {correctCount} / {isTimedMode ? totalAnswered : session.total_questions} correct
                      {isTimedMode && totalAnswered < session.total_questions && (
                        <span className="text-amber-600"> ({session.total_questions - totalAnswered} unanswered)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Hints Used</p>
                    <p className="text-2xl font-bold text-amber-600">{hintsUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Solutions Viewed</p>
                    <p className="text-2xl font-bold text-blue-600">{solutionsViewed}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Timed Mode Speed Analytics */}
        {session.mode === 'timed' && session.time_limit_seconds && answers.length > 0 && (() => {
          // Calculate time performance metrics from actual answers
          const totalTimeAllocated = session.time_limit_seconds;
          // Calculate actual time used from answers (sum of all time_spent_seconds)
          const actualTimeUsed = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
          // Use actual time if available, otherwise fall back to session time
          const totalTimeUsed = actualTimeUsed > 0 ? actualTimeUsed : totalTimeSeconds;
          const timeRemaining = Math.max(0, totalTimeAllocated - totalTimeUsed);
          const avgTimePerQuestion = totalAnswered > 0 ? totalTimeUsed / totalAnswered : 0;
          const expectedTimePerQuestion = totalTimeAllocated / session.total_questions;
          
          // Calculate per-question time stats
          const questionTimes = answers.map(a => a.time_spent_seconds).filter(t => t > 0);
          const fastestTime = questionTimes.length > 0 ? Math.min(...questionTimes) : 0;
          const slowestTime = questionTimes.length > 0 ? Math.max(...questionTimes) : 0;
          const overtimeQuestions = questionTimes.filter(t => t > 120).length; // >2 minutes
          
          // Calculate topic-wise performance with time
          const topicTimeStats = new Map<string, {
            topic: Topic;
            total: number;
            correct: number;
            totalTime: number;
            avgTime: number;
          }>();
          
          answers.forEach(answer => {
            const question = questions.find(q => q.id === answer.question_id);
            if (!question) return;
            
            const topicId = answer.topic_id || question.topic_id || session.topic_id || session.topic_ids?.[0];
            if (!topicId) return;
            
            const topic = topics.find(t => t.id === topicId);
            if (!topic) return;
            
            const current = topicTimeStats.get(topicId) || {
              topic,
              total: 0,
              correct: 0,
              totalTime: 0,
              avgTime: 0,
            };
            
            current.total++;
            if (answer.is_correct) current.correct++;
            current.totalTime += answer.time_spent_seconds;
            
            topicTimeStats.set(topicId, current);
          });
          
          // Calculate averages
          topicTimeStats.forEach((stats, _) => {
            stats.avgTime = stats.total > 0 ? stats.totalTime / stats.total : 0;
          });
          
          // Speed vs Accuracy analysis - use expected time per question as baseline
          const speedAccuracyData = Array.from(topicTimeStats.values()).map(stats => ({
            topic: stats.topic,
            speed: stats.avgTime < expectedTimePerQuestion ? 'fast' : 'slow',
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            avgTime: stats.avgTime,
            correct: stats.correct,
            total: stats.total,
            accuracyThreshold: 70, // Lower threshold for timed mode
          }));
          
          // Use 70% as accuracy threshold for timed mode (more realistic under pressure)
          const fastAccurate = speedAccuracyData.filter(d => d.speed === 'fast' && d.accuracy >= 70);
          const fastInaccurate = speedAccuracyData.filter(d => d.speed === 'fast' && d.accuracy < 70);
          const slowAccurate = speedAccuracyData.filter(d => d.speed === 'slow' && d.accuracy >= 70);
          const slowInaccurate = speedAccuracyData.filter(d => d.speed === 'slow' && d.accuracy < 70);
          
          // Format time helper
          const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
            return `${secs}s`;
          };
          
          return (
            <>
              {/* Time Performance Card */}
              <Card className="bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                  <h3 className="font-bold text-lg text-gray-900">⏱️ TIME PERFORMANCE</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Questions Answered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalAnswered}/{session.total_questions}
                    </p>
                    {totalAnswered < session.total_questions && (
                      <p className="text-xs text-amber-600 mt-1">
                        {session.total_questions - totalAnswered} unanswered
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Time Used</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatTime(totalTimeUsed)}
                    </p>
                    <p className="text-xs text-gray-500">of {formatTime(totalTimeAllocated)} allocated</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
                    <p className={`text-2xl font-bold ${timeRemaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {timeRemaining > 0 ? formatTime(timeRemaining) : 'Ran out'}
                    </p>
                    {timeRemaining > 0 && (
                      <p className="text-xs text-green-600 mt-1">Time left</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average per Question</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatTime(avgTimePerQuestion)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expected: {formatTime(expectedTimePerQuestion)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-orange-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Fastest Question</p>
                      <p className="font-semibold text-green-600">{formatTime(fastestTime)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Slowest Question</p>
                      <p className="font-semibold text-red-600">{formatTime(slowestTime)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Overtime Questions</p>
                      <p className="font-semibold text-amber-600">{overtimeQuestions}</p>
                      <p className="text-xs text-gray-500">(&gt;2 min)</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Topic Speed Analysis */}
              {topicTimeStats.size > 0 && (
                <Card className="p-4 sm:p-6">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">📊 Topic Speed Analysis</h3>
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700">Topic</th>
                            <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700">Questions</th>
                            <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700">Correct</th>
                            <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700">Time</th>
                            <th className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700">Speed Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(topicTimeStats.values()).map((stats) => {
                            const speedRating = stats.avgTime < 30 ? 'fast' : stats.avgTime < 90 ? 'good' : 'slow';
                            const speedIcon = speedRating === 'fast' ? '⚡' : speedRating === 'good' ? '✓' : '⚠️';
                            const speedColor = speedRating === 'fast' ? 'text-green-600' : speedRating === 'good' ? 'text-blue-600' : 'text-amber-600';
                            
                            return (
                              <tr key={stats.topic.id} className="border-b border-gray-100">
                                <td className="py-2 px-2 sm:px-3 min-h-[48px]">
                                  <span className="font-medium text-xs sm:text-sm text-gray-900">{stats.topic.name}</span>
                                </td>
                                <td className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm text-gray-900">{stats.total}</td>
                                <td className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm text-gray-900">{stats.correct}</td>
                                <td className="text-center py-2 px-2 sm:px-3 text-xs sm:text-sm text-gray-900">{formatTime(stats.avgTime)}</td>
                                <td className="text-center py-2 px-2 sm:px-3">
                                  <span className={`font-semibold text-xs sm:text-sm ${speedColor}`}>
                                    {speedIcon} {speedRating.charAt(0).toUpperCase() + speedRating.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}

              {/* Speed vs Accuracy Matrix - Visual Grid */}
              {speedAccuracyData.length > 0 && (
                <Card>
                  <h3 className="font-bold text-lg text-gray-900 mb-4">⚡ Speed vs Accuracy Matrix</h3>
                  
                  {/* Visual Matrix Grid */}
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Fast & Accurate */}
                      <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-green-900 text-lg">✅ Fast & Accurate</h4>
                          <span className="text-2xl">⚡</span>
                        </div>
                        {fastAccurate.length > 0 ? (
                          <div className="space-y-2">
                            {fastAccurate.map(item => (
                              <div key={item.topic.id} className="p-2 bg-white rounded border border-green-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-green-900">{item.topic.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">{formatTime(item.avgTime)}/q</span>
                                    <span className="font-bold text-green-700">{Math.round(item.accuracy)}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {item.correct}/{item.total} correct
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-green-700 italic">No topics in this category</p>
                        )}
                      </div>

                      {/* Fast & Inaccurate */}
                      <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-amber-900 text-lg">⚠️ Fast & Inaccurate</h4>
                          <span className="text-2xl">⚡</span>
                        </div>
                        {fastInaccurate.length > 0 ? (
                          <div className="space-y-2">
                            {fastInaccurate.map(item => (
                              <div key={item.topic.id} className="p-2 bg-white rounded border border-amber-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-amber-900">{item.topic.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">{formatTime(item.avgTime)}/q</span>
                                    <span className="font-bold text-amber-700">{Math.round(item.accuracy)}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-amber-700 mt-1">
                                  {item.correct}/{item.total} correct • Slow down 10-15s
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-amber-700 italic">No topics in this category</p>
                        )}
                      </div>

                      {/* Slow & Accurate */}
                      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-blue-900 text-lg">🐢 Slow & Accurate</h4>
                          <span className="text-2xl">✓</span>
                        </div>
                        {slowAccurate.length > 0 ? (
                          <div className="space-y-2">
                            {slowAccurate.map(item => (
                              <div key={item.topic.id} className="p-2 bg-white rounded border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-blue-900">{item.topic.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">{formatTime(item.avgTime)}/q</span>
                                    <span className="font-bold text-blue-700">{Math.round(item.accuracy)}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-blue-700 mt-1">
                                  {item.correct}/{item.total} correct • Build speed
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-700 italic">No topics in this category</p>
                        )}
                      </div>

                      {/* Slow & Inaccurate */}
                      <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-red-900 text-lg">❌ Slow & Inaccurate</h4>
                          <span className="text-2xl">⚠️</span>
                        </div>
                        {slowInaccurate.length > 0 ? (
                          <div className="space-y-2">
                            {slowInaccurate.map(item => (
                              <div key={item.topic.id} className="p-2 bg-white rounded border border-red-200">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-red-900">{item.topic.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">{formatTime(item.avgTime)}/q</span>
                                    <span className="font-bold text-red-700">{Math.round(item.accuracy)}%</span>
                                  </div>
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                  {item.correct}/{item.total} correct • Needs focused practice
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-red-700 italic">No topics in this category</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Recommendations */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Recommendations</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {slowInaccurate.length > 0 && (
                        <li>⚠️ Focus on: {slowInaccurate.map(i => i.topic.name).join(', ')} - practice with timer</li>
                      )}
                      {fastAccurate.length > 0 && (
                        <li>✅ Great work on: {fastAccurate.map(i => i.topic.name).join(', ')} - speed is exam-ready ⚡</li>
                      )}
                      {fastInaccurate.length > 0 && (
                        <li>⚠️ {fastInaccurate.map(i => i.topic.name).join(', ')}: You're rushing - slow down by 10-15 seconds</li>
                      )}
                      {timeRemaining > 0 && (
                        <li>⚡ Overall: You had {formatTime(timeRemaining)} remaining - excellent time management!</li>
                      )}
                      {timeRemaining <= 0 && (
                        <li>⚠️ Overall: You ran out of time - practice pacing to complete all questions</li>
                      )}
                    </ul>
                  </div>
                </Card>
              )}
            </>
          );
        })()}

        {/* Strengths & Weaknesses */}
        {answers.length > 0 && (
          <Card>
            <h3 className="font-bold text-lg text-gray-900 mb-4">
              {isTimedMode ? '⚡ Speed & Accuracy Strengths & Focus Areas' : 'Your Strengths & Areas for Improvement'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {isTimedMode ? 'Strengths (Fast & Accurate)' : `Strengths ${isTestMode ? '' : '(First Attempt)'}`}
                </h4>
                {isTimedMode && timedSpeedAccuracyData && timedSpeedAccuracyData.speedAccuracyData.length > 0 ? (
                  // Timed mode: Use speed vs accuracy data
                  <div className="space-y-2">
                    {timedSpeedAccuracyData.fastAccurate
                      .sort((a, b) => b.accuracy - a.accuracy)
                      .slice(0, 5)
                      .map((item) => {
                        const formatTime = (seconds: number) => {
                          const mins = Math.floor(seconds / 60);
                          const secs = Math.floor(seconds % 60);
                          if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
                          return `${secs}s`;
                        };
                        return (
                          <div key={item.topic.id} className="p-2 bg-white rounded border border-green-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">{item.topic.name}</span>
                              <span className="text-sm font-bold text-green-600">{Math.round(item.accuracy)}%</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              ⚡ {formatTime(item.avgTime)}/q • {item.correct}/{item.total} correct
                            </div>
                          </div>
                        );
                      })}
                    {timedSpeedAccuracyData.fastAccurate.length === 0 && (
                      <p className="text-sm text-gray-600 italic">No topics achieved fast & accurate performance yet</p>
                    )}
                  </div>
                ) : topics.length > 0 && topicAnalytics.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(topicAnalytics.entries())
                      .filter(([_, analytics]) => analytics.total > 0)
                      .map(([topicId, analytics]) => {
                        const topic = topics.find(t => t.id === topicId);
                        if (!topic) return null;
                        // For test mode, use final accuracy; for practice, use first attempt
                        const accuracy = isTestMode
                          ? Math.round((analytics.correct / analytics.total) * 100)
                          : Math.round((analytics.firstAttemptCorrect / analytics.total) * 100);
                        return { topic, accuracy, analytics };
                      })
                      .filter(Boolean)
                      .sort((a, b) => b!.accuracy - a!.accuracy)
                      .slice(0, 3)
                      .map((item) => (
                        <div key={item!.topic.id} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm font-medium text-gray-900">{item!.topic.name}</span>
                          <span className="text-sm font-bold text-green-600">{item!.accuracy}%</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {finalAccuracy >= 70 
                      ? `Great job! You scored ${finalAccuracy}%.`
                      : 'Keep practicing to build your strengths!'}
                  </p>
                )}
              </div>

              {/* Areas for Improvement */}
              <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {isTimedMode ? 'Focus Areas (Needs Speed/Accuracy Work)' : `Focus Areas ${isTestMode ? '' : '(First Attempt)'}`}
                </h4>
                {isTimedMode && timedSpeedAccuracyData && timedSpeedAccuracyData.speedAccuracyData.length > 0 ? (
                  // Timed mode: Show slow/inaccurate topics
                  <div className="space-y-2">
                    {[...timedSpeedAccuracyData.slowInaccurate, ...timedSpeedAccuracyData.fastInaccurate, ...timedSpeedAccuracyData.slowAccurate]
                      .sort((a, b) => a.accuracy - b.accuracy)
                      .slice(0, 5)
                      .map((item) => {
                        const formatTime = (seconds: number) => {
                          const mins = Math.floor(seconds / 60);
                          const secs = Math.floor(seconds % 60);
                          if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
                          return `${secs}s`;
                        };
                        return (
                          <div key={item.topic.id} className="p-2 bg-white rounded border border-amber-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">{item.topic.name}</span>
                              <span className="text-sm font-bold text-amber-600">{Math.round(item.accuracy)}%</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {item.speed === 'slow' ? '🐢' : '⚡'} {formatTime(item.avgTime)}/q • {item.correct}/{item.total} correct
                            </div>
                            <div className="text-xs text-amber-700 mt-1">
                              {item.speed === 'slow' && item.accuracy < 70 && '⚠️ Needs speed & accuracy practice'}
                              {item.speed === 'fast' && item.accuracy < 70 && '⚠️ Slow down for better accuracy'}
                              {item.speed === 'slow' && item.accuracy >= 70 && '⚠️ Build speed while maintaining accuracy'}
                            </div>
                          </div>
                        );
                      })}
                    {timedSpeedAccuracyData.slowInaccurate.length === 0 && timedSpeedAccuracyData.fastInaccurate.length === 0 && timedSpeedAccuracyData.slowAccurate.length === 0 && (
                      <p className="text-sm text-gray-600 italic">All topics performed well!</p>
                    )}
                  </div>
                ) : topics.length > 0 && topicAnalytics.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(topicAnalytics.entries())
                      .filter(([_, analytics]) => analytics.total > 0)
                      .map(([topicId, analytics]) => {
                        const topic = topics.find(t => t.id === topicId);
                        if (!topic) return null;
                        // For test mode, use final accuracy; for practice, use first attempt
                        const accuracy = isTestMode
                          ? Math.round((analytics.correct / analytics.total) * 100)
                          : Math.round((analytics.firstAttemptCorrect / analytics.total) * 100);
                        return { topic, accuracy, analytics };
                      })
                      .filter(Boolean)
                      .sort((a, b) => a!.accuracy - b!.accuracy)
                      .slice(0, 3)
                      .map((item) => (
                        <div key={item!.topic.id} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm font-medium text-gray-900">{item!.topic.name}</span>
                          <span className="text-sm font-bold text-amber-600">{item!.accuracy}%</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {finalAccuracy < 70 
                      ? `Your accuracy was ${finalAccuracy}%. Keep practicing!`
                      : 'You\'re doing well! Keep up the good work.'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Topic Breakdown - Enhanced for Test Mode and Timed Mode */}
        {topicBreakdownComponent}

        {/* Topic Breakdown (for practice/timed modes - existing) */}
        {session.mode !== 'test' && topics.length > 1 && topicAnalytics.size > 0 && (
          <Card>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Topic Performance Breakdown</h3>
            <div className="space-y-3">
              {topics.map(topic => {
                const analytics = topicAnalytics.get(topic.id);
                if (!analytics || analytics.total === 0) return null;

                const finalAccuracy = Math.round((analytics.correct / analytics.total) * 100);
                const firstAttemptAccuracy = Math.round((analytics.firstAttemptCorrect / analytics.total) * 100);
                const isWeakArea = firstAttemptAccuracy < 70;
                const improvement = finalAccuracy - firstAttemptAccuracy;

                return (
                  <div
                    key={topic.id}
                    className={`p-4 rounded-lg border-2 ${
                      isWeakArea
                        ? 'bg-red-50 border-red-200'
                        : firstAttemptAccuracy >= 80
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{topic.name}</h4>
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
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-xs text-gray-600">First Attempt</p>
                            <p className="text-lg font-bold text-indigo-600">{firstAttemptAccuracy}%</p>
                            <p className="text-xs text-gray-500">{analytics.firstAttemptCorrect}/{analytics.total}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Final Score</p>
                            <p className="text-lg font-bold text-green-600">{finalAccuracy}%</p>
                            <p className="text-xs text-gray-500">{analytics.correct}/{analytics.total}</p>
                          </div>
                        </div>
                        {improvement > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            +{improvement}% improvement after hints/solutions
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">First Attempt Accuracy</span>
                        <span className="font-semibold">{firstAttemptAccuracy}%</span>
                      </div>
                      <ProgressBar value={firstAttemptAccuracy} color={isWeakArea ? 'error' : 'success'} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span>{analytics.hintsUsed} hints</span>
                      <span>{analytics.solutionsViewed} solutions</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Performance Analysis */}
        <Card>
          <h3 className="font-bold text-lg text-gray-900 mb-4">Performance Analysis</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Correct Answers</span>
                <span className="text-sm font-semibold text-green-600">
                  {correctCount} / {isTimedMode ? totalAnswered : session.total_questions}
                  {isTimedMode && totalAnswered < session.total_questions && (
                    <span className="text-xs text-gray-500 ml-1">({session.total_questions - totalAnswered} unanswered)</span>
                  )}
                </span>
              </div>
              <ProgressBar value={(correctCount / (isTimedMode ? totalAnswered : session.total_questions)) * 100} color="success" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Incorrect Answers</span>
                <span className="text-sm font-semibold text-red-600">
                  {incorrectCount} / {isTimedMode ? totalAnswered : session.total_questions}
                  {isTimedMode && totalAnswered < session.total_questions && (
                    <span className="text-xs text-gray-500 ml-1">({session.total_questions - totalAnswered} unanswered)</span>
                  )}
                </span>
              </div>
              <ProgressBar value={(incorrectCount / (isTimedMode ? totalAnswered : session.total_questions)) * 100} color="error" />
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
                {topics.length > 1 && Array.from(topicAnalytics.values()).some(a => 
                  a.total > 0 && (a.correct / a.total) < 0.7
                ) && (
                  <li>🎯 Focus more practice on topics where you scored below 70%.</li>
                )}
                {firstAttemptAccuracy < finalAccuracy && (
                  <li>💡 Your accuracy improved after using hints and solutions. Keep practicing to improve first-attempt accuracy!</li>
                )}
                <li>🔥 Come back tomorrow to maintain your streak!</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Question Review Button */}
        {questions.length > 0 && (
          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
            <div className="text-center py-4 sm:py-6">
              <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-2 sm:mb-3">Review Your Answers</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Go through all questions with solutions and explanations
              </p>
              <Link href={`/results/${sessionId}/review`}>
                <Button
                  variant="primary"
                  size="full"
                  className="w-full sm:w-auto min-h-12 text-sm sm:text-base font-semibold py-3 sm:py-4 px-6 sm:px-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg"
                >
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Review Questions
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Quick Retry Section */}
        {topic && (
          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1">Ready for More? 🚀</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Practice the same topic again or try a different learning mode
              </p>
            </div>

            {/* Primary Retry Button - Same Mode */}
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => handleRetry(session!.mode, true)}
                disabled={creatingSession}
                className={`
                  w-full flex items-center justify-center gap-2
                  ${getModeConfig(session!.mode).color}
                  ${getModeConfig(session!.mode).hoverColor}
                  text-white font-semibold py-3 sm:py-4 text-sm sm:text-base md:text-lg
                  rounded-xl
                  transform transition-all hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  shadow-lg min-h-12
                `}
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                {creatingSession ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <span className="truncate">Practice This Topic Again ({getModeConfig(session!.mode).name})</span>
                )}
              </button>

              {/* Alternative Mode Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {getAlternativeModes().map(mode => {
                  const config = getModeConfig(mode);
                  // Determine hover styles based on mode
                  const hoverStyles = mode === 'practice' 
                    ? 'hover:bg-blue-600 hover:text-white hover:border-blue-600'
                    : mode === 'test'
                    ? 'hover:bg-purple-600 hover:text-white hover:border-purple-600'
                    : 'hover:bg-orange-600 hover:text-white hover:border-orange-600';
                  
                  return (
                    <Button
                      key={mode}
                      variant="outline"
                      size="full"
                      leftIcon={config.icon}
                      onClick={() => handleRetry(mode, false)}
                      disabled={creatingSession}
                      className={`
                        border-2 font-semibold text-gray-900 min-h-12
                        text-xs sm:text-sm
                        ${hoverStyles}
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

              <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-2">
                Each session will have {session!.total_questions} questions
                {session!.mode === 'timed' && session!.time_limit_seconds &&
                  ` with ${session!.time_limit_seconds}s per question`}
              </p>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <Button
            variant="primary"
            size="full"
            leftIcon={<Home className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={() => router.push('/home')}
            className="min-h-12 text-sm sm:text-base"
          >
            Back to Home
          </Button>

          <Link href={`/topics/${subject?.id}`} className="w-full">
            <Button
              variant="outline"
              size="full"
              leftIcon={<RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />}
              className="min-h-12 text-sm sm:text-base w-full"
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
              <p className="text-gray-600 mb-1">Subject</p>
              <p className="font-semibold text-gray-900">{subject?.name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Topic{topics.length > 1 ? 's' : ''}</p>
              {topics.length === 0 ? (
                <p className="font-semibold text-gray-900">{topic?.name || '-'}</p>
              ) : topics.length === 1 ? (
                <p className="font-semibold text-gray-900">{topics[0].name}</p>
              ) : topics.length <= 3 ? (
                <div className="flex flex-wrap gap-1">
                  {topics.map((t, idx) => (
                    <span key={t.id} className="font-semibold text-gray-900">
                      {t.name}{idx < topics.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    {topics.length} topics covered
                  </p>
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                      View all topics
                    </summary>
                    <div className="mt-2 pl-2 border-l-2 border-indigo-200 space-y-1">
                      {topics.map((t) => (
                        <p key={t.id} className="text-xs text-gray-700">
                          • {t.name}
                        </p>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-600 mb-1">Mode</p>
              <p className="font-semibold text-gray-900 capitalize">{session.mode}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Completed</p>
              <p className="font-semibold text-gray-900">
                {session.completed_at 
                  ? new Date(session.completed_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
