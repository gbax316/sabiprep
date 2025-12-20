'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/common/BottomNav';
import { MagicCard, MagicBadge, MagicButton, ProgressRing } from '@/components/magic';
import { useAuth } from '@/lib/auth-context';
import { getAnalytics, getSubjects, getTopicsByIds, getUserSessions, getUserGoals, getUserProgress } from '@/lib/api';
import type { AnalyticsData, Subject, Topic, LearningSession, UserGoal, UserProgress } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  BarChart3,
  Flame,
  AlertCircle,
  BookOpen,
  Check,
  Play,
  Lightbulb,
  Calendar,
  Zap,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

type Period = '7D' | '30D' | '90D' | 'All';

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('7D');
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loadingHeavy, setLoadingHeavy] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId, selectedPeriod]);

  async function loadAnalytics() {
    if (!userId) return;

    try {
      setLoading(true);
      setLoadingHeavy(true);
      
      // Load core analytics data (fast)
      const [analyticsData, allSubjects] = await Promise.all([
        getAnalytics(userId, selectedPeriod),
        getSubjects(),
      ]);

      setAnalytics(analyticsData);
      setSubjects(allSubjects);

      // Batch load only needed topics (FAST - single query)
      const topicIds = [...analyticsData.strengths, ...analyticsData.weaknesses];
      if (topicIds.length > 0) {
        const topicsData = await getTopicsByIds(topicIds);
        const topicsMap = new Map<string, Topic>();
        topicsData.forEach(topic => {
          topicsMap.set(topic.id, topic);
        });
        setTopics(topicsMap);
      }

      setLoading(false);

      // Load heavy data in background (lazy loading)
      const [sessionsData, goalsData, progressData] = await Promise.all([
        getUserSessions(userId, selectedPeriod === 'All' ? 1000 : 500),
        getUserGoals(userId),
        getUserProgress(userId),
      ]);

      // Filter sessions by period (client-side filtering for now)
      const now = new Date();
      let periodStart: Date;
      switch (selectedPeriod) {
        case '7D':
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30D':
          periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90D':
          periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'All':
          periodStart = new Date(0);
          break;
      }
      
      const filteredSessions = sessionsData.filter(s => {
        if (!s.started_at) return false;
        const sessionDate = new Date(s.started_at);
        return sessionDate >= periodStart;
      });

      setSessions(filteredSessions);
      setGoals(goalsData);
      setProgress(progressData);
      setLoadingHeavy(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // ========== INSIGHTS GENERATION ==========

  const generateInsights = () => {
    if (!analytics || !sessions.length) return [];

    const insights: Array<{ type: 'improvement' | 'achievement' | 'warning' | 'tip'; message: string; icon: React.ReactNode }> = [];
    const stats = analytics.totalStats;

    // Accuracy improvement
    if (sessions.length >= 2) {
      const recentSessions = sessions.slice(0, 7).filter(s => s.status === 'completed');
      if (recentSessions.length >= 2) {
        const recentAccuracy = recentSessions.reduce((sum, s) => {
          const acc = s.questions_answered > 0 ? (s.correct_answers / s.questions_answered) * 100 : 0;
          return sum + acc;
        }, 0) / recentSessions.length;
        const improvement = recentAccuracy - stats.accuracy;
        if (improvement > 5) {
          insights.push({
            type: 'improvement',
            message: `Your accuracy improved ${Math.round(improvement)}% this week!`,
            icon: <TrendingUp className="w-5 h-5" />,
          });
        }
      }
    }

    // Streak achievement
    if (stats.currentStreak >= 7) {
      insights.push({
        type: 'achievement',
        message: `${stats.currentStreak}-day streak - your longest yet!`,
        icon: <Flame className="w-5 h-5" />,
      });
    }

    // Strongest subject
    if (analytics.subjectPerformance.length > 0) {
      const strongest = analytics.subjectPerformance.sort((a, b) => b.accuracy - a.accuracy)[0];
      const subject = subjects.find(s => s.id === strongest.subjectId);
      if (subject && strongest.accuracy >= 80) {
        insights.push({
          type: 'achievement',
          message: `You're strongest in ${subject.name} (${Math.round(strongest.accuracy)}% accuracy)`,
          icon: <Award className="w-5 h-5" />,
        });
      }
    }

    // Weak area warning
    if (analytics.weaknesses.length > 0) {
      const weakTopicIds = analytics.weaknesses.slice(0, 2);
      const weakTopics = weakTopicIds.map(id => topics.get(id)).filter(Boolean) as Topic[];
      if (weakTopics.length > 0) {
        const weakProgress = progress.filter(p => weakTopicIds.includes(p.topic_id));
        if (weakProgress.length > 0) {
          const avgAccuracy = weakProgress.reduce((sum, p) => sum + (p.accuracy_percentage || 0), 0) / weakProgress.length;
          if (avgAccuracy < 60) {
            insights.push({
              type: 'warning',
              message: `${weakTopics[0].name} needs attention (${Math.round(avgAccuracy)}% accuracy)`,
              icon: <AlertCircle className="w-5 h-5" />,
            });
          }
        }
      }
    }

    // Study consistency tip
    const daysWithActivity = new Set(sessions.map(s => {
      if (!s.started_at) return null;
      return new Date(s.started_at).toDateString();
    })).size;
    if (daysWithActivity < 3 && sessions.length > 0) {
      insights.push({
        type: 'tip',
        message: `Study more consistently - you've been active ${daysWithActivity} day${daysWithActivity !== 1 ? 's' : ''} this period`,
        icon: <Lightbulb className="w-5 h-5" />,
      });
    }

    return insights.slice(0, 4); // Max 4 insights
  };

  // ========== STUDY PATTERNS ANALYSIS ==========

  const analyzeStudyPatterns = () => {
    if (!sessions.length) return null;

    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) return null;

    // Most active days
    const dayCounts: Record<string, number> = {};
    completedSessions.forEach(s => {
      if (s.started_at) {
        const day = new Date(s.started_at).toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });
    const mostActiveDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => day);

    // Preferred mode
    const modeCounts: Record<string, number> = {};
    completedSessions.forEach(s => {
      modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
    });
    const preferredMode = Object.entries(modeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'practice';

    // Average session stats
    const totalTime = completedSessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
    const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
    const avgTime = Math.floor(totalTime / completedSessions.length / 60); // minutes
    const avgQuestions = Math.round(totalQuestions / completedSessions.length);

    return {
      mostActiveDays,
      preferredMode,
      avgTime,
      avgQuestions,
      totalSessions: completedSessions.length,
    };
  };

  // ========== PERIOD COMPARISON ==========

  const getPeriodComparison = () => {
    if (!analytics || selectedPeriod === 'All') return null;

    // This would require fetching previous period data
    // For now, return null - can be enhanced later
    return null;
  };

  // ========== DATA CALCULATIONS ==========

  const insights = useMemo(() => generateInsights(), [analytics, sessions, subjects, topics, progress]);
  const patterns = useMemo(() => analyzeStudyPatterns(), [sessions]);
  const stats = analytics?.totalStats;
  const maxActivity = analytics ? Math.max(...analytics.weeklyActivity.map(d => d.questionsAnswered), 1) : 1;

  // Chart data
  const chartData = analytics ? analytics.weeklyActivity.map((day) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const percentage = day.questionsAnswered > 0
      ? Math.round((day.questionsAnswered / maxActivity) * 100)
      : 0;
    
    return {
      label: dayName,
      value: percentage,
      count: day.questionsAnswered,
      date: day.date,
    };
  }) : [];

  // Subject performance with trends (simplified - would need previous period data for real trends)
  const subjectPerformance = analytics?.subjectPerformance || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 pb-24">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-white mb-2">No Data Yet</p>
          <p className="text-slate-400 mb-4">Start learning to see your analytics</p>
          <Link href="/subjects">
            <MagicButton variant="primary">Start Learning</MagicButton>
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>
              <div>
                <h1 className="font-display text-3xl font-black text-white mb-1">
                  Learning Insights
                </h1>
                <p className="text-slate-400">Understand your progress patterns</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['7D', '30D', '90D', 'All'] as Period[]).map((period) => (
                <button
                  key={period}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ========== SECTION 1: LEARNING INSIGHTS ========== */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MagicCard glow className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Key Insights</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((insight, index) => {
                  const colors = {
                    improvement: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
                    achievement: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
                    warning: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
                    tip: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
                  };

                  const iconColors = {
                    improvement: 'text-emerald-400',
                    achievement: 'text-violet-400',
                    warning: 'text-amber-400',
                    tip: 'text-blue-400',
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl bg-gradient-to-br ${colors[insight.type]} border hover:scale-[1.02] transition-transform`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 ${iconColors[insight.type]}`}>
                          {insight.icon}
                        </div>
                        <p className="text-sm text-white font-medium leading-relaxed">{insight.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* ========== SECTION 2: PERFORMANCE TRENDS ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <MagicCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Performance Over Time</h2>
              <span className="text-sm text-slate-400">{selectedPeriod} period</span>
            </div>
            
            <div className="space-y-3">
              {chartData.length > 0 ? (
                chartData.map((day, index) => (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{day.label}</span>
                      <span className="text-slate-200 font-medium">{day.count} questions</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${day.value}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">No activity in this period</p>
              )}
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== SECTION 3: SUBJECT DEEP DIVE ========== */}
        {subjectPerformance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Subject Performance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectPerformance.map((perf, index) => {
                const subject = subjects.find(s => s.id === perf.subjectId);
                if (!subject) return null;

                const isWeak = perf.accuracy < 70;

                return (
                  <motion.div
                    key={perf.subjectId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MagicCard hover className={`p-5 space-y-3 ${isWeak ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                            <span className="text-2xl">{subject.icon || '📚'}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{subject.name}</h3>
                            <p className="text-xs text-slate-400">
                              {perf.questionsAttempted} questions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-cyan-400">
                            {Math.round(perf.accuracy)}%
                          </div>
                          <p className="text-xs text-slate-400">accuracy</p>
                        </div>
                      </div>
                      
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${isWeak ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-cyan-400 to-violet-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${perf.accuracy}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>

                      {isWeak && (
                        <Link href={`/subjects`} onClick={(e) => {
                          e.preventDefault();
                          router.push('/subjects');
                        }}>
                          <MagicButton variant="primary" size="sm" className="w-full mt-2">
                            <Play className="w-4 h-4 mr-2" />
                            Practice {subject.name}
                          </MagicButton>
                        </Link>
                      )}
                    </MagicCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ========== SECTION 4: TOPIC-LEVEL ANALYSIS ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MagicCard className="p-6 space-y-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Strengths (Top 5)</h2>
              </div>
              {analytics.strengths.length > 0 ? (
                <div className="space-y-3">
                  {analytics.strengths.slice(0, 5).map((topicId, index) => {
                    const topic = topics.get(topicId);
                    if (!topic) return null;

                    const topicProgress = progress.find(p => p.topic_id === topicId);
                    const accuracy = topicProgress ? Math.round(topicProgress.accuracy_percentage || 0) : 0;

                    return (
                      <motion.div
                        key={topicId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/50">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-white block truncate">{topic.name}</span>
                            {topicProgress && (
                              <span className="text-xs text-slate-400">
                                {topicProgress.questions_attempted} questions • {accuracy}% accuracy
                              </span>
                            )}
                          </div>
                        </div>
                        <MagicBadge variant="success">Excellent</MagicBadge>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400">
                  Keep practicing to identify your strengths!
                </p>
              )}
            </MagicCard>
          </motion.div>

          {/* Weaknesses */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <MagicCard className="p-6 space-y-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-semibold text-white">Areas to Improve (Top 5)</h2>
              </div>
              {analytics.weaknesses.length > 0 ? (
                <div className="space-y-3">
                  {analytics.weaknesses.slice(0, 5).map((topicId, index) => {
                    const topic = topics.get(topicId);
                    if (!topic) return null;

                    const topicProgress = progress.find(p => p.topic_id === topicId);
                    const accuracy = topicProgress ? Math.round(topicProgress.accuracy_percentage || 0) : 0;
                    // Find subject for this topic
                    const subject = topicProgress ? subjects.find(s => s.id === topicProgress.subject_id) : null;

                    return (
                      <motion.div
                        key={topicId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/50">
                            <AlertCircle className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-white block truncate">{topic.name}</span>
                            {topicProgress && (
                              <span className="text-xs text-slate-400">
                                {topicProgress.questions_attempted} questions • {accuracy}% accuracy
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/subjects" onClick={(e) => {
                          e.preventDefault();
                          router.push('/subjects');
                        }}>
                          <MagicButton variant="primary" size="sm">
                            Practice
                          </MagicButton>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400">
                  No weak areas identified yet!
                </p>
              )}
            </MagicCard>
          </motion.div>
        </div>

        {/* ========== SECTION 5: STUDY PATTERNS ========== */}
        {loadingHeavy ? (
          <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-slate-400">Analyzing study patterns...</p>
            </div>
          </MagicCard>
        ) : patterns ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <MagicCard className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Your Study Patterns</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <p className="text-xs text-slate-400 mb-1">Most Active Days</p>
                  <p className="text-sm font-semibold text-white">
                    {patterns.mostActiveDays.length > 0 ? patterns.mostActiveDays.join(', ') : 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <p className="text-xs text-slate-400 mb-1">Preferred Mode</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {patterns.preferredMode}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <p className="text-xs text-slate-400 mb-1">Average Session</p>
                  <p className="text-sm font-semibold text-white">
                    {patterns.avgTime}m • {patterns.avgQuestions} Q
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <p className="text-xs text-slate-400 mb-1">Total Sessions</p>
                  <p className="text-sm font-semibold text-white">
                    {patterns.totalSessions}
                  </p>
                </div>
              </div>
            </MagicCard>
          </motion.div>
        ) : null}

        {/* ========== SECTION 6: GOALS & PROGRESS ========== */}
        {loadingHeavy ? (
          <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="ml-3 text-slate-400">Loading goals...</p>
            </div>
          </MagicCard>
        ) : goals.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <MagicCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Goals Progress</h2>
                <Link href="/profile">
                  <MagicButton variant="ghost" size="sm">
                    Manage Goals →
                  </MagicButton>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {goals.map((goal, index) => {
                  const progressPercent = Math.min((goal.current_value / goal.target_value) * 100, 100);
                  const goalLabels: Record<string, string> = {
                    daily_questions: 'Daily Questions',
                    weekly_questions: 'Weekly Questions',
                    weekly_study_time: 'Weekly Study Time',
                    accuracy_target: 'Accuracy Target',
                    streak_target: 'Streak Target',
                  };

                  const formatValue = (value: number, type: string) => {
                    if (type === 'weekly_study_time') {
                      return `${Math.floor(value / 60)}h ${value % 60}m`;
                    }
                    return value.toString();
                  };

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white">
                          {goalLabels[goal.goal_type] || goal.goal_type}
                        </p>
                        <ProgressRing progress={progressPercent} size="sm" showLabel={false} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-white font-semibold">
                            {formatValue(goal.current_value, goal.goal_type)} / {formatValue(goal.target_value, goal.goal_type)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
                          />
                        </div>
                        {goal.achieved && (
                          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Goal achieved!
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </MagicCard>
          </motion.div>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
