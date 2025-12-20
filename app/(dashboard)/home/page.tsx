'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { ProgressRing } from '@/components/magic/ProgressRing';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserStats, getUserProgress, updateUserStreak, getUserProfile, getUserSessions, getUserGoals } from '@/lib/api';
import type { Subject, UserStats, UserProgress, LearningSession, UserGoal, User } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSystemWideQuestionCount, getQuestionLimit } from '@/lib/guest-session';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
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
  AlertCircle,
  Trophy,
  Star,
  Play,
} from 'lucide-react';

/**
 * Home Page - Student Dashboard (Overhauled)
 * 
 * Design Philosophy:
 * - Answer questions before they're asked
 * - Single clear action per section
 * - Mobile-first, above-the-fold critical info
 * - Gamified and stimulating
 */
export default function HomePage() {
  const { userId, isGuest, isLoading: authLoading, user: authUser, enableGuestMode } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Redirect if not authenticated and not guest
  useEffect(() => {
    if (!authLoading) {
      if (!userId && !isGuest) {
        router.push('/login');
      }
    }
  }, [userId, isGuest, authLoading, router]);

  useEffect(() => {
    if (isGuest) {
      // Load subjects for guests
      loadSubjectsForGuest();
      setLoading(false);
    } else if (userId) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isGuest]);

  async function loadDashboard() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Update streak on page load
      await updateUserStreak(userId);

      // Fetch data in parallel
      const [profile, userStats, allSubjects, userProgress, sessions, goals] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId),
        getSubjects(),
        getUserProgress(userId),
        getUserSessions(userId, 50),
        getUserGoals(userId),
      ]);

      setUserProfile(profile);
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

  async function loadSubjectsForGuest() {
    try {
      setLoading(true);
      setError(null);
      const allSubjects = await getSubjects();
      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ========== HELPER FUNCTIONS ==========

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's display name
  const getUserDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name.split(' ')[0]; // First name only
    }
    if (authUser?.user_metadata?.full_name) {
      return authUser.user_metadata.full_name.split(' ')[0];
    }
    if (authUser?.email) {
      return authUser.email.split('@')[0];
    }
    return 'Student';
  };

  // Get incomplete session (in_progress or paused)
  const getIncompleteSession = (): LearningSession | null => {
    return recentSessions.find(s => s.status === 'in_progress' || s.status === 'paused') || null;
  };

  // Check if streak is at risk (no activity today)
  const isStreakAtRisk = () => {
    if (!stats?.currentStreak || stats.currentStreak === 0) return false;
    const today = new Date().toDateString();
    const lastActive = stats.lastActiveDate 
      ? (stats.lastActiveDate instanceof Date ? stats.lastActiveDate : new Date(stats.lastActiveDate)).toDateString()
      : null;
    return lastActive !== today;
  };

  // Get daily questions answered today
  const getDailyQuestionsAnswered = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return recentSessions
      .filter(s => {
        if (s.status !== 'completed') return false;
        const completedAt = s.completed_at ? new Date(s.completed_at) : null;
        return completedAt && completedAt >= today;
      })
      .reduce((sum, s) => sum + (s.questions_answered || 0), 0);
  };

  // Get daily goal (default 10 questions)
  const getDailyGoal = () => {
    const dailyGoal = userGoals.find(g => g.goal_type === 'daily_questions');
    return dailyGoal?.target_value || 10;
  };

  // Get weak areas (topics with accuracy < 70%)
  const getWeakAreas = () => {
    return progress
      .filter(p => (p.accuracy_percentage || 0) < 70)
      .sort((a, b) => (a.accuracy_percentage || 0) - (b.accuracy_percentage || 0))
      .slice(0, 3)
      .map(p => {
        const subject = subjects.find(s => s.id === p.subject_id);
        return { ...p, subject };
      })
      .filter(p => p.subject); // Remove if subject not found
  };

  // Calculate weekly study time
  const calculateWeeklyStudyTime = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklySessions = recentSessions.filter(session => {
      if (session.status !== 'completed') return false;
      const completedAt = session.completed_at ? new Date(session.completed_at) : null;
      if (!completedAt) return false;
      return completedAt >= weekAgo;
    });

    const totalSeconds = weeklySessions.reduce((sum, session) => {
      return sum + (session.time_spent_seconds || 0);
    }, 0);

    return Math.floor(totalSeconds / 60);
  };

  // Get subject progress
  const getSubjectProgress = (subjectId: string) => {
    const subjectProgress = progress.filter(p => p.subject_id === subjectId);
    if (subjectProgress.length === 0) return null;

    const totalAccuracy = subjectProgress.reduce((sum, p) => sum + (p.accuracy_percentage || 0), 0);
    const avgAccuracy = totalAccuracy / subjectProgress.length;
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.questions_attempted, 0);

    return {
      accuracy: Math.round(avgAccuracy),
      questionsAttempted: totalQuestions,
      topicsStarted: subjectProgress.length,
    };
  };

  // Smart CTA logic
  const getPrimaryCTA = () => {
    const incompleteSession = getIncompleteSession();
    const streakAtRisk = isStreakAtRisk();
    const dailyQuestions = getDailyQuestionsAnswered();
    const dailyGoal = getDailyGoal();

    if (incompleteSession) {
      const subject = subjects.find(s => s.id === incompleteSession.subject_id);
      return {
        text: `Resume ${subject?.name || 'Session'}`,
        href: `/${incompleteSession.mode}/${incompleteSession.id}`,
        variant: 'primary' as const,
        icon: Play,
      };
    }

    if (streakAtRisk && stats?.currentStreak) {
      return {
        text: `Keep Your ${stats.currentStreak}-Day Streak!`,
        href: '/quick-practice',
        variant: 'primary' as const,
        icon: Flame,
      };
    }

    if (dailyQuestions < dailyGoal) {
      const remaining = dailyGoal - dailyQuestions;
      return {
        text: `Complete ${remaining} More Question${remaining > 1 ? 's' : ''} Today`,
        href: '/subjects',
        variant: 'primary' as const,
        icon: Target,
      };
    }

    return {
      text: 'Start Learning',
      href: '/subjects',
      variant: 'primary' as const,
      icon: BookOpen,
    };
  };

  // Get motivational message
  const getMotivationalMessage = () => {
    const streak = stats?.currentStreak || 0;
    const dailyQuestions = getDailyQuestionsAnswered();
    const dailyGoal = getDailyGoal();
    const accuracy = Math.round(stats?.accuracy || 0);

    if (streak >= 7) {
      return `🔥 Amazing ${streak}-day streak! You're on fire!`;
    }
    if (streak >= 3) {
      return `🔥 ${streak} days strong! Keep it going!`;
    }
    if (dailyQuestions >= dailyGoal) {
      return `🎉 Daily goal achieved! You're crushing it!`;
    }
    if (accuracy >= 80) {
      return `⭐ ${accuracy}% accuracy! Excellent work!`;
    }
    if (accuracy >= 70) {
      return `📈 ${accuracy}% accuracy! Keep improving!`;
    }
    if (progress.length > 0) {
      return `Ready to continue your learning journey?`;
    }
    return `Start preparing the smart way today`;
  };

  // ========== DATA CALCULATIONS ==========

  const incompleteSession = getIncompleteSession();
  const weakAreas = getWeakAreas();
  const weeklyStudyTimeMinutes = calculateWeeklyStudyTime();
  const dailyQuestionsAnswered = getDailyQuestionsAnswered();
  const dailyGoal = getDailyGoal();
  const dailyProgress = Math.min((dailyQuestionsAnswered / dailyGoal) * 100, 100);
  const primaryCTA = getPrimaryCTA();
  const PrimaryIcon = primaryCTA.icon;

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

  // Guest-specific UI
  if (isGuest) {
    const questionCount = getSystemWideQuestionCount();
    const questionLimit = getQuestionLimit();
    const questionsRemaining = Math.max(0, questionLimit - questionCount);

    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <Header />

        <div className="container-app space-y-4 pt-6">
          {/* Signup Banner */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 border border-violet-500/50 p-6 sm:p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20" />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Try SabiPrep for Free! 🎉
                  </h2>
                  <p className="text-indigo-100 mb-4">
                    You've answered {questionCount} of {questionLimit} free questions. {questionsRemaining > 0 ? `${questionsRemaining} remaining!` : 'Sign up for unlimited access!'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <MagicButton
                      variant="primary"
                      onClick={() => {
                        const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/home';
                        router.push(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`);
                      }}
                      className="bg-white text-indigo-600 hover:bg-indigo-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Sign Up for Full Access
                    </MagicButton>
                    <Link href="/subjects">
                      <MagicButton variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Continue Learning
                      </MagicButton>
                    </Link>
                  </div>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Trial Progress Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <MagicCard className="p-6 bg-slate-900/50 border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Your Trial Progress</h3>
                <MagicBadge variant="info">{questionCount} / {questionLimit}</MagicBadge>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(questionCount / questionLimit) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <p className="text-sm text-slate-400">
                {questionsRemaining > 0 
                  ? `Answer ${questionsRemaining} more question${questionsRemaining > 1 ? 's' : ''} to unlock full access!`
                  : 'You\'ve reached the trial limit. Sign up to continue learning!'}
              </p>
            </MagicCard>
          </motion.section>

          {/* Subjects Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Explore Subjects</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link href="/subjects">
                    <MagicCard className="p-6 bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors cursor-pointer h-full">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                          {subject.icon || '📚'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1 truncate">{subject.name}</h3>
                          <p className="text-sm text-slate-400 line-clamp-2">{subject.description || 'Start practicing now'}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      </div>
                    </MagicCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        <BottomNav />

        {/* Signup Modal */}
        {showSignupModal && (
          <SignupPromptModal
            isOpen={showSignupModal}
            onClose={() => setShowSignupModal(false)}
            questionCount={questionCount}
          />
        )}
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

      <div className="container-app space-y-4 pt-6">
        {/* ========== SECTION 1: HERO - PERSONAL GREETING ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/20 via-cyan-500/20 to-purple-500/20 border border-cyan-500/30 p-6 sm:p-8"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10" />
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34, 211, 238, 0.15) 0%, transparent 50%)',
            }}
          />

          <div className="relative z-10">
            {/* Greeting and Stats Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <motion.h1 
                  className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getGreeting()}, <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">{getUserDisplayName()}!</span>
                </motion.h1>
                <motion.p 
                  className="text-base sm:text-lg text-slate-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {getMotivationalMessage()}
                </motion.p>
              </div>

              {/* Streak and XP Badge */}
              <div className="flex items-center gap-3">
                {stats?.currentStreak && stats.currentStreak > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30"
                  >
                    <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
                    <div>
                      <p className="text-xs text-slate-400">Streak</p>
                      <p className="text-lg font-bold text-white">{stats.currentStreak} days</p>
                    </div>
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                >
                  <Star className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-slate-400">XP</p>
                    <p className="text-lg font-bold text-white">{stats?.questionsAnswered || 0}</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href={primaryCTA.href}>
                <MagicButton 
                  variant={primaryCTA.variant} 
                  size="lg"
                  className="w-full sm:w-auto shadow-lg shadow-cyan-500/25 hover:scale-105 transition-transform"
                >
                  <PrimaryIcon className="w-5 h-5 mr-2" />
                  {primaryCTA.text} →
                </MagicButton>
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* ========== SECTION 2: TODAY'S MISSION CARD ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <MagicCard glow className="p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Today's Mission</h2>
              {dailyQuestionsAnswered >= dailyGoal && (
                <MagicBadge variant="success" size="sm">
                  <Trophy className="w-3 h-3 mr-1" />
                  Completed!
                </MagicBadge>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
              {/* Progress Ring */}
              <div className="flex-shrink-0">
                <ProgressRing 
                  progress={dailyProgress} 
                  size="lg" 
                  showLabel 
                />
              </div>

              {/* Mission Details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Complete {dailyGoal} questions today
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-semibold text-white">
                      {dailyQuestionsAnswered} / {dailyGoal} completed
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${dailyProgress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>

                {/* Gamification Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-slate-300">{stats?.currentStreak || 0} day streak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300">{stats?.questionsAnswered || 0} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Rising</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-700">
              <Link href="/quick-practice">
                <MagicButton variant="secondary" size="sm" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Quick 5 Questions
                </MagicButton>
              </Link>
              {incompleteSession && (
                <Link href={`/${incompleteSession.mode}/${incompleteSession.id}`}>
                  <MagicButton variant="secondary" size="sm" className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Continue Session
                  </MagicButton>
                </Link>
              )}
              <Link href="/daily-challenge">
                <MagicButton variant="secondary" size="sm" className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Daily Challenge
                </MagicButton>
              </Link>
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== SECTION 3: QUICK STATS ROW ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {/* Streak Stat */}
          <MagicCard className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-orange-500/50 transition-colors">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-2 shadow-lg"
            >
              <Flame className="w-5 h-5 text-white" />
            </motion.div>
            <p className="text-2xl font-bold text-white">{stats?.currentStreak || 0}</p>
            <p className="text-xs text-slate-400">Streak</p>
          </MagicCard>

          {/* Questions Stat */}
          <MagicCard className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 transition-colors">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-2 shadow-lg"
            >
              <Target className="w-5 h-5 text-white" />
            </motion.div>
            <p className="text-2xl font-bold text-white">{stats?.questionsAnswered || 0}</p>
            <p className="text-xs text-slate-400">Questions</p>
          </MagicCard>

          {/* Accuracy Stat */}
          <MagicCard className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2 shadow-lg"
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </motion.div>
            <p className="text-2xl font-bold text-white">{Math.round(stats?.accuracy || 0)}%</p>
            <p className="text-xs text-slate-400">Accuracy</p>
          </MagicCard>

          {/* Study Time Stat */}
          <MagicCard className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-violet-500/50 transition-colors">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: 'spring' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-2 shadow-lg"
            >
              <Clock className="w-5 h-5 text-white" />
            </motion.div>
            <p className="text-2xl font-bold text-white">
              {Math.floor(weeklyStudyTimeMinutes / 60)}h {weeklyStudyTimeMinutes % 60}m
            </p>
            <p className="text-xs text-slate-400">This Week</p>
          </MagicCard>
        </motion.div>

        {/* ========== SECTION 4: SMART RECOMMENDATIONS (Weak Areas) ========== */}
        {weakAreas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <MagicCard className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold text-white">Focus Areas</h2>
                <MagicBadge variant="error" size="sm">Needs Practice</MagicBadge>
              </div>
              <p className="text-sm text-slate-300 mb-4">Based on your performance, these topics need more attention:</p>
              
              <div className="space-y-3">
                {weakAreas.map((area, index) => {
                  const accuracy = Math.round(area.accuracy_percentage || 0);
                  const getUrgencyColor = () => {
                    if (accuracy < 50) return 'text-red-400 border-red-500/50 bg-red-500/10';
                    if (accuracy < 60) return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
                    return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
                  };

                  return (
                    <motion.div
                      key={area.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <Link href={`/topics/${area.subject_id}`}>
                        <MagicCard hover className={`p-4 border-2 ${getUrgencyColor()}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white">{area.subject?.name}</h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                  {accuracy}% accuracy
                                </span>
                              </div>
                              <p className="text-sm text-slate-400">
                                {area.questions_attempted} questions attempted
                              </p>
                            </div>
                            <MagicButton variant="primary" size="sm">
                              Practice Now →
                            </MagicButton>
                          </div>
                        </MagicCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* ========== SECTION 5: RESUME LEARNING (Conditional) ========== */}
        {incompleteSession && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <MagicCard glow className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Pick up where you left off</h2>
              </div>
              
              {(() => {
                const subject = subjects.find(s => s.id === incompleteSession.subject_id);
                const questionsAnswered = incompleteSession.questions_answered || 0;
                const totalQuestions = incompleteSession.total_questions || 0;
                const correctAnswers = incompleteSession.correct_answers || 0;
                const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;

                return (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl shadow-lg">
                        {subject?.icon || '📚'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg mb-1">{subject?.name || 'Subject'}</h3>
                        <p className="text-sm text-slate-300 mb-2">
                          Question {questionsAnswered + 1} / {totalQuestions} • {accuracy}% accuracy so far
                        </p>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500"
                            style={{ width: `${(questionsAnswered / totalQuestions) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Link href={`/${incompleteSession.mode}/${incompleteSession.id}`}>
                      <MagicButton variant="primary" size="lg" className="w-full sm:w-auto">
                        <Play className="w-5 h-5 mr-2" />
                        Resume Now →
                      </MagicButton>
                    </Link>
                  </div>
                );
              })()}
            </MagicCard>
          </motion.div>
        )}

        {/* ========== SECTION 6: EXPLORE SUBJECTS (Compact Grid) ========== */}
        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Explore Subjects</h2>
              <Link href="/subjects">
                <MagicButton variant="ghost" size="sm">
                  See All <ChevronRight className="w-4 h-4" />
                </MagicButton>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subjects.slice(0, 4).map((subject, index) => {
                const subjectProgress = getSubjectProgress(subject.id);
                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <Link href={`/subjects`} onClick={(e) => {
                      e.preventDefault();
                      router.push(`/subjects`);
                    }}>
                      <MagicCard hover className="p-4 text-center bg-slate-900/50 border-slate-700 hover:border-violet-500/50 h-full relative overflow-hidden group">
                        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                          {subject.icon || '📚'}
                        </div>
                        <h3 className="font-semibold text-sm text-white mb-1 line-clamp-2">{subject.name}</h3>
                        <p className="text-xs text-slate-500 mb-2">{subject.total_questions} questions</p>
                        {subjectProgress && (
                          <div className="mt-2">
                            <MagicBadge variant="success" size="sm">
                              {subjectProgress.accuracy}%
                            </MagicBadge>
                          </div>
                        )}
                        {!subjectProgress && (
                          <MagicBadge variant="default" size="sm">
                            New
                          </MagicBadge>
                        )}
                      </MagicCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ========== SECTION 7: RECENT ACTIVITY (Minimal - 3 items max) ========== */}
        {recentSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <Link href="/analytics">
                <MagicButton variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4" />
                </MagicButton>
              </Link>
            </div>
            
            <div className="space-y-2">
              {recentSessions.slice(0, 3).map((session, index) => {
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
                
                // Format date
                const getDateLabel = () => {
                  if (!session.completed_at && !session.started_at) return 'Recently';
                  const date = session.completed_at ? new Date(session.completed_at) : new Date(session.started_at!);
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  if (date.toDateString() === today.toDateString()) return 'Today';
                  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                  return date.toLocaleDateString();
                };
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                  >
                    <Link href={isCompleted ? `/results/${session.id}` : `/${session.mode}/${session.id}`}>
                      <MagicCard hover className="p-3 bg-slate-900/50 border-slate-700 hover:border-violet-500/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${modeColors[session.mode]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <ModeIcon className="w-5 h-5 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm text-white truncate">{subject.name}</h3>
                              {isCompleted && (
                                <MagicBadge 
                                  variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'} 
                                  size="sm"
                                >
                                  {score}%
                                </MagicBadge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span>{session.correct_answers} / {session.questions_answered} correct</span>
                              <span>•</span>
                              <span>{getDateLabel()}</span>
                            </div>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        </div>
                      </MagicCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State for Recent Activity */}
        {recentSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <MagicCard className="p-6 bg-slate-900/50 border-slate-700 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-400 mb-2">No sessions yet</p>
              <p className="text-sm text-slate-500 mb-4">Start learning to see your activity here</p>
              <Link href="/subjects">
                <MagicButton variant="primary" size="sm">
                  Start Learning
                </MagicButton>
              </Link>
            </MagicCard>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
