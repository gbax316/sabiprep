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
import { getSubjects, getUserStats, getUserProgress, updateUserStreak, getUserProfile, getUserSessions, getUserGoals, canResumeSession, updateSession, getPreferredSubjects, getUserMasteryBadges, getTodayDailyChallenges, getUserDailyChallengeCompletions } from '@/lib/api';
import type { Subject, UserStats, UserProgress, LearningSession, UserGoal, User, UserMasteryBadge, DailyChallenge, UserDailyChallenge } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSystemWideQuestionCount, getQuestionLimit } from '@/lib/guest-session';
import { shuffleArray } from '@/lib/utils';
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
  Rocket,
  Award,
  Brain,
  Lightbulb,
  GraduationCap,
  Compass,
  ArrowRight,
  Activity,
  BarChart3,
  Crown,
  Heart,
  Medal,
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
  const [validatedSessions, setValidatedSessions] = useState<Set<string>>(new Set());
  const [invalidSessions, setInvalidSessions] = useState<Set<string>>(new Set());
  const [masteryBadges, setMasteryBadges] = useState<UserMasteryBadge[]>([]);
  const [todayDailyChallenges, setTodayDailyChallenges] = useState<DailyChallenge[]>([]);
  const [dailyChallengeCompletions, setDailyChallengeCompletions] = useState<UserDailyChallenge[]>([]);

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

      // Update streak on page load (don't fail if this errors)
      try {
        await updateUserStreak(userId);
      } catch (streakError) {
        console.warn('Error updating streak:', streakError);
        // Continue loading even if streak update fails
      }

      // Fetch data in parallel with individual error handling
      const [profile, userStats, allSubjects, preferredSubjects, userProgress, sessions, goals, badges, challenges, challengeCompletions] = await Promise.allSettled([
        getUserProfile(userId).catch(() => null),
        getUserStats(userId).catch(() => ({
          questionsAnswered: 0,
          correctAnswers: 0,
          accuracy: 0,
          studyTimeMinutes: 0,
          currentStreak: 0,
          lastActiveDate: undefined,
        })),
        getSubjects().catch(() => []),
        getPreferredSubjects(userId).catch(() => []),
        getUserProgress(userId).catch(() => []),
        getUserSessions(userId, 50).catch(() => []),
        getUserGoals(userId).catch(() => []),
        getUserMasteryBadges(userId).catch(() => []),
        getTodayDailyChallenges().catch(() => []),
        getUserDailyChallengeCompletions(userId, 3).catch(() => []),
      ]);

      setUserProfile(profile.status === 'fulfilled' ? profile.value : null);
      setStats(userStats.status === 'fulfilled' ? userStats.value : {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        studyTimeMinutes: 0,
        currentStreak: 0,
        lastActiveDate: undefined,
        xpPoints: 0,
      });
      // Use preferred subjects if available, otherwise use all subjects
      const preferred = preferredSubjects.status === 'fulfilled' ? preferredSubjects.value : [];
      const all = allSubjects.status === 'fulfilled' ? allSubjects.value : [];
      const subjectsToUse = preferred.length > 0 ? preferred : all;
      
      // Randomize and take first 4
      const shuffled = shuffleArray(subjectsToUse);
      setSubjects(shuffled.slice(0, 4));
      setProgress(userProgress.status === 'fulfilled' ? userProgress.value : []);
      const loadedSessions = sessions.status === 'fulfilled' ? sessions.value : [];
      setRecentSessions(loadedSessions);
      setUserGoals(goals.status === 'fulfilled' ? goals.value : []);
      setMasteryBadges(badges.status === 'fulfilled' ? badges.value : []);
      setTodayDailyChallenges(challenges.status === 'fulfilled' ? challenges.value : []);
      setDailyChallengeCompletions(challengeCompletions.status === 'fulfilled' ? challengeCompletions.value : []);
      
      // Validate incomplete sessions in the background (non-blocking)
      // Only validate for authenticated users, not guests
      if (loadedSessions.length > 0 && userId && !isGuest) {
        validateIncompleteSessions(loadedSessions).catch(error => {
          console.error('Error validating sessions:', error);
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Failed to load dashboard. Please try again.');
      // Set safe defaults on error
      setStats({
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        studyTimeMinutes: 0,
        currentStreak: 0,
        lastActiveDate: undefined,
      });
      setSubjects([]);
      setProgress([]);
      setRecentSessions([]);
      setUserGoals([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubjectsForGuest() {
    try {
      setLoading(true);
      setError(null);
      const allSubjects = await getSubjects();
      // Randomize and take first 4 for guests too
      const shuffled = shuffleArray(allSubjects);
      setSubjects(shuffled.slice(0, 4));
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

  // Validate incomplete sessions (runs in background, non-blocking)
  async function validateIncompleteSessions(sessions: LearningSession[]) {
    const incompleteSessions = sessions.filter(s => 
      s.status === 'in_progress' || s.status === 'paused'
    );
    
    // Validate all incomplete sessions in parallel
    const validationPromises = incompleteSessions.map(async (session) => {
      try {
        const validation = await canResumeSession(session.id);
        if (validation.canResume) {
          setValidatedSessions(prev => {
            // Use functional update to avoid duplicates
            if (prev.has(session.id)) return prev;
            return new Set(prev).add(session.id);
          });
        } else {
          setInvalidSessions(prev => {
            // Use functional update to avoid duplicates
            if (prev.has(session.id)) return prev;
            return new Set(prev).add(session.id);
          });
          // Auto-cleanup invalid session
          if (validation.reason === 'No questions available') {
            try {
              await updateSession(session.id, { status: 'abandoned' });
              // Update local state to reflect the change
              setRecentSessions(prev => prev.map(s => 
                s.id === session.id ? { ...s, status: 'abandoned' as const } : s
              ));
            } catch (error) {
              console.error('Error cleaning up invalid session:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error validating session:', error);
        // Mark as invalid on error
        setInvalidSessions(prev => {
          if (prev.has(session.id)) return prev;
          return new Set(prev).add(session.id);
        });
      }
    });
    
    // Wait for all validations to complete (but don't block UI)
    await Promise.allSettled(validationPromises);
  }

  // Get incomplete session (in_progress or paused)
  // Prioritizes in_progress over paused, and most recent session if multiple exist
  // Only returns sessions that have been validated as resumable
  const getIncompleteSession = (): LearningSession | null => {
    if (!recentSessions || recentSessions.length === 0) return null;
    
    // First try to find in_progress session (most recent)
    const inProgress = recentSessions.find(s => 
      s.status === 'in_progress' && 
      !invalidSessions.has(s.id) &&
      (validatedSessions.has(s.id) || validatedSessions.size === 0) // Allow if validated or validation hasn't started
    );
    if (inProgress) return inProgress;
    
    // Then try paused session (most recent)
    const paused = recentSessions.find(s => 
      s.status === 'paused' && 
      !invalidSessions.has(s.id) &&
      (validatedSessions.has(s.id) || validatedSessions.size === 0) // Allow if validated or validation hasn't started
    );
    if (paused) return paused;
    
    return null;
  };

  // Check if streak is at risk (no activity today)
  // Uses local timezone for date comparison
  const isStreakAtRisk = () => {
    if (!stats?.currentStreak || stats.currentStreak === 0) return false;
    if (!stats.lastActiveDate) return true; // No activity date means streak is at risk
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastActive = stats.lastActiveDate instanceof Date 
        ? stats.lastActiveDate 
        : new Date(stats.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      
      // Compare dates (not times) - if last active is before today, streak is at risk
      return lastActive.getTime() < today.getTime();
    } catch (e) {
      console.warn('Error comparing dates for streak at risk:', e);
      return false; // Don't show streak warning if date parsing fails
    }
  };

  // Get daily questions answered today
  // Uses local timezone for "today" calculation
  const getDailyQuestionsAnswered = () => {
    if (!recentSessions || recentSessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return recentSessions
      .filter(s => {
        if (!s || s.status !== 'completed') return false;
        if (!s.completed_at) return false;
        
        try {
          const completedAt = new Date(s.completed_at);
          // Check if completed today (local timezone)
          return completedAt >= today && completedAt < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        } catch (e) {
          console.warn('Error parsing completed_at date:', s.completed_at, e);
          return false;
        }
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
    if (!progress || progress.length === 0) return [];
    if (!subjects || subjects.length === 0) return [];
    
    return progress
      .filter(p => p && (p.accuracy_percentage || 0) < 70)
      .sort((a, b) => (a.accuracy_percentage || 0) - (b.accuracy_percentage || 0))
      .slice(0, 3)
      .map(p => {
        const subject = subjects.find(s => s && s.id === p.subject_id);
        return { ...p, subject };
      })
      .filter(p => p && p.subject); // Remove if subject not found
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
    if (!progress || progress.length === 0 || !subjectId) return null;
    
    const subjectProgress = progress.filter(p => p && p.subject_id === subjectId);
    if (subjectProgress.length === 0) return null;

    const totalAccuracy = subjectProgress.reduce((sum, p) => sum + (p.accuracy_percentage || 0), 0);
    const avgAccuracy = totalAccuracy / subjectProgress.length;
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + (p.questions_attempted || 0), 0);

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

    // Priority 1: Long streak
    if (streak >= 7) {
      return `🔥 Amazing ${streak}-day streak! You're on fire!`;
    }
    
    // Priority 2: Good streak
    if (streak >= 3) {
      return `🔥 ${streak} days strong! Keep it going!`;
    }
    
    // Priority 3: Daily goal achieved
    if (dailyGoal > 0 && dailyQuestions >= dailyGoal) {
      return `🎉 Daily goal achieved! You're crushing it!`;
    }
    
    // Priority 4: High accuracy
    if (accuracy >= 80 && stats?.questionsAnswered && stats.questionsAnswered > 0) {
      return `⭐ ${accuracy}% accuracy! Excellent work!`;
    }
    
    // Priority 5: Good accuracy
    if (accuracy >= 70 && stats?.questionsAnswered && stats.questionsAnswered > 0) {
      return `📈 ${accuracy}% accuracy! Keep improving!`;
    }
    
    // Priority 6: Has progress
    if (progress && progress.length > 0) {
      return `Ready to continue your learning journey?`;
    }
    
    // Default: New student
    return `Start preparing the smart way today`;
  };

  // ========== DATA CALCULATIONS ==========

  const incompleteSession = getIncompleteSession();
  const weakAreas = getWeakAreas();
  const weeklyStudyTimeMinutes = calculateWeeklyStudyTime();
  const dailyQuestionsAnswered = getDailyQuestionsAnswered();
  const dailyGoal = getDailyGoal();
  const dailyProgress = dailyGoal > 0 
    ? Math.min((dailyQuestionsAnswered / dailyGoal) * 100, 100)
    : 0;
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
    <div className="min-h-screen bg-slate-950 pb-20 sm:pb-24 overflow-x-hidden">
      {/* Header */}
      <Header />

      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/40 rounded-xl p-4 mb-4 mx-3 sm:mx-4 mt-4"
        >
          <div className="flex items-center gap-2 text-red-200 mb-2">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => { setError(null); loadDashboard(); }}
            className="text-sm text-red-300 hover:text-white transition-colors underline underline-offset-2"
          >
            Try again
          </button>
        </motion.div>
      )}

      <div className="container-app space-y-4 sm:space-y-5 pt-4 sm:pt-6 px-3 sm:px-4">
        {/* ========== SECTION 1: HERO - PERSONAL GREETING ========== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-fuchsia-600/30 border border-violet-500/40 p-4 sm:p-6 md:p-8"
        >
          {/* Animated background with multiple layers */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-pink-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
          
          {/* Floating animated orbs */}
          <motion.div 
            className="absolute top-4 right-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-4 left-4 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-purple-500/20 blur-xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Decorative icons */}
          <motion.div 
            className="absolute top-3 right-3 sm:top-6 sm:right-6"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-400/60" />
          </motion.div>
          <motion.div 
            className="absolute bottom-3 right-12 sm:bottom-6 sm:right-24"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Rocket className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-400/50" />
          </motion.div>

          <div className="relative z-10">
            {/* Greeting and Stats Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <motion.div 
                  className="flex items-center gap-2 mb-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                  </motion.div>
                  <span className="text-xs sm:text-sm font-medium text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/30">
                    Welcome back!
                  </span>
                </motion.div>
                <motion.h1 
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1.5 sm:mb-2 leading-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
                >
                  {getGreeting()}, <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{getUserDisplayName()}!</span>
                </motion.h1>
                <motion.p 
                  className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed flex items-center gap-2 flex-wrap"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                >
                  <Brain className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  {getMotivationalMessage()}
                </motion.p>
              </div>

              {/* Streak and XP Badge */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {stats?.currentStreak && stats.currentStreak > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500/40 to-red-500/40 border-2 border-orange-400/60 shadow-lg shadow-orange-500/30 cursor-pointer"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300 flex-shrink-0" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-orange-200 leading-tight font-medium">Streak</p>
                      <p className="text-sm sm:text-lg font-black text-white leading-tight">{stats.currentStreak}d</p>
                    </div>
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 border-2 border-violet-400/60 shadow-lg shadow-violet-500/30 cursor-pointer"
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 flex-shrink-0" />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-violet-200 leading-tight font-medium">XP</p>
                    <p className="text-sm sm:text-lg font-black text-white leading-tight">{stats?.xpPoints || 0}</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
              className="flex flex-col xs:flex-row gap-2 sm:gap-3"
            >
              <Link href={primaryCTA.href} className="flex-1 xs:flex-initial">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <MagicButton 
                    variant={primaryCTA.variant} 
                    size="sm"
                    className="w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-3 px-4 sm:px-6 shadow-lg shadow-cyan-500/40 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 border-0"
                  >
                    <PrimaryIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    <span className="truncate">{primaryCTA.text}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </MagicButton>
                </motion.div>
              </Link>
              <Link href="/analytics" className="hidden xs:block">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <MagicButton 
                    variant="secondary" 
                    size="sm"
                    className="text-sm py-2.5 sm:py-3 px-3 sm:px-4 bg-white/10 border-white/20 hover:bg-white/20"
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    Progress
                  </MagicButton>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* ========== SECTION 2: TODAY'S MISSION CARD ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 100 }}
        >
          <MagicCard glow className="relative p-4 sm:p-5 md:p-6 bg-gradient-to-br from-slate-900/95 via-indigo-950/50 to-slate-900/95 border-2 border-indigo-500/30 rounded-xl sm:rounded-2xl overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
            <motion.div 
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 blur-xl"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Today's Mission</h2>
                </div>
                {dailyQuestionsAnswered >= dailyGoal ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <MagicBadge variant="success" size="sm" className="bg-gradient-to-r from-emerald-500/30 to-green-500/30 border-emerald-400/50">
                      <Trophy className="w-3 h-3 mr-1 text-yellow-400" />
                      <span className="hidden xs:inline">Completed!</span>
                      <span className="xs:hidden">Done!</span>
                    </MagicBadge>
                  </motion.div>
                ) : (
                  <MagicBadge variant="info" size="sm" className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-cyan-400/50">
                    <Activity className="w-3 h-3 mr-1" />
                    In Progress
                  </MagicBadge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-5">
                {/* Progress Ring with enhanced styling */}
                <div className="flex-shrink-0 relative">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 blur-md"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <ProgressRing 
                    progress={dailyProgress} 
                    size="lg" 
                    showLabel 
                  />
                </div>

                {/* Mission Details */}
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Complete {dailyGoal} questions today
                    </h3>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Progress
                      </span>
                      <span className="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {dailyQuestionsAnswered} / {dailyGoal}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/30"
                        initial={{ width: 0 }}
                        animate={{ width: `${dailyProgress}%` }}
                        transition={{ duration: 1, delay: 0.5, type: 'spring', stiffness: 50 }}
                      />
                    </div>
                  </div>

                  {/* Gamification Row - Enhanced */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    <motion.div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="text-orange-200 font-medium">{stats?.currentStreak || 0}d streak</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/20 border border-violet-500/30"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Star className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      <span className="text-violet-200 font-medium">{stats?.xpPoints || 0} XP</span>
                    </motion.div>
                    <motion.div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30"
                      whileHover={{ scale: 1.05 }}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-200 font-medium">{Math.round(stats?.accuracy || 0)}%</span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons - Enhanced */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-700/50">
                <Link href="/quick-practice">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <MagicButton variant="secondary" size="sm" className="w-full text-xs sm:text-sm py-2.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:border-yellow-400/50">
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-yellow-400" />
                      <span className="hidden xs:inline">Quick Practice</span>
                      <span className="xs:hidden">Quick</span>
                    </MagicButton>
                  </motion.div>
                </Link>
                {incompleteSession && incompleteSession.mode && incompleteSession.id ? (
                  <Link href={`/${incompleteSession.mode}/${incompleteSession.id}`}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <MagicButton variant="secondary" size="sm" className="w-full text-xs sm:text-sm py-2.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400/50">
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-blue-400" />
                        Continue
                      </MagicButton>
                    </motion.div>
                  </Link>
                ) : (
                  <Link href="/subjects">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <MagicButton variant="secondary" size="sm" className="w-full text-xs sm:text-sm py-2.5 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-pink-500/30 hover:border-pink-400/50">
                        <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-pink-400" />
                        <span className="hidden xs:inline">Challenge</span>
                        <span className="xs:hidden">Try</span>
                      </MagicButton>
                    </motion.div>
                  </Link>
                )}
                <Link href="/subjects" className="col-span-2 sm:col-span-1">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <MagicButton variant="secondary" size="sm" className="w-full text-xs sm:text-sm py-2.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-violet-500/30 hover:border-violet-400/50">
                      <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-violet-400" />
                      Explore Topics
                    </MagicButton>
                  </motion.div>
                </Link>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== SECTION 3: QUICK STATS ROW ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 100 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3"
        >
          {/* Streak Stat */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
            <MagicCard className="p-3 sm:p-4 text-center bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/40 hover:border-orange-400/70 transition-all rounded-xl sm:rounded-2xl shadow-lg hover:shadow-orange-500/20 cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent" />
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-lg shadow-orange-500/40"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </motion.div>
                </motion.div>
                <motion.p 
                  className="text-2xl sm:text-3xl font-black text-white mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {stats?.currentStreak || 0}
                </motion.p>
                <p className="text-[10px] sm:text-xs text-orange-300 font-semibold uppercase tracking-wide">Day Streak</p>
              </div>
            </MagicCard>
          </motion.div>

          {/* Questions Stat */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
            <MagicCard className="p-3 sm:p-4 text-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/40 hover:border-cyan-400/70 transition-all rounded-xl sm:rounded-2xl shadow-lg hover:shadow-cyan-500/20 cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent" />
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 150 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-lg shadow-cyan-500/40"
                >
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
                <motion.p 
                  className="text-2xl sm:text-3xl font-black text-white mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {stats?.questionsAnswered || 0}
                </motion.p>
                <p className="text-[10px] sm:text-xs text-cyan-300 font-semibold uppercase tracking-wide">Questions</p>
              </div>
            </MagicCard>
          </motion.div>

          {/* Accuracy Stat */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
            <MagicCard className="p-3 sm:p-4 text-center bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/40 hover:border-emerald-400/70 transition-all rounded-xl sm:rounded-2xl shadow-lg hover:shadow-emerald-500/20 cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent" />
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 150 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-lg shadow-emerald-500/40"
                >
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
                <motion.p 
                  className="text-2xl sm:text-3xl font-black text-white mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {Math.round(stats?.accuracy || 0)}%
                </motion.p>
                <p className="text-[10px] sm:text-xs text-emerald-300 font-semibold uppercase tracking-wide">Accuracy</p>
              </div>
            </MagicCard>
          </motion.div>

          {/* Study Time Stat */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
            <MagicCard className="p-3 sm:p-4 text-center bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-2 border-violet-500/40 hover:border-violet-400/70 transition-all rounded-xl sm:rounded-2xl shadow-lg hover:shadow-violet-500/20 cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent" />
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-2 sm:mb-2.5 shadow-lg shadow-violet-500/40"
                >
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
                <motion.p 
                  className="text-xl sm:text-2xl font-black text-white leading-tight mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  {Math.floor(weeklyStudyTimeMinutes / 60)}h {weeklyStudyTimeMinutes % 60}m
                </motion.p>
                <p className="text-[10px] sm:text-xs text-violet-300 font-semibold uppercase tracking-wide">This Week</p>
              </div>
            </MagicCard>
          </motion.div>
        </motion.div>

        {/* ========== SECTION 4: SMART RECOMMENDATIONS (Weak Areas) ========== */}
        {weakAreas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, type: 'spring', stiffness: 100 }}
          >
            <MagicCard className="relative p-4 sm:p-5 md:p-6 bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-amber-500/15 border-2 border-rose-500/40 rounded-xl sm:rounded-2xl overflow-hidden">
              {/* Animated background pulse */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-orange-500/10"
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30"
                  >
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Focus Areas</h2>
                  <MagicBadge variant="error" size="sm" className="bg-rose-500/30 border-rose-400/50 text-xs font-semibold">
                    <Zap className="w-3 h-3 mr-0.5" />
                    Boost Required
                  </MagicBadge>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 mb-3 sm:mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  Based on your performance, these topics need more attention:
                </p>
                
                <div className="space-y-2.5 sm:space-y-3">
                  {weakAreas.map((area, index) => {
                    const accuracy = Math.round(area.accuracy_percentage || 0);
                    const getUrgencyStyle = () => {
                      if (accuracy < 50) return {
                        border: 'border-rose-500/60 hover:border-rose-400',
                        bg: 'from-rose-500/20 to-red-500/20',
                        badge: 'bg-rose-500/30 border-rose-400/50 text-rose-200',
                        icon: 'text-rose-400'
                      };
                      if (accuracy < 60) return {
                        border: 'border-orange-500/60 hover:border-orange-400',
                        bg: 'from-orange-500/20 to-amber-500/20',
                        badge: 'bg-orange-500/30 border-orange-400/50 text-orange-200',
                        icon: 'text-orange-400'
                      };
                      return {
                        border: 'border-amber-500/60 hover:border-amber-400',
                        bg: 'from-amber-500/20 to-yellow-500/20',
                        badge: 'bg-amber-500/30 border-amber-400/50 text-amber-200',
                        icon: 'text-amber-400'
                      };
                    };
                    
                    const style = getUrgencyStyle();

                    return (
                      <motion.div
                        key={area.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 100 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link href={`/subjects`}>
                          <MagicCard hover className={`p-3 sm:p-4 bg-gradient-to-r ${style.bg} border-2 ${style.border} rounded-xl sm:rounded-2xl transition-all shadow-lg`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 border border-slate-600/50">
                                  {area.subject?.icon || '📚'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="font-bold text-white text-sm sm:text-base truncate">{area.subject?.name}</h3>
                                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${style.badge} border font-semibold whitespace-nowrap`}>
                                      {accuracy}%
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1">
                                    <Target className={`w-3 h-3 ${style.icon}`} />
                                    {area.questions_attempted} questions attempted
                                  </p>
                                </div>
                              </div>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
                                <MagicButton variant="primary" size="sm" className="w-full sm:w-auto text-xs sm:text-sm py-2 px-4 bg-gradient-to-r from-rose-500 to-orange-500 border-0 shadow-lg shadow-rose-500/30">
                                  <Zap className="w-3.5 h-3.5 mr-1" />
                                  Practice
                                </MagicButton>
                              </motion.div>
                            </div>
                          </MagicCard>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
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
            <MagicCard glow className="relative p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-teal-500/20 border-2 border-cyan-500/40 rounded-xl sm:rounded-2xl overflow-hidden">
              {/* Animated glow effect */}
              <motion.div 
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/40"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Continue Learning</h2>
                  <MagicBadge variant="info" size="sm" className="bg-cyan-500/30 border-cyan-400/50 text-cyan-200 ml-auto">
                    <Activity className="w-3 h-3 mr-0.5" />
                    In Progress
                  </MagicBadge>
                </div>
                
                {(() => {
                  if (!incompleteSession) return null;
                  
                  const subject = subjects?.find(s => s && s.id === incompleteSession.subject_id);
                  const questionsAnswered = incompleteSession.questions_answered || 0;
                  const totalQuestions = incompleteSession.total_questions || 0;
                  const correctAnswers = incompleteSession.correct_answers || 0;
                  const accuracy = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
                  const progressPercent = totalQuestions > 0 ? Math.min((questionsAnswered / totalQuestions) * 100, 100) : 0;

                  return (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                        <motion.div 
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl sm:text-3xl shadow-xl shadow-cyan-500/40 flex-shrink-0 border-2 border-cyan-400/30"
                          whileHover={{ rotate: [0, -5, 5, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          {subject?.icon || '📚'}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-base sm:text-lg mb-1 truncate">{subject?.name || 'Subject'}</h3>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 mb-2 flex-wrap">
                            <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded-md">
                              <Target className="w-3 h-3 text-cyan-400" />
                              Q{questionsAnswered + 1}/{totalQuestions}
                            </span>
                            <span className="flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded-md">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              {accuracy}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800/80 rounded-full h-2 sm:h-2.5 overflow-hidden shadow-inner">
                            <motion.div 
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 shadow-lg shadow-cyan-500/30"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.8, type: 'spring', stiffness: 50 }}
                            />
                          </div>
                        </div>
                      </div>
                      {incompleteSession.mode && incompleteSession.id ? (
                        <Link href={`/${incompleteSession.mode}/${incompleteSession.id}`} className="w-full sm:w-auto flex-shrink-0">
                          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <MagicButton variant="primary" size="sm" className="w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-3 px-5 sm:px-6 bg-gradient-to-r from-cyan-500 to-blue-500 border-0 shadow-lg shadow-cyan-500/40">
                              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                              Resume
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </MagicButton>
                          </motion.div>
                        </Link>
                      ) : (
                        <div className="w-full sm:w-auto flex-shrink-0">
                          <MagicButton variant="primary" size="sm" className="w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-3 px-5 sm:px-6 bg-gradient-to-r from-cyan-500 to-blue-500 border-0 shadow-lg shadow-cyan-500/40 opacity-50 cursor-not-allowed" disabled>
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                            Resume
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </MagicButton>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* ========== SECTION 6: EXPLORE SUBJECTS (Compact Grid) ========== */}
        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, type: 'spring', stiffness: 100 }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30"
                >
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </motion.div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Explore Subjects</h2>
              </div>
              <Link href="/subjects">
                <motion.div whileHover={{ scale: 1.05, x: 3 }} whileTap={{ scale: 0.95 }}>
                  <MagicButton variant="ghost" size="sm" className="text-xs sm:text-sm text-violet-400 hover:text-violet-300">
                    See All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </MagicButton>
                </motion.div>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {subjects.slice(0, 4).map((subject, index) => {
                const subjectProgress = getSubjectProgress(subject.id);
                const subjectColors = [
                  'from-cyan-500/15 to-blue-500/15 border-cyan-500/40 hover:border-cyan-400/70',
                  'from-violet-500/15 to-purple-500/15 border-violet-500/40 hover:border-violet-400/70',
                  'from-emerald-500/15 to-teal-500/15 border-emerald-500/40 hover:border-emerald-400/70',
                  'from-amber-500/15 to-orange-500/15 border-amber-500/40 hover:border-amber-400/70',
                ];
                const shadowColors = [
                  'hover:shadow-cyan-500/20',
                  'hover:shadow-violet-500/20',
                  'hover:shadow-emerald-500/20',
                  'hover:shadow-amber-500/20',
                ];
                
                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div onClick={() => {
                      router.push(`/learn/configure/${subject.id}`);
                    }}>
                      <MagicCard hover className={`p-3 sm:p-4 text-center bg-gradient-to-br ${subjectColors[index % 4]} border-2 h-full relative overflow-hidden group transition-all rounded-xl sm:rounded-2xl shadow-lg ${shadowColors[index % 4]}`}>
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10">
                          <motion.div 
                            className="text-3xl sm:text-4xl mb-2 sm:mb-3"
                            whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.3 }}
                          >
                            {subject.icon || '📚'}
                          </motion.div>
                          <h3 className="font-bold text-xs sm:text-sm text-white mb-1 line-clamp-2 leading-tight">{subject.name}</h3>
                          <p className="text-[10px] sm:text-xs text-slate-400 mb-1.5 sm:mb-2 font-medium flex items-center justify-center gap-1">
                            <FileText className="w-3 h-3" />
                            {subject.total_questions}
                          </p>
                          {subjectProgress ? (
                            <MagicBadge variant="success" size="sm" className="text-[10px] sm:text-xs bg-emerald-500/30 border-emerald-400/50">
                              <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                              {subjectProgress.accuracy}%
                            </MagicBadge>
                          ) : (
                            <MagicBadge variant="default" size="sm" className="text-[10px] sm:text-xs bg-violet-500/30 border-violet-400/50 text-violet-200">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              New
                            </MagicBadge>
                          )}
                        </div>
                      </MagicCard>
                    </div>
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
            transition={{ duration: 0.5, delay: 0.8, type: 'spring', stiffness: 100 }}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                >
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </motion.div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h2>
              </div>
              <Link href="/analytics">
                <motion.div whileHover={{ scale: 1.05, x: 3 }} whileTap={{ scale: 0.95 }}>
                  <MagicButton variant="ghost" size="sm" className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300">
                    View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </MagicButton>
                </motion.div>
              </Link>
            </div>
            
            <div className="space-y-2 sm:space-y-2.5">
              {recentSessions.slice(0, 3).map((session, index) => {
                if (!session || !session.subject_id) return null;
                
                const subject = subjects?.find(s => s && s.id === session.subject_id);
                if (!subject) return null;
                
                const modeColors = {
                  practice: 'from-cyan-500 to-blue-500',
                  test: 'from-amber-500 to-yellow-500',
                  timed: 'from-rose-500 to-pink-500',
                };
                
                const modeBorderColors = {
                  practice: 'border-cyan-500/40 hover:border-cyan-400/60',
                  test: 'border-amber-500/40 hover:border-amber-400/60',
                  timed: 'border-rose-500/40 hover:border-rose-400/60',
                };
                
                const modeBgColors = {
                  practice: 'from-cyan-500/10 to-blue-500/10',
                  test: 'from-amber-500/10 to-yellow-500/10',
                  timed: 'from-rose-500/10 to-pink-500/10',
                };
                
                const modeIcons = {
                  practice: BookOpen,
                  test: FileText,
                  timed: Timer,
                };
                
                const modeLabels = {
                  practice: 'Practice',
                  test: 'Test',
                  timed: 'Timed',
                };
                
                const ModeIcon = modeIcons[session.mode] || BookOpen;
                const isCompleted = session.status === 'completed';
                const score = session.score_percentage !== undefined && session.score_percentage !== null
                  ? session.score_percentage
                  : (session.questions_answered > 0 && session.correct_answers !== undefined
                    ? Math.round((session.correct_answers / session.questions_answered) * 100)
                    : 0);
                
                // Format date
                const getDateLabel = () => {
                  try {
                    if (!session.completed_at && !session.started_at) return 'Recently';
                    
                    const dateStr = session.completed_at || session.started_at;
                    if (!dateStr) return 'Recently';
                    
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) return 'Recently';
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    date.setHours(0, 0, 0, 0);
                    
                    if (date.getTime() === today.getTime()) return 'Today';
                    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
                    return date.toLocaleDateString();
                  } catch (e) {
                    console.warn('Error formatting date:', e);
                    return 'Recently';
                  }
                };
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1, type: 'spring', stiffness: 100 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href={isCompleted ? `/results/${session.id}` : `/${session.mode}/${session.id}`}>
                      <MagicCard hover className={`p-3 sm:p-4 bg-gradient-to-r ${modeBgColors[session.mode]} border-2 ${modeBorderColors[session.mode]} rounded-xl sm:rounded-2xl transition-all shadow-lg hover:shadow-xl`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <motion.div 
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${modeColors[session.mode]} flex items-center justify-center flex-shrink-0 shadow-lg`}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <ModeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </motion.div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50">
                                {modeLabels[session.mode]}
                              </span>
                              <span className="text-[10px] sm:text-xs text-slate-500">{getDateLabel()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-bold text-sm sm:text-base text-white truncate">{subject.name}</h3>
                              {isCompleted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 1 + index * 0.1 }}
                                >
                                  <MagicBadge 
                                    variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'} 
                                    size="sm"
                                    className={`text-xs font-bold flex-shrink-0 ${score >= 70 ? 'bg-emerald-500/30 border-emerald-400/50' : score >= 50 ? 'bg-amber-500/30 border-amber-400/50' : 'bg-red-500/30 border-red-400/50'}`}
                                  >
                                    {score >= 70 && <Medal className="w-3 h-3 mr-0.5" />}
                                    {score}%
                                  </MagicBadge>
                                </motion.div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>{session.correct_answers}/{session.questions_answered}</span>
                              </div>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500">{subject.icon || '📚'} {subject.name.split(' ')[0]}</span>
                            </div>
                          </div>
                          
                          <motion.div
                            whileHover={{ x: 3 }}
                            className="flex-shrink-0"
                          >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                          </motion.div>
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
            <MagicCard className="relative p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-indigo-950/30 to-slate-900/90 border-2 border-indigo-500/30 rounded-xl sm:rounded-2xl text-center overflow-hidden">
              {/* Animated background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              <div className="relative z-10">
                <motion.div 
                  className="text-5xl sm:text-6xl mb-4"
                  animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  🚀
                </motion.div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Ready to Begin?</h3>
                <p className="text-sm sm:text-base text-slate-300 mb-4 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Your learning journey starts here!
                </p>
                <Link href="/subjects">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <MagicButton variant="primary" size="sm" className="bg-gradient-to-r from-violet-500 to-cyan-500 border-0 shadow-lg shadow-violet-500/30">
                      <Rocket className="w-4 h-4 mr-2" />
                      Start Learning
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </MagicButton>
                  </motion.div>
                </Link>
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* Mastery Badges Section */}
        {masteryBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </motion.div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Mastery Badges</h2>
              </div>
              <Link href="/achievements">
                <motion.div whileHover={{ scale: 1.05, x: 3 }} whileTap={{ scale: 0.95 }}>
                  <MagicButton variant="ghost" size="sm" className="text-xs sm:text-sm text-violet-400 hover:text-violet-300">
                    View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </MagicButton>
                </motion.div>
              </Link>
            </div>
            <MagicCard className="p-4 sm:p-5 bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/95 border-2 border-amber-500/30">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {masteryBadges
                  .filter(b => !b.subject_id)
                  .slice(0, 5)
                  .map((badge, index) => {
                    const badgeData = badge.mastery_badge;
                    if (!badgeData) return null;

                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.95 + index * 0.1 }}
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                      >
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${badgeData.color || 'from-amber-400 to-orange-500'} flex items-center justify-center text-2xl sm:text-3xl shadow-lg`}>
                          {badgeData.icon || '🏆'}
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm font-bold text-white">{badgeData.name}</p>
                          <p className="text-[10px] text-slate-400">Level {badgeData.level}</p>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* Daily Challenges Quick View */}
        {todayDailyChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </motion.div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Daily Challenges</h2>
              </div>
              <Link href="/daily-challenge">
                <motion.div whileHover={{ scale: 1.05, x: 3 }} whileTap={{ scale: 0.95 }}>
                  <MagicButton variant="ghost" size="sm" className="text-xs sm:text-sm text-purple-400 hover:text-purple-300">
                    View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </MagicButton>
                </motion.div>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todayDailyChallenges.slice(0, 2).map((challenge, index) => {
                const completion = dailyChallengeCompletions.find(
                  c => c.daily_challenge_id === challenge.id
                );
                const isCompleted = !!completion;

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.05 + index * 0.1 }}
                  >
                    <Link href="/daily-challenge">
                      <MagicCard className="p-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
                              📚
                            </div>
                            <span className="font-semibold text-white text-sm">Daily Challenge</span>
                          </div>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <MagicBadge variant="info" size="sm" className="bg-amber-500/30 border-amber-400/50">
                              <Star className="w-3 h-3 mr-1" />
                              {challenge.question_count + 2} XP
                            </MagicBadge>
                          )}
                        </div>
                        <p className="text-xs text-purple-200 mb-2">
                          {challenge.question_count} questions • {Math.floor(challenge.time_limit_seconds / 60)} min
                        </p>
                        {isCompleted && completion && (
                          <p className="text-xs text-emerald-400 font-semibold">
                            Completed: {Math.round(completion.score_percentage || 0)}% (+{completion.xp_earned} XP)
                          </p>
                        )}
                      </MagicCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
