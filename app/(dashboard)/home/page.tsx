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
  Award,
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
      return 'Start your learning journey today!';
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
            <span className="text-white">Master Your </span>
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Learning Journey
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

        {/* Stats Bento Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <BentoGrid columns={3} gap="md">
            <StatCard
              title="Current Streak"
              value={stats?.currentStreak || 0}
              icon={<Flame className="w-6 h-6" />}
              trend={stats?.currentStreak && stats.currentStreak > 0 ? 'up' : undefined}
              trendValue={stats?.currentStreak && stats.currentStreak > 0 ? `${stats.currentStreak} days` : undefined}
            />
            <StatCard
              title="Questions Answered"
              value={stats?.questionsAnswered || 0}
              icon={<Target className="w-6 h-6" />}
              trend="up"
              trendValue="+12 today"
            />
            <StatCard
              title="Accuracy Rate"
              value={`${Math.round(stats?.accuracy || 0)}%`}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={stats?.accuracy && stats.accuracy >= 70 ? 'up' : 'down'}
              trendValue={stats?.accuracy ? `${Math.round(stats.accuracy)}%` : '0%'}
            />
          </BentoGrid>
        </motion.div>

        {/* Study Time Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <MagicCard className="p-6 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-white">
                    {Math.floor((stats?.studyTimeMinutes || 0) / 60)}h {(stats?.studyTimeMinutes || 0) % 60}m
                  </p>
                  <p className="text-sm text-slate-400">Study Time This Week</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Goal</p>
                <p className="text-2xl font-bold text-white">10h</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/50"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((stats?.studyTimeMinutes || 0) / 60 / 10) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </MagicCard>
        </motion.div>

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

        {/* Recent Activity */}
        {progress.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
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
                    key={prog.subject_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 1.0 + index * 0.1 }}
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
