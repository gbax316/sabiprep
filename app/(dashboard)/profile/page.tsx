'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, getUserStats, getUserAchievements } from '@/lib/api';
import type { User, UserStats, UserAchievement } from '@/types/database';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Award,
  Settings,
  History,
  Target,
  Trophy,
  LogOut,
  ChevronRight,
  Edit,
} from 'lucide-react';

export default function ProfilePage() {
  const { userId, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 pb-24">
        <p>User not found</p>
        <BottomNav />
      </div>
    );
  }

  const menuItems = [
    { icon: <Edit className="w-5 h-5" />, label: 'Edit Profile', href: '/profile/edit', badge: null },
    { icon: <Target className="w-5 h-5" />, label: 'My Goals', href: '/profile/goals', badge: 'Coming Soon' },
    { icon: <Trophy className="w-5 h-5" />, label: 'Achievements', href: '/profile/achievements', badge: `${achievements.length}` },
    { icon: <History className="w-5 h-5" />, label: 'Study History', href: '/profile/history', badge: null },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/profile/settings', badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-600">Manage your account and preferences</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card variant="elevated">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.full_name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              {user.grade && (
                <Badge variant="info">{user.grade}</Badge>
              )}
            </div>
          </div>

          {/* Joined Date */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-2xl mb-1">🎯</div>
            <p className="text-2xl font-bold text-gray-900">{stats?.questionsAnswered || 0}</p>
            <p className="text-xs text-gray-600">Questions</p>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-2xl font-bold text-gray-900">{Math.round(stats?.accuracy || 0)}%</p>
            <p className="text-xs text-gray-600">Accuracy</p>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">🔥</div>
            <p className="text-2xl font-bold text-gray-900">{stats?.currentStreak || 0}</p>
            <p className="text-xs text-gray-600">Day Streak</p>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-2xl font-bold text-gray-900">{achievements.length}</p>
            <p className="text-xs text-gray-600">Achievements</p>
          </Card>
        </div>

        {/* Menu Items */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Account</h2>
          <Card className="divide-y divide-gray-100">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (item.badge === 'Coming Soon') {
                    alert('This feature is coming soon!');
                  } else {
                    router.push(item.href);
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-600">{item.icon}</div>
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge variant={item.badge === 'Coming Soon' ? 'warning' : 'info'} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<History className="w-5 h-5" />}
              onClick={() => router.push('/profile/history')}
            >
              View History
            </Button>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Award className="w-5 h-5" />}
              onClick={() => router.push('/profile/achievements')}
            >
              Achievements
            </Button>
          </div>
        </div>

        {/* Achievements Preview */}
        {achievements.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Recent Achievements</h3>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-3xl">{achievement.achievement?.icon || '🏆'}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">
                    {achievement.achievement?.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(achievement.earned_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Subscription Card (Placeholder) */}
        <Card variant="gradient" className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Free Plan</h3>
              <p className="text-white/90 text-sm mb-3">
                Upgrade to Premium for unlimited access
              </p>
              <Badge variant="warning" className="bg-yellow-500 text-white border-0">
                Coming Soon
              </Badge>
            </div>
            <div className="text-5xl">👑</div>
          </div>
        </Card>

        {/* Logout Button */}
        <Button
          variant="danger"
          size="full"
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={handleLogout}
        >
          Logout
        </Button>

        {/* App Info */}
        <Card variant="outlined" className="bg-gray-50">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">SABIPREP v1.0.0</p>
            <p className="text-xs text-gray-500">
              Made with ❤️ for Nigerian students
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
