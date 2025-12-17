'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/common/BottomNav';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { StatCard } from '@/components/magic/StatCard';
import { BentoGrid } from '@/components/magic/BentoGrid';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, getUserStats, getUserAchievements } from '@/lib/api';
import type { User, UserStats, UserAchievement } from '@/types/database';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Award,
  Settings,
  Target,
  Trophy,
  LogOut,
  ChevronRight,
  Camera,
  Clock,
  Flame,
  TrendingUp,
  Bell,
  Lock,
  Zap,
  Star,
  BookOpen,
} from 'lucide-react';

export default function ProfilePage() {
  const { userId, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [dailyGoal, setDailyGoal] = useState(20);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  async function loadProfile() {
    if (!userId) return;

    try {
      setLoading(true);
      
      const [userData, userStats, userAchievements] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId),
        getUserAchievements(userId),
      ]);

      setUser(userData);
      setStats(userStats);
      setAchievements(userAchievements);
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

  // Mock achievements data with icons
  const achievementsList = [
    { id: 1, name: 'First Steps', description: 'Complete 10 questions', icon: '🎯', unlocked: true },
    { id: 2, name: 'Week Warrior', description: '7 day streak', icon: '🔥', unlocked: true },
    { id: 3, name: 'Century Club', description: '100 questions answered', icon: '💯', unlocked: stats && stats.questionsAnswered >= 100 },
    { id: 4, name: 'Perfect Score', description: 'Get 100% in a test', icon: '⭐', unlocked: false },
    { id: 5, name: 'Speed Demon', description: 'Complete timed mode', icon: '⚡', unlocked: false },
    { id: 6, name: 'Subject Master', description: 'Master a subject', icon: '🏆', unlocked: false },
    { id: 7, name: 'Early Bird', description: 'Study before 8am', icon: '🌅', unlocked: false },
    { id: 8, name: 'Night Owl', description: 'Study after 10pm', icon: '🦉', unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="backdrop-blur-xl bg-slate-950/80 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="font-display text-3xl font-black text-white">Profile</h1>
          <p className="text-slate-400">Manage your account and preferences</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <MagicCard glow className="p-6 space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-6">
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-violet-500/50 shadow-lg shadow-violet-500/50"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-cyan-500/50">
                  {userInitials}
                </div>
              )}
              <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Camera className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {user.full_name}
              </h1>
              <p className="text-slate-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
              <div className="flex gap-2">
                {user.grade && (
                  <MagicBadge variant="primary">
                    {user.grade}
                  </MagicBadge>
                )}
                <MagicBadge variant="success">
                  Member since {joinDate}
                </MagicBadge>
              </div>
            </div>
            
            <MagicButton variant="secondary" size="sm">
              Edit Profile
            </MagicButton>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats?.questionsAnswered || 0}</div>
              <div className="text-xs text-slate-500">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-400">{Math.round(stats?.accuracy || 0)}%</div>
              <div className="text-xs text-slate-500">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats?.currentStreak || 0}</div>
              <div className="text-xs text-slate-500">Day Streak</div>
            </div>
          </div>
        </MagicCard>

        {/* Stats Bento Grid */}
        <BentoGrid columns={3} gap="md">
          <StatCard
            title="Total Study Time"
            value={`${Math.floor((stats?.studyTimeMinutes || 0) / 60)}h`}
            icon={<Clock className="w-6 h-6" />}
            trend="up"
            trendValue="+5h this week"
          />
          
          <StatCard
            title="Achievements"
            value={achievementsList.filter(a => a.unlocked).length}
            icon={<Award className="w-6 h-6" />}
          />
          
          <StatCard
            title="Rank"
            value="#42"
            icon={<Trophy className="w-6 h-6" />}
            trend="up"
            trendValue="+3 positions"
          />
        </BentoGrid>

        {/* Learning Preferences Card */}
        <MagicCard className="p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
            <Settings className="w-5 h-5" />
            Learning Preferences
          </h2>
          
          <div className="space-y-4">
            {/* Daily Goal */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Daily Question Goal</span>
                <span className="font-medium text-white">{dailyGoal} questions</span>
              </div>
              <div className="flex gap-2">
                {[10, 20, 30, 50].map((goal) => (
                  <button
                    key={goal}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      dailyGoal === goal
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                    onClick={() => setDailyGoal(goal)}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Notifications Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-medium text-white">Daily Reminders</div>
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
          </div>
        </MagicCard>

        {/* Achievements Section */}
        <MagicCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Award className="w-5 h-5" />
              Achievements
            </h2>
            <MagicButton variant="ghost" size="sm">
              View All →
            </MagicButton>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievementsList.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl text-center space-y-2 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30'
                    : 'bg-slate-900/50 border border-white/5 opacity-50'
                }`}
              >
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-2xl ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/50'
                    : 'bg-slate-800'
                }`}>
                  {achievement.icon}
                </div>
                <div className="text-sm font-medium text-white">{achievement.name}</div>
                <div className="text-xs text-slate-500">{achievement.description}</div>
              </motion.div>
            ))}
          </div>
        </MagicCard>

        {/* Account Settings Card */}
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

        {/* Sign Out Button */}
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

        {/* App Info */}
        <MagicCard className="p-4 bg-slate-900/30">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">SABIPREP v1.0.0</p>
            <p className="text-xs text-slate-600">
              Made with ❤️ for Nigerian students
            </p>
          </div>
        </MagicCard>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
