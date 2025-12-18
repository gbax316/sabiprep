'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { StatCard } from '@/components/magic/StatCard';
import { ProgressRing } from '@/components/magic/ProgressRing';
import { BentoGrid } from '@/components/magic/BentoGrid';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserStats, getUserProgress, updateUserStreak, getUserProfile, getUserSessions, getSubject, getTopic, getUserGoals, setUserGoal } from '@/lib/api';
import type { Subject, UserStats, UserProgress, LearningSession, UserGoal } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flame,
  Target,
  Clock,
  TrendingUp,
  ChevronRight,
  Zap,
  BookOpen,
  Timer,
  Sparkles,
  FileText,
  CheckCircle,
} from 'lucide-react';

const quickActions = [
  {
    icon: Zap,
    label: 'Quick Practice',
    description: 'Random questions',
    href: '/quick-practice',
  },
  {
    icon: Timer,
    label: '5-min Sprint',
    description: 'Quick challenge',
    href: '/timed',
  },
  {
    icon: Sparkles,
    label: 'Daily Challenge',
    description: 'Earn bonus XP',
    href: '/daily-challenge',
  },
];

const learningModes = [
  {
    id: 'practice',
    icon: BookOpen,
    title: 'Practice Mode',
    description: 'Learn at your own pace with instant feedback',
    href: '/practice',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 'test',
    icon: FileText,
    title: 'Test Mode',
    description: 'Simulate exam conditions',
    href: '/test',
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    id: 'timed',
    icon: Clock,
    title: 'Timed Mode',
    description: 'Challenge yourself with time limits',
    href: '/timed',
    gradient: 'from-orange-500 to-orange-600',
  },
];

/**
 * Home Page - Student Dashboard
 * 
 * Data Sources:
 * - Stats (streak, questions answered, accuracy): Pulled from user table (aggregated lifetime stats)
 * - Weekly Activity: Calculated from actual completed sessions in the last 7 days
 * - Study Time: Calculated from time_spent_seconds in completed sessions this week
 * - Study Time Goal: Default 10 hours/week (600 minutes), can be customized per user/grade
 * 
 * All stats reflect actual student activity across practice, test, and timed modes.
 */
export default function HomePage() {
  const { userId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !userId) {
      router.push('/login');
    }
  }, [userId, authLoading, router]);

  useEffect(() => {
    if (userId) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadDashboard() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Update streak on page load
      await updateUserStreak(userId);

      // Fetch data in parallel
      const [, userStats, allSubjects, userProgress, sessions, goals] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId),
        getSubjects(),
        getUserProgress(userId),
        getUserSessions(userId, 50), // Get more sessions to calculate weekly stats
        getUserGoals(userId),
      ]);

      setStats(userStats);
      setSubjects(allSubjects);
      setProgress(userProgress);
      setRecentSessions(sessions);
      setUserGoals(goals);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Get personalized message based on progress
  const getPersonalizedMessage = () => {
    const currentStreak = stats?.currentStreak || 0;
    const questionsAnswered = stats?.questionsAnswered || 0;
    
    if (currentStreak >= 7) {
      return `🔥 Amazing ${currentStreak}-day streak! Keep the momentum going!`;
    } else if (questionsAnswered > 100) {
      return `You've answered ${questionsAnswered} questions. You're making great progress!`;
    } else if (questionsAnswered > 0) {
      return 'Ready to continue your learning journey?';
    } else {
      return 'Start preparing the smart way today';
    }
  };

  // Get current learning progress for spotlight
  const getCurrentProgress = () => {
    if (progress.length === 0) return null;
    
    // Sort by last practiced date
    const sortedProgress = [...progress].sort((a, b) => 
      new Date(b.last_practiced_at || 0).getTime() - new Date(a.last_practiced_at || 0).getTime()
    );
    
    return sortedProgress[0];
  };

  const currentProgress = getCurrentProgress();
  const currentSubject = currentProgress 
    ? subjects.find(s => s.id === currentProgress.subject_id) 
    : null;

  // Calculate weekly study time from actual completed sessions
  const calculateWeeklyStudyTime = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklySessions = recentSessions.filter(session => {
      if (session.status !== 'completed') return false;
      const completedAt = session.completed_at ? new Date(session.completed_at) : null;
      if (!completedAt) return false;
      return completedAt >= weekAgo;
    });

    // Sum up time_spent_seconds from completed sessions this week
    const totalSeconds = weeklySessions.reduce((sum, session) => {
      return sum + (session.time_spent_seconds || 0);
    }, 0);

    return Math.floor(totalSeconds / 60); // Convert to minutes
  };

  // Get study time goal from user goals or use default
  const getStudyTimeGoal = () => {
    const studyTimeGoal = userGoals.find(g => g.goal_type === 'weekly_study_time');
    if (studyTimeGoal) {
      return studyTimeGoal.target_value;
    }
    // Default: 10 hours per week (600 minutes) or based on grade
    const user = subjects.length > 0 ? null : null; // Could get user profile here
    return 600; // 10 hours = 600 minutes
  };

  const weeklyStudyTimeMinutes = calculateWeeklyStudyTime();
  const studyTimeGoalMinutes = getStudyTimeGoal();
  const studyTimeGoal = userGoals.find(g => g.goal_type === 'weekly_study_time');
  const weeklyQuestionsGoal = userGoals.find(g => g.goal_type === 'weekly_questions');
  const dailyQuestionsGoal = userGoals.find(g => g.goal_type === 'daily_questions');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <Header />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mx-4 mt-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => { setError(null); loadDashboard(); }}
            className="mt-2 text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Hero Section with Gradient Mesh Background */}
      <section className="relative overflow-hidden px-4 pt-8 pb-12">
        {/* Gradient Mesh Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34, 211, 238, 0.15) 0%, transparent 50%)',
          }}
        />
        
        {/* Hero Content */}
        <div className="relative z-10 container-app space-y-4">
          <motion.h1 
            className="text-4xl md:text-5xl font-black"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white">Own Your Learning. </span>
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Ace Your Future.
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg text-slate-300 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {getPersonalizedMessage()}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href={currentProgress ? `/topics/${currentProgress.subject_id}` : '/subjects'}>
              <MagicButton variant="primary" size="lg">
                {currentProgress ? 'Continue Learning' : 'Start First Lesson'} →
              </MagicButton>
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="container-app space-y-6 -mt-6">
        {/* Learning Spotlight Card */}
        {currentProgress && currentSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MagicCard glow className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Current Progress</h3>
                  <p className="text-sm text-slate-400 mb-4">{currentSubject.name}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Questions Attempted</span>
                      <span className="font-semibold text-white">{currentProgress.questions_attempted}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Correct Answers</span>
                      <span className="font-semibold text-emerald-400">{currentProgress.questions_correct}</span>
                    </div>
                  </div>
                  
                  <Link href={`/topics/${currentProgress.subject_id}`}>
                    <MagicButton variant="primary" className="w-full">
                      Continue →
                    </MagicButton>
                  </Link>
                </div>
                
                <div className="flex-shrink-0">
                  <ProgressRing 
                    progress={currentProgress.accuracy_percentage || 0} 
                    size="lg" 
                    showLabel 
                  />
                </div>
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* Stats Bento Grid - Pulling from actual student activity records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <BentoGrid columns={3} gap="md">
            {/* Current Streak Card - Shows daily login streak */}
            <StatCard
              title="Current Streak"
              value={stats?.currentStreak ?? 0}
              icon={<Flame className="w-6 h-6" />}
              trend={stats?.currentStreak && stats.currentStreak > 0 ? 'up' : undefined}
              trendValue={stats?.currentStreak && stats.currentStreak > 0 ? `${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}` : undefined}
            />
            
            {/* Questions Answered Card - Shows lifetime total with weekly activity trend */}
            <StatCard
              title="Questions Answered"
              value={stats?.questionsAnswered ?? 0}
              icon={<Target className="w-6 h-6" />}
              trend={(() => {
                // Only show trend if there's weekly activity
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const weeklyQuestions = recentSessions
                  .filter(s => s.status === 'completed' && s.completed_at && new Date(s.completed_at) >= weekAgo)
                  .reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                return weeklyQuestions > 0 ? 'up' : undefined;
              })()}
              trendValue={(() => {
                // Calculate from actual completed sessions this week
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const weeklyQuestions = recentSessions
                  .filter(s => s.status === 'completed' && s.completed_at && new Date(s.completed_at) >= weekAgo)
                  .reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                return weeklyQuestions > 0 ? `${weeklyQuestions} this week` : undefined;
              })()}
            />
            
            {/* Accuracy Rate Card - Shows lifetime accuracy with recent performance comparison */}
            <StatCard
              title="Accuracy Rate"
              value={`${Math.round(stats?.accuracy ?? 0)}%`}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={(() => {
                // Compare recent accuracy vs lifetime accuracy
                const completedSessions = recentSessions.filter(s => s.status === 'completed');
                if (completedSessions.length === 0) {
                  // If no recent sessions, use lifetime accuracy threshold (70% is good)
                  const lifetimeAccuracy = stats?.accuracy ?? 0;
                  return lifetimeAccuracy >= 70 ? 'up' : (lifetimeAccuracy > 0 ? 'down' : undefined);
                }
                const totalAnswered = completedSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
                if (totalAnswered === 0) {
                  // No questions answered in recent sessions
                  const lifetimeAccuracy = stats?.accuracy ?? 0;
                  return lifetimeAccuracy >= 70 ? 'up' : (lifetimeAccuracy > 0 ? 'down' : undefined);
                }
                const recentAccuracy = (totalCorrect / totalAnswered) * 100;
                const lifetimeAccuracy = stats?.accuracy ?? 0;
                // Show up if recent accuracy is better than or equal to lifetime, down if worse
                return recentAccuracy >= lifetimeAccuracy ? 'up' : 'down';
              })()}
              trendValue={(() => {
                // Calculate accuracy from actual completed sessions
                const completedSessions = recentSessions.filter(s => s.status === 'completed');
                if (completedSessions.length === 0) {
                  return stats?.accuracy ? `${Math.round(stats.accuracy)}% lifetime` : '0%';
                }
                const totalAnswered = completedSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
                const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
                if (totalAnswered === 0) {
                  return stats?.accuracy ? `${Math.round(stats.accuracy)}% lifetime` : '0%';
                }
                const recentAccuracy = Math.round((totalCorrect / totalAnswered) * 100);
                return `${recentAccuracy}% recent`;
              })()}
            />
          </BentoGrid>
        </motion.div>

        {/* Mode Breakdown */}
        {recentSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <MagicCard className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Activity by Mode</h3>
              <div className="grid grid-cols-3 gap-4">
                {['practice', 'test', 'timed'].map((mode) => {
                  const modeSessions = recentSessions.filter(s => s.mode === mode);
                  const completedSessions = modeSessions.filter(s => s.status === 'completed');
                  const totalQuestions = completedSessions.reduce((sum, s) => sum + s.questions_answered, 0);
                  const totalCorrect = completedSessions.reduce((sum, s) => sum + s.correct_answers, 0);
                  const avgScore = completedSessions.length > 0
                    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / completedSessions.length)
                    : 0;
                  
                  const modeConfig = {
                    practice: { icon: BookOpen, color: 'from-blue-500 to-blue-600', label: 'Practice' },
                    test: { icon: FileText, color: 'from-amber-500 to-amber-600', label: 'Test' },
                    timed: { icon: Timer, color: 'from-orange-500 to-orange-600', label: 'Timed' },
                  };
                  
                  const config = modeConfig[mode as keyof typeof modeConfig];
                  const Icon = config.icon;
                  
                  return (
                    <div key={mode} className="text-center">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-sm text-slate-400 mb-1">{config.label}</p>
                      <p className="text-2xl font-bold text-white">{completedSessions.length}</p>
                      <p className="text-xs text-slate-500">sessions</p>
                      {totalQuestions > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {totalCorrect}/{totalQuestions} correct ({avgScore}% avg)
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* Study Time Goal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <MagicCard className="p-6 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">
                    {Math.floor(weeklyStudyTimeMinutes / 60)}h {weeklyStudyTimeMinutes % 60}m
                  </p>
                  <p className="text-sm text-slate-400">Study Time This Week</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {recentSessions.filter(s => s.status === 'completed' && s.completed_at && new Date(s.completed_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} completed sessions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Weekly Goal</p>
                <p className="text-2xl font-bold text-white">{Math.floor(studyTimeGoalMinutes / 60)}h</p>
                <p className="text-xs text-slate-500 mt-1">
                  {Math.round((weeklyStudyTimeMinutes / studyTimeGoalMinutes) * 100)}% complete
                </p>
                {studyTimeGoal && (
                  <Link href="/profile" className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 block">
                    Edit goal →
                  </Link>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/50"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((weeklyStudyTimeMinutes / studyTimeGoalMinutes) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>0h</span>
              <span className="font-semibold text-slate-300">
                {weeklyStudyTimeMinutes >= studyTimeGoalMinutes ? '🎉 Goal Achieved!' : `${Math.floor((studyTimeGoalMinutes - weeklyStudyTimeMinutes) / 60)}h ${(studyTimeGoalMinutes - weeklyStudyTimeMinutes) % 60}m remaining`}
              </span>
              <span>{Math.floor(studyTimeGoalMinutes / 60)}h</span>
            </div>
          </MagicCard>
        </motion.div>

        {/* Additional Goals Section */}
        {(weeklyQuestionsGoal || dailyQuestionsGoal) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <MagicCard className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Your Goals</h3>
              <div className="space-y-4">
                {weeklyQuestionsGoal && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Weekly Questions</span>
                      <span className="text-sm font-semibold text-white">
                        {weeklyQuestionsGoal.current_value} / {weeklyQuestionsGoal.target_value}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${Math.min((weeklyQuestionsGoal.current_value / weeklyQuestionsGoal.target_value) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {dailyQuestionsGoal && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Daily Questions</span>
                      <span className="text-sm font-semibold text-white">
                        {dailyQuestionsGoal.current_value} / {dailyQuestionsGoal.target_value}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${Math.min((dailyQuestionsGoal.current_value / dailyQuestionsGoal.target_value) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <Link href="/profile" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-4">
                  Manage goals →
                </Link>
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* Quick Action Cards */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <Link href={action.href}>
                    <MagicCard hover className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-cyan-500/50">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/50">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-semibold text-sm text-white mb-1">{action.label}</p>
                      <p className="text-xs text-slate-400">{action.description}</p>
                    </MagicCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Learning Modes */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Choose Your Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {learningModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <motion.div
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                >
                  <Link href={mode.href}>
                    <MagicCard hover className="group p-6 bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 h-full">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{mode.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-4">{mode.description}</p>
                      <div className={`h-1 rounded-full bg-gradient-to-r ${mode.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    </MagicCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Sessions Activity - All Modes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>
            {recentSessions.length > 0 && (
              <Link href="/analytics">
                <MagicButton variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4" />
                </MagicButton>
              </Link>
            )}
          </div>
          
          {recentSessions.length > 0 ? (
            
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session, index) => {
                const subject = subjects.find(s => s.id === session.subject_id);
                if (!subject) return null;
                
                const modeColors = {
                  practice: 'from-blue-500 to-blue-600',
                  test: 'from-amber-500 to-amber-600',
                  timed: 'from-orange-500 to-orange-600',
                };
                
                const modeIcons = {
                  practice: BookOpen,
                  test: FileText,
                  timed: Timer,
                };
                
                const ModeIcon = modeIcons[session.mode];
                const isCompleted = session.status === 'completed';
                const score = session.score_percentage || (session.questions_answered > 0 
                  ? Math.round((session.correct_answers / session.questions_answered) * 100) 
                  : 0);
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 1.0 + index * 0.1 }}
                  >
                    <Link href={isCompleted ? `/results/${session.id}` : `/${session.mode}/${session.id}`}>
                      <MagicCard hover className="p-4 bg-slate-900/50 border-slate-700 hover:border-violet-500/50">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${modeColors[session.mode]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <ModeIcon className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white truncate">{subject.name}</h3>
                                <MagicBadge 
                                  variant={session.mode === 'practice' ? 'info' : session.mode === 'test' ? 'warning' : 'error'} 
                                  size="sm"
                                >
                                  {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)}
                                </MagicBadge>
                              </div>
                              {isCompleted && (
                                <MagicBadge 
                                  variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'} 
                                  size="sm"
                                >
                                  {score}%
                                </MagicBadge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {session.correct_answers} / {session.questions_answered} correct
                              </span>
                              {session.time_spent_seconds > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(session.time_spent_seconds / 60)}m {session.time_spent_seconds % 60}s
                                </span>
                              )}
                              <span>
                                {session.completed_at 
                                  ? new Date(session.completed_at).toLocaleDateString() 
                                  : session.started_at 
                                  ? new Date(session.started_at).toLocaleDateString() 
                                  : 'Recently'}
                              </span>
                            </div>
                            
                            {session.status === 'in_progress' && (
                              <div className="mt-2">
                                <MagicBadge variant="info" size="sm">
                                  In Progress
                                </MagicBadge>
                              </div>
                            )}
                            {session.status === 'paused' && (
                              <div className="mt-2">
                                <MagicBadge variant="warning" size="sm">
                                  Paused
                                </MagicBadge>
                              </div>
                            )}
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        </div>
                      </MagicCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <MagicCard className="p-6 bg-slate-900/50 border-slate-700 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-400 mb-2">No sessions yet</p>
              <p className="text-sm text-slate-500 mb-4">Start practicing to see your activity here</p>
              <Link href="/practice">
                <MagicButton variant="primary" size="sm">
                  Start Practice
                </MagicButton>
              </Link>
            </MagicCard>
          )}
        </div>

        {/* Topic Progress Activity */}
        {progress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Topic Progress</h2>
              <Link href="/analytics">
                <MagicButton variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4" />
                </MagicButton>
              </Link>
            </div>
            
            <div className="space-y-3">
              {progress.slice(0, 3).map((prog, index) => {
                const subject = subjects.find(s => s.id === prog.subject_id);
                if (!subject) return null;
                
                return (
                  <motion.div
                    key={prog.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                  >
                    <Link href={`/topics/${prog.subject_id}`}>
                      <MagicCard hover className="p-4 bg-slate-900/50 border-slate-700 hover:border-violet-500/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-slate-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-white truncate">{subject.name}</h3>
                              <MagicBadge variant="success" size="sm">
                                {Math.round(prog.accuracy_percentage || 0)}%
                              </MagicBadge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {prog.questions_correct} / {prog.questions_attempted}
                              </span>
                              <span>
                                {prog.last_practiced_at 
                                  ? new Date(prog.last_practiced_at).toLocaleDateString() 
                                  : 'Recently'}
                              </span>
                            </div>
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        </div>
                      </MagicCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Subjects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Explore Subjects</h2>
            <Link href="/subjects">
              <MagicButton variant="ghost" size="sm">
                See All <ChevronRight className="w-4 h-4" />
              </MagicButton>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {subjects.slice(0, 4).map((subject, index) => {
              const subjectProgress = progress.find(p => p.subject_id === subject.id);
              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                >
                  <Link href={`/topics/${subject.id}`}>
                    <MagicCard hover className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-violet-500/50 h-full">
                      <div className="text-4xl mb-3">📚</div>
                      <h3 className="font-semibold text-sm text-white mb-1 line-clamp-2">{subject.name}</h3>
                      <p className="text-xs text-slate-500 mb-2">{subject.total_questions} questions</p>
                      {subjectProgress && (
                        <MagicBadge variant="success" size="sm">
                          {Math.round(subjectProgress.accuracy_percentage || 0)}%
                        </MagicBadge>
                      )}
                    </MagicCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
