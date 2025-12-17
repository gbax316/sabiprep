'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
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
  Zap,
  BookOpen,
  Timer,
  Sparkles,
  FileText,
} from 'lucide-react';

const quickActions = [
  {
    icon: Zap,
    label: 'Quick Practice',
    description: 'Random questions',
    href: '/quick-practice',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
  },
  {
    icon: Timer,
    label: '5-min Sprint',
    description: 'Quick challenge',
    href: '/timed',
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
  },
  {
    icon: Sparkles,
    label: 'Daily Challenge',
    description: 'Earn bonus XP',
    href: '/daily-challenge',
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
  },
];

const learningModes = [
  {
    icon: BookOpen,
    title: 'Practice Mode',
    description: 'Learn at your own pace with instant feedback',
    href: '/practice',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  {
    icon: FileText,
    title: 'Test Mode',
    description: 'Simulate exam conditions',
    href: '/test',
    gradient: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
  {
    icon: Clock,
    title: 'Timed Mode',
    description: 'Challenge yourself with time limits',
    href: '/timed',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-200',
  },
];

export default function HomePage() {
  const { userId, user, isLoading: authLoading } = useAuth();
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
        setUserName(userProfile.full_name || 'Student');
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <Header />

      <div className="container-app py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Welcome back, {userName.split(' ')[0]}!
            </h1>
            <p className="text-slate-500">Ready to continue learning?</p>
          </div>
        </div>

        {/* Streak Card */}
        <Card className="overflow-hidden">
          <div className="gradient-warm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="w-8 h-8" />
                  <span className="font-display text-4xl font-bold">{stats?.currentStreak || 0}</span>
                </div>
                <p className="text-white/90 font-medium">Day Streak</p>
                <p className="text-white/70 text-sm mt-1">
                  {(stats?.currentStreak || 0) > 0 ? 'Keep it going! 🔥' : 'Start your streak today!'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">Next milestone</p>
                <p className="text-2xl font-bold">{Math.ceil(((stats?.currentStreak || 0) + 1) / 7) * 7} days</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-4">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <p className="font-display text-xl font-bold text-slate-900">{stats?.questionsAnswered || 0}</p>
            <p className="text-xs text-slate-500">Questions</p>
          </Card>

          <Card className="text-center p-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="font-display text-xl font-bold text-slate-900">{Math.round(stats?.accuracy || 0)}%</p>
            <p className="text-xs text-slate-500">Accuracy</p>
          </Card>

          <Card className="text-center p-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-display text-xl font-bold text-slate-900">
              {Math.floor((stats?.studyTimeMinutes || 0) / 60)}h
            </p>
            <p className="text-xs text-slate-500">Study Time</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">Quick Start</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block"
                >
                  <Card className="text-center p-4 card-hover h-full">
                    <div className={`w-12 h-12 ${action.lightColor} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`w-6 h-6 ${action.color.replace('bg-', 'text-')}`} />
                    </div>
                    <p className="font-medium text-sm text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Learning Modes */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">Choose Your Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {learningModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.href}
                  href={mode.href}
                  className="block"
                >
                  <Card className={`card-hover h-full border-2 ${mode.borderColor} hover:shadow-lg transition-all duration-200`}>
                    <div className="p-5">
                      <div className={`w-14 h-14 ${mode.bgColor} rounded-2xl flex items-center justify-center mb-4`}>
                        <Icon className={`w-7 h-7 ${mode.iconColor}`} />
                      </div>
                      <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                        {mode.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {mode.description}
                      </p>
                      <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${mode.gradient}`} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Continue Learning */}
        {progress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-slate-900">Continue Learning</h2>
              <Link 
                href="/subjects" 
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <Card 
              className="card-hover cursor-pointer" 
              onClick={() => {
                const latestProgress = progress.sort((a, b) => 
                  new Date(b.last_practiced_at || 0).getTime() - new Date(a.last_practiced_at || 0).getTime()
                )[0];
                router.push(`/topics/${latestProgress.subject_id}`);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {subjects.find(s => s.id === progress[0].subject_id)?.name || 'Subject'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Last practiced {progress[0].last_practiced_at 
                          ? new Date(progress[0].last_practiced_at).toLocaleDateString() 
                          : 'recently'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                    <div 
                      className="bg-primary-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${progress[0].accuracy_percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {progress[0].questions_correct} / {progress[0].questions_attempted} correct
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 ml-4" />
              </div>
            </Card>
          </div>
        )}

        {/* Subjects Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-slate-900">Subjects</h2>
            <Link 
              href="/subjects" 
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjects.slice(0, 4).map((subject) => {
              const subjectProgress = progress.find(p => p.subject_id === subject.id);
              return (
                <Link key={subject.id} href={`/topics/${subject.id}`}>
                  <Card className="card-hover h-full">
                    <div className="text-center py-2">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="w-6 h-6 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 mb-1">{subject.name}</h3>
                      <p className="text-xs text-slate-500">{subject.total_questions} questions</p>
                      {subjectProgress && (
                        <Badge variant="success" size="sm" className="mt-2">
                          {Math.round(subjectProgress.accuracy_percentage || 0)}%
                        </Badge>
                      )}
                    </div>
                  </Card>
                </Link>
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
