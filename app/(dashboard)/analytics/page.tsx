'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/common/BottomNav';
import { MagicCard, StatCard, BentoGrid, MagicBadge } from '@/components/magic';
import { useAuth } from '@/lib/auth-context';
import { getAnalytics, getSubjects, getTopics } from '@/lib/api';
import type { AnalyticsData, Subject, Topic } from '@/types/database';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  Calendar,
  BarChart3,
  Flame,
  AlertCircle,
  BookOpen,
  Check,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());
  const [selectedPeriod, setSelectedPeriod] = useState('7D');

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId]);

  async function loadAnalytics() {
    if (!userId) return;

    try {
      setLoading(true);
      
      const [analyticsData, allSubjects] = await Promise.all([
        getAnalytics(userId),
        getSubjects(),
      ]);

      setAnalytics(analyticsData);
      setSubjects(allSubjects);

      // Load topics for strengths and weaknesses
      const topicIds = [...analyticsData.strengths, ...analyticsData.weaknesses];
      const topicsMap = new Map<string, Topic>();
      
      for (const subject of allSubjects) {
        const subjectTopics = await getTopics(subject.id);
        subjectTopics.forEach(topic => {
          if (topicIds.includes(topic.id)) {
            topicsMap.set(topic.id, topic);
          }
        });
      }
      
      setTopics(topicsMap);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

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
          <p className="text-slate-400">Start learning to see your analytics</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const stats = analytics.totalStats;
  const maxActivity = Math.max(...analytics.weeklyActivity.map(d => d.questionsAnswered), 1);

  // Calculate chart data based on selected period
  const getChartData = () => {
    return analytics.weeklyActivity.map((day) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const accuracy = day.questionsAnswered > 0
        ? Math.round((day.questionsAnswered / maxActivity) * 100)
        : 0;
      
      return {
        label: dayName,
        value: accuracy,
        count: day.questionsAnswered,
      };
    });
  };

  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-3xl font-black text-white mb-1">
                Your Analytics 📊
              </h1>
              <p className="text-slate-400">Track your learning journey</p>
            </div>
            <div className="flex gap-2">
              {['7D', '30D', '90D', 'All'].map((period) => (
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
        {/* Key Metrics Bento Grid */}
        <BentoGrid columns={2} gap="md">
          <StatCard
            title="Total Questions"
            value={stats.questionsAnswered}
            icon={<Target className="w-6 h-6" />}
            trend="up"
            trendValue={`+${Math.floor(stats.questionsAnswered * 0.15)} this week`}
          />
          
          <StatCard
            title="Accuracy Rate"
            value={`${Math.round(stats.accuracy)}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            trend={stats.accuracy >= 70 ? 'up' : 'down'}
            trendValue={`${stats.accuracy >= 70 ? '+' : ''}${Math.round(stats.accuracy - 65)}% vs last week`}
          />
          
          <StatCard
            title="Study Time"
            value={`${Math.floor(stats.studyTimeMinutes / 60)}h`}
            icon={<Clock className="w-6 h-6" />}
            trend="up"
            trendValue={`+${Math.floor(stats.studyTimeMinutes / 60 * 0.2)}h this week`}
          />
          
          <StatCard
            title="Current Streak"
            value={`${stats.currentStreak} days`}
            icon={<Flame className="w-6 h-6" />}
            trend={stats.currentStreak > 0 ? 'up' : undefined}
            trendValue={stats.currentStreak > 0 ? 'Keep it going!' : 'Start today!'}
          />
        </BentoGrid>

        {/* Performance Chart Card */}
        <MagicCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Performance Over Time</h2>
          </div>
          
          <div className="space-y-3">
            {chartData.map((day, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{day.label}</span>
                  <span className="text-slate-200 font-medium">{day.count} questions</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${day.value}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </MagicCard>

        {/* Subject Performance */}
        {analytics.subjectPerformance.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Subject Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.subjectPerformance.map((perf, index) => {
                const subject = subjects.find(s => s.id === perf.subjectId);
                if (!subject) return null;

                return (
                  <motion.div
                    key={perf.subjectId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MagicCard hover className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
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
                          className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${perf.accuracy}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>
                    </MagicCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <MagicCard className="p-6 space-y-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Strengths</h2>
            </div>
            {analytics.strengths.length > 0 ? (
              <div className="space-y-3">
                {analytics.strengths.slice(0, 3).map((topicId, index) => {
                  const topic = topics.get(topicId);
                  if (!topic) return null;

                  return (
                    <motion.div
                      key={topicId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">{topic.name}</span>
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

          {/* Weaknesses */}
          <MagicCard className="p-6 space-y-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Areas to Improve</h2>
            </div>
            {analytics.weaknesses.length > 0 ? (
              <div className="space-y-3">
                {analytics.weaknesses.slice(0, 3).map((topicId, index) => {
                  const topic = topics.get(topicId);
                  if (!topic) return null;

                  return (
                    <motion.div
                      key={topicId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/50">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">{topic.name}</span>
                      </div>
                      <MagicBadge variant="warning">Practice</MagicBadge>
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
        </div>

        {/* Recent Activity Timeline */}
        <MagicCard className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          <div className="space-y-4">
            {analytics.weeklyActivity.slice(0, 5).map((session, index) => {
              const date = new Date(session.date);
              const timeAgo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const accuracy = session.questionsAnswered > 0
                ? Math.round((session.questionsAnswered / maxActivity) * 100)
                : 0;

              return (
                <motion.div
                  key={session.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-white">Practice Session</h4>
                        <p className="text-sm text-slate-400">Daily practice</p>
                      </div>
                      <MagicBadge variant={accuracy >= 70 ? 'success' : 'warning'}>
                        {accuracy}%
                      </MagicBadge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>{session.questionsAnswered} questions</span>
                      <span>•</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </MagicCard>

        {/* Motivational Card */}
        <MagicCard className="relative overflow-hidden p-8 bg-gradient-to-br from-violet-500/20 to-pink-500/20 border-violet-500/30">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-violet-400" />
            <h3 className="text-2xl font-bold text-white mb-2">Keep Up the Great Work!</h3>
            <p className="text-slate-300">
              You're on track to achieving your learning goals. Stay consistent and you'll see amazing results!
            </p>
          </div>
        </MagicCard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
