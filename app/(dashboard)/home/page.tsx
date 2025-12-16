'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserStats, getUserProgress, updateUserStreak, getUserProfile } from '@/lib/api';
import type { Subject, UserStats, UserProgress } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Flame,
  Target,
  Clock,
  TrendingUp,
  ChevronRight,
  Bell,
  User as UserIcon,
} from 'lucide-react';

export default function HomePage() {
  const { userId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [userName, setUserName] = useState('Student');

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
  }, [userId]);

  async function loadDashboard() {
    if (!userId) return;

    try {
      setLoading(true);

      // Update streak on page load
      await updateUserStreak(userId);

      // Fetch data in parallel
      const [userProfile, userStats, allSubjects, userProgress] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId),
        getSubjects(),
        getUserProgress(userId),
      ]);

      if (userProfile) {
        setUserName(userProfile.full_name);
      }
      setStats(userStats);
      setSubjects(allSubjects);
      setProgress(userProgress);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, {userName}! 👋
            </h1>
            <p className="text-sm text-gray-600">Ready to learn something new?</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Streak Card */}
        <Card variant="gradient" className="bg-gradient-to-br from-orange-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-8 h-8" />
                <span className="text-5xl font-bold">{stats?.currentStreak || 0}</span>
              </div>
              <p className="text-white/90 text-lg">Day Streak</p>
              <p className="text-white/75 text-sm mt-1">
                Keep it going! 🔥
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/90 text-sm">Next milestone</p>
              <p className="text-2xl font-bold">{Math.ceil(((stats?.currentStreak || 0) + 1) / 7) * 7} days</p>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.questionsAnswered || 0}</p>
                <p className="text-sm text-gray-600">Questions Answered</p>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats?.accuracy || 0)}%</p>
                <p className="text-sm text-gray-600">Accuracy Rate</p>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor((stats?.studyTimeMinutes || 0) / 60)}h {(stats?.studyTimeMinutes || 0) % 60}m
                </p>
                <p className="text-sm text-gray-600">Study Time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Continue Learning */}
        {progress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Continue Learning</h2>
              <Link href="/progress" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
              const latestProgress = progress.sort((a, b) => 
                new Date(b.last_practiced_at || 0).getTime() - new Date(a.last_practiced_at || 0).getTime()
              )[0];
              window.location.href = `/topics/${latestProgress.subject_id}`;
            }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    {subjects.find(s => s.id === progress[0].subject_id)?.name || 'Subject'}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Last practiced {new Date(progress[0].last_practiced_at || '').toLocaleDateString()}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all" 
                      style={{ width: `${progress[0].accuracy_percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress[0].questions_correct} / {progress[0].questions_attempted} correct ({Math.round(progress[0].accuracy_percentage || 0)}%)
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 ml-4" />
              </div>
            </Card>
          </div>
        )}

        {/* Subjects Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Subjects</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((subject) => (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-3">{subject.icon || '📚'}</div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">{subject.name}</h3>
                    <p className="text-xs text-gray-600">{subject.total_questions} questions</p>
                    {progress.find(p => p.subject_id === subject.id) && (
                      <Badge variant="success" size="sm" className="mt-2">
                        {Math.round(progress.find(p => p.subject_id === subject.id)?.accuracy_percentage || 0)}% accuracy
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Daily Challenge (Placeholder) */}
        <Card variant="outlined" className="border-2 border-indigo-200 bg-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h3 className="font-bold text-gray-900">Daily Challenge</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Complete today's challenge and earn bonus points!
              </p>
              <Badge variant="warning">Coming Soon</Badge>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
