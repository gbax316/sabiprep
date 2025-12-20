'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/common/BottomNav';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { ProgressRing } from '@/components/magic/ProgressRing';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, getUserStats, getUserAchievements, getUserGoals, setUserGoal } from '@/lib/api';
import type { User, UserStats, UserAchievement, UserGoal } from '@/types/database';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Award,
  Settings,
  Target,
  LogOut,
  ChevronRight,
  Camera,
  Clock,
  Flame,
  BookOpen,
  Zap,
  TrendingUp,
  Bell,
  Lock,
  Trophy,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import { getSystemWideQuestionCount } from '@/lib/guest-session';

export default function ProfilePage() {
  const { userId, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [dailyGoal, setDailyGoal] = useState(20);
  const [weeklyStudyGoal, setWeeklyStudyGoal] = useState(600); // minutes
  const [weeklyQuestionsGoal, setWeeklyQuestionsGoal] = useState(50);
  const [notifications, setNotifications] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  async function loadProfile() {
    if (!userId) return;

    try {
      setLoading(true);
      
      const [userData, userStats, userAchievements, goals] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId),
        getUserAchievements(userId),
        getUserGoals(userId),
      ]);

      setUser(userData);
      setStats(userStats);
      setAchievements(userAchievements);
      setUserGoals(goals);

      // Set goal values from existing goals
      const studyGoal = goals.find(g => g.goal_type === 'weekly_study_time');
      const questionsGoal = goals.find(g => g.goal_type === 'weekly_questions');
      const dailyQuestionsGoal = goals.find(g => g.goal_type === 'daily_questions');
      
      if (studyGoal) setWeeklyStudyGoal(studyGoal.target_value);
      if (questionsGoal) setWeeklyQuestionsGoal(questionsGoal.target_value);
      if (dailyQuestionsGoal) setDailyGoal(dailyQuestionsGoal.target_value);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      await signOut();
    }
  }

  async function handleSaveGoals() {
    if (!userId) return;

    try {
      setSavingGoals(true);
      await Promise.all([
        setUserGoal(userId, 'weekly_study_time', weeklyStudyGoal),
        setUserGoal(userId, 'weekly_questions', weeklyQuestionsGoal),
        setUserGoal(userId, 'daily_questions', dailyGoal),
      ]);
      
      // Reload goals
      const goals = await getUserGoals(userId);
      setUserGoals(goals);
      alert('Goals saved successfully!');
    } catch (error) {
      console.error('Error saving goals:', error);
      alert('Failed to save goals. Please try again.');
    } finally {
      setSavingGoals(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 pb-24">
        <p className="text-slate-400">User not found</p>
        <BottomNav />
      </div>
    );
  }

  const userInitials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Get top achievements (unlocked first, then by relevance)
  const topAchievements = [
    { id: 1, name: 'First Steps', description: 'Complete 10 questions', icon: '🎯', unlocked: true },
    { id: 2, name: 'Week Warrior', description: '7 day streak', icon: '🔥', unlocked: stats && stats.currentStreak >= 7 },
    { id: 3, name: 'Century Club', description: '100 questions', icon: '💯', unlocked: stats && stats.questionsAnswered >= 100 },
    { id: 4, name: 'Perfect Score', description: '100% accuracy', icon: '⭐', unlocked: stats && stats.accuracy >= 100 },
  ].filter(a => a.unlocked).slice(0, 4);

  // Calculate goal progress
  const dailyGoalProgress = userGoals.find(g => g.goal_type === 'daily_questions');
  const weeklyQuestionsProgress = userGoals.find(g => g.goal_type === 'weekly_questions');
  const weeklyStudyProgress = userGoals.find(g => g.goal_type === 'weekly_study_time');

  const dailyProgress = dailyGoalProgress 
    ? Math.min((dailyGoalProgress.current_value / dailyGoal) * 100, 100)
    : 0;
  const weeklyQuestionsProgressPercent = weeklyQuestionsProgress
    ? Math.min((weeklyQuestionsProgress.current_value / weeklyQuestionsGoal) * 100, 100)
    : 0;
  const weeklyStudyProgressPercent = weeklyStudyProgress
    ? Math.min((weeklyStudyProgress.current_value / weeklyStudyGoal) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h1 className="font-display text-3xl font-black text-white">Profile</h1>
              <p className="text-slate-400">Your learning journey</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ========== PROFILE HEADER ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MagicCard glow className="p-6 space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="relative flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-violet-500/50 shadow-lg shadow-violet-500/50"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-cyan-500/50">
                    {userInitials}
                  </div>
                )}
                <button 
                  className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
                  onClick={() => router.push('/profile/edit')}
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                </button>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent truncate">
                      {user.full_name}
                    </h1>
                    <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                  <MagicButton 
                    variant="secondary" 
                    size="sm"
                    onClick={() => router.push('/profile/edit')}
                    className="flex-shrink-0"
                  >
                    Edit
                  </MagicButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.grade && (
                    <MagicBadge variant="primary" className="text-xs">
                      {user.grade}
                    </MagicBadge>
                  )}
                  <MagicBadge variant="success" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {joinDate}
                  </MagicBadge>
                </div>
              </div>
            </div>
            
            {/* Quick Stats - Core Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-cyan-400">{stats?.questionsAnswered || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-violet-400">{Math.round(stats?.accuracy || 0)}%</div>
                <div className="text-xs text-slate-500 mt-1">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5" />
                  {stats?.currentStreak || 0}
                </div>
                <div className="text-xs text-slate-500 mt-1">Day Streak</div>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== LEARNING GOALS ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <MagicCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Target className="w-5 h-5 text-cyan-400" />
                Learning Goals
              </h2>
            </div>

            <div className="space-y-6">
              {/* Daily Questions Goal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Daily Questions
                  </label>
                  {dailyGoalProgress && (
                    <span className="text-xs text-slate-400">
                      {dailyGoalProgress.current_value} / {dailyGoal}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {[10, 20, 30, 50].map((goal) => (
                    <button
                      key={goal}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        dailyGoal === goal
                          ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                      onClick={() => setDailyGoal(goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                {dailyGoalProgress && (
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${dailyProgress}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                )}
              </div>

              {/* Weekly Questions Goal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Weekly Questions
                  </label>
                  {weeklyQuestionsProgress && (
                    <span className="text-xs text-slate-400">
                      {weeklyQuestionsProgress.current_value} / {weeklyQuestionsGoal}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={weeklyQuestionsGoal}
                    onChange={(e) => setWeeklyQuestionsGoal(parseInt(e.target.value) || 50)}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-400">questions/week</span>
                </div>
                {weeklyQuestionsProgress && (
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${weeklyQuestionsProgressPercent}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                )}
              </div>

              {/* Weekly Study Time Goal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Weekly Study Time
                  </label>
                  {weeklyStudyProgress && (
                    <span className="text-xs text-slate-400">
                      {Math.floor(weeklyStudyProgress.current_value / 60)}h / {Math.floor(weeklyStudyGoal / 60)}h
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={Math.floor(weeklyStudyGoal / 60)}
                    onChange={(e) => setWeeklyStudyGoal(parseInt(e.target.value) * 60 || 600)}
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-400">hours/week</span>
                </div>
                {weeklyStudyProgress && (
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${weeklyStudyProgressPercent}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                )}
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-white/5">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white text-sm">Daily Reminders</div>
                    <div className="text-xs text-slate-500">Get notified to practice</div>
                  </div>
                </div>
                <button
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-slate-700'
                  }`}
                  onClick={() => setNotifications(!notifications)}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <MagicButton
                variant="primary"
                onClick={handleSaveGoals}
                disabled={savingGoals}
                className="w-full"
              >
                {savingGoals ? 'Saving...' : 'Save Goals'}
              </MagicButton>
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== TOP ACHIEVEMENTS ========== */}
        {topAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <MagicCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                  <Award className="w-5 h-5 text-cyan-400" />
                  Achievements
                </h2>
                {achievements.length > 4 && (
                  <MagicButton variant="ghost" size="sm" onClick={() => router.push('/profile/achievements')}>
                    View All →
                  </MagicButton>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {topAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 rounded-xl text-center space-y-2 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/50">
                      {achievement.icon}
                    </div>
                    <div className="text-sm font-medium text-white">{achievement.name}</div>
                    <div className="text-xs text-slate-400">{achievement.description}</div>
                  </motion.div>
                ))}
              </div>
            </MagicCard>
          </motion.div>
        )}

        {/* ========== ACCOUNT SETTINGS ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <MagicCard className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Account Settings</h2>
            
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/profile/edit')}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Edit Profile</div>
                    <div className="text-xs text-slate-500">Update your personal information</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button 
                onClick={() => router.push('/profile/settings')}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Preferences</div>
                    <div className="text-xs text-slate-500">Customize your experience</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
              
              <button 
                onClick={() => router.push('/profile/change-password')}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Change Password</div>
                    <div className="text-xs text-slate-500">Update your password</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </MagicCard>
        </motion.div>

        {/* ========== SIGN OUT ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/20 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium text-red-400">Sign Out</div>
                <div className="text-xs text-red-400/70">Sign out of your account</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </button>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Signup Prompt Modal for Guests */}
      {isGuest && (
        <SignupPromptModal
          isOpen={showSignupModal}
          onClose={() => {
            setShowSignupModal(false);
            router.push('/subjects');
          }}
          questionCount={getSystemWideQuestionCount()}
        />
      )}
    </div>
  );
}
