'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { getUserAchievements, getUserStats } from '@/lib/api';
import type { UserAchievement, UserStats } from '@/types/database';
import {
  Trophy,
  Star,
  Flame,
  Target,
  BookOpen,
  Clock,
  Zap,
  Award,
  Medal,
  Crown,
  Lock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

// Achievement type definition
type AchievementItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requirement: number;
  type: string;
};

// Helper function to get achievement card styles
const getAchievementCardStyles = (achievement: AchievementItem, earned: boolean) => {
  if (!earned) {
    return {
      bg: 'bg-gradient-to-br from-slate-800/50 to-slate-700/50',
      border: 'border-slate-700/40 hover:border-slate-600/70',
      shadow: 'hover:shadow-slate-500/20',
    };
  }

  // Map achievement colors to proper Tailwind classes
  const colorMap: Record<string, { bg: string; border: string; shadow: string }> = {
    'from-amber-400 to-orange-500': {
      bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/40 hover:border-amber-400/70',
      shadow: 'hover:shadow-amber-500/20',
    },
    'from-blue-400 to-cyan-500': {
      bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/40 hover:border-blue-400/70',
      shadow: 'hover:shadow-blue-500/20',
    },
    'from-emerald-400 to-teal-500': {
      bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/40 hover:border-emerald-400/70',
      shadow: 'hover:shadow-emerald-500/20',
    },
    'from-purple-400 to-pink-500': {
      bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/40 hover:border-purple-400/70',
      shadow: 'hover:shadow-purple-500/20',
    },
    'from-orange-400 to-red-500': {
      bg: 'bg-gradient-to-br from-orange-500/20 to-red-500/20',
      border: 'border-orange-500/40 hover:border-orange-400/70',
      shadow: 'hover:shadow-orange-500/20',
    },
    'from-yellow-400 to-amber-500': {
      bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
      border: 'border-yellow-500/40 hover:border-yellow-400/70',
      shadow: 'hover:shadow-yellow-500/20',
    },
    'from-indigo-400 to-purple-500': {
      bg: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
      border: 'border-indigo-500/40 hover:border-indigo-400/70',
      shadow: 'hover:shadow-indigo-500/20',
    },
    'from-rose-400 to-pink-500': {
      bg: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20',
      border: 'border-rose-500/40 hover:border-rose-400/70',
      shadow: 'hover:shadow-rose-500/20',
    },
    'from-cyan-400 to-blue-500': {
      bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/40 hover:border-cyan-400/70',
      shadow: 'hover:shadow-cyan-500/20',
    },
    'from-slate-400 to-slate-600': {
      bg: 'bg-gradient-to-br from-slate-500/20 to-slate-600/20',
      border: 'border-slate-500/40 hover:border-slate-400/70',
      shadow: 'hover:shadow-slate-500/20',
    },
    'from-teal-400 to-emerald-500': {
      bg: 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20',
      border: 'border-teal-500/40 hover:border-teal-400/70',
      shadow: 'hover:shadow-teal-500/20',
    },
    'from-green-400 to-emerald-500': {
      bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/40 hover:border-green-400/70',
      shadow: 'hover:shadow-green-500/20',
    },
  };

  return colorMap[achievement.color] || {
    bg: 'bg-gradient-to-br from-slate-800/50 to-slate-700/50',
    border: 'border-slate-700/40 hover:border-slate-600/70',
    shadow: 'hover:shadow-slate-500/20',
  };
};

// Helper function to get shadow color for icon container
const getAchievementIconShadow = (achievement: AchievementItem) => {
  const shadowMap: Record<string, string> = {
    'from-amber-400 to-orange-500': 'shadow-amber-500/40',
    'from-blue-400 to-cyan-500': 'shadow-blue-500/40',
    'from-emerald-400 to-teal-500': 'shadow-emerald-500/40',
    'from-purple-400 to-pink-500': 'shadow-purple-500/40',
    'from-orange-400 to-red-500': 'shadow-orange-500/40',
    'from-yellow-400 to-amber-500': 'shadow-yellow-500/40',
    'from-indigo-400 to-purple-500': 'shadow-indigo-500/40',
    'from-rose-400 to-pink-500': 'shadow-rose-500/40',
    'from-cyan-400 to-blue-500': 'shadow-cyan-500/40',
    'from-slate-400 to-slate-600': 'shadow-slate-500/40',
    'from-teal-400 to-emerald-500': 'shadow-teal-500/40',
    'from-green-400 to-emerald-500': 'shadow-green-500/40',
  };
  return shadowMap[achievement.color] || 'shadow-slate-500/40';
};

// Achievement definitions
const allAchievements = [
  {
    id: 'first_question',
    name: 'First Steps',
    description: 'Answer your first question',
    icon: Star,
    color: 'from-amber-400 to-orange-500',
    requirement: 1,
    type: 'questions',
  },
  {
    id: 'ten_questions',
    name: 'Getting Started',
    description: 'Answer 10 questions',
    icon: Target,
    color: 'from-blue-400 to-cyan-500',
    requirement: 10,
    type: 'questions',
  },
  {
    id: 'fifty_questions',
    name: 'Dedicated Learner',
    description: 'Answer 50 questions',
    icon: BookOpen,
    color: 'from-emerald-400 to-teal-500',
    requirement: 50,
    type: 'questions',
  },
  {
    id: 'hundred_questions',
    name: 'Century Club',
    description: 'Answer 100 questions',
    icon: Trophy,
    color: 'from-purple-400 to-pink-500',
    requirement: 100,
    type: 'questions',
  },
  {
    id: 'three_day_streak',
    name: 'On Fire',
    description: 'Maintain a 3-day streak',
    icon: Flame,
    color: 'from-orange-400 to-red-500',
    requirement: 3,
    type: 'streak',
  },
  {
    id: 'seven_day_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: Zap,
    color: 'from-yellow-400 to-amber-500',
    requirement: 7,
    type: 'streak',
  },
  {
    id: 'thirty_day_streak',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: Crown,
    color: 'from-indigo-400 to-purple-500',
    requirement: 30,
    type: 'streak',
  },
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Get 100% on a test',
    icon: Medal,
    color: 'from-rose-400 to-pink-500',
    requirement: 1,
    type: 'perfect',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a timed session with 90%+ accuracy',
    icon: Clock,
    color: 'from-cyan-400 to-blue-500',
    requirement: 1,
    type: 'speed',
  },
  {
    id: 'study_hour',
    name: 'Study Hour',
    description: 'Study for 60 minutes total',
    icon: Clock,
    color: 'from-slate-400 to-slate-600',
    requirement: 60,
    type: 'time',
  },
  {
    id: 'five_subjects',
    name: 'Well Rounded',
    description: 'Practice 5 different subjects',
    icon: Award,
    color: 'from-teal-400 to-emerald-500',
    requirement: 5,
    type: 'subjects',
  },
  {
    id: 'accuracy_master',
    name: 'Accuracy Master',
    description: 'Achieve 80% overall accuracy',
    icon: Target,
    color: 'from-green-400 to-emerald-500',
    requirement: 80,
    type: 'accuracy',
  },
];

export default function AchievementsPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  async function loadAchievements() {
    if (!userId) return;

    try {
      setLoading(true);
      const [achievements, userStats] = await Promise.all([
        getUserAchievements(userId),
        getUserStats(userId),
      ]);
      setEarnedAchievements(achievements);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  const getProgress = (achievement: AchievementItem) => {
    if (!stats) return 0;

    switch (achievement.type) {
      case 'questions':
        return Math.min((stats.questionsAnswered / achievement.requirement) * 100, 100);
      case 'streak':
        return Math.min((stats.currentStreak / achievement.requirement) * 100, 100);
      case 'accuracy':
        return Math.min((stats.accuracy / achievement.requirement) * 100, 100);
      case 'time':
        return Math.min((stats.studyTimeMinutes / achievement.requirement) * 100, 100);
      default:
        return 0;
    }
  };

  const isEarned = (achievementId: string) => {
    return earnedAchievements.some(a => a.achievement_id === achievementId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading achievements...</p>
        </div>
      </div>
    );
  }

  const earnedCount = allAchievements.filter(a => isEarned(a.id)).length;
  const progressPercent = (earnedCount / allAchievements.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 sm:pb-24 overflow-x-hidden">
      <Header title="Achievements" showBack />

      <div className="container-app space-y-4 sm:space-y-5 pt-4 sm:pt-6 px-3 sm:px-4">
        {/* Summary Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-600/20 to-amber-500/30 border border-amber-500/40 p-4 sm:p-6 md:p-8"
        >
          {/* Animated background with multiple layers */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-orange-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />
          
          {/* Floating animated orbs */}
          <motion.div 
            className="absolute top-4 right-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/30 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-4 left-4 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-500/20 blur-xl"
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

          <div className="relative z-10 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg shadow-amber-500/40"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-tight"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {earnedCount} / {allAchievements.length}
            </motion.h2>
            <motion.p 
              className="text-sm sm:text-base text-amber-200/90 mb-4 sm:mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Achievements Unlocked
            </motion.p>
            
            {/* Progress bar */}
            <div className="w-full max-w-md mx-auto">
              <div className="w-full bg-slate-800/80 rounded-full h-3 sm:h-4 overflow-hidden shadow-inner">
                <motion.div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-lg shadow-amber-500/30"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, type: 'spring', stiffness: 50, delay: 0.5 }}
                />
              </div>
              <motion.p 
                className="text-xs sm:text-sm text-amber-200/80 mt-2 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {Math.round(progressPercent)}% Complete
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* Stats Overview */}
        {stats && (
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
                    {stats.currentStreak || 0}
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
                    {stats.questionsAnswered || 0}
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
                    {Math.round(stats.accuracy || 0)}%
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
                    {Math.floor((stats.studyTimeMinutes || 0) / 60)}h {(stats.studyTimeMinutes || 0) % 60}m
                  </motion.p>
                  <p className="text-[10px] sm:text-xs text-violet-300 font-semibold uppercase tracking-wide">Total Time</p>
                </div>
              </MagicCard>
            </motion.div>
          </motion.div>
        )}

        {/* Achievements Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, type: 'spring', stiffness: 100 }}
        >
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </motion.div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              All Achievements
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {allAchievements.map((achievement, index) => {
                const Icon = achievement.icon;
                const earned = isEarned(achievement.id);
                const progress = getProgress(achievement);
                const cardStyles = getAchievementCardStyles(achievement, earned);
                const iconShadow = getAchievementIconShadow(achievement);

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: earned ? 1 : 0.7, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MagicCard className={`relative overflow-hidden ${cardStyles.bg} border-2 ${cardStyles.border} transition-all rounded-xl sm:rounded-2xl shadow-lg ${cardStyles.shadow} h-full`}>
                      {/* Subtle glow effect for earned */}
                      {earned && (
                        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                      )}
                      
                      <div className="relative z-10 text-center py-4 sm:py-5 px-2">
                        {/* Badge icon */}
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.7 + index * 0.05, type: 'spring', stiffness: 150 }}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4 flex items-center justify-center ${
                            earned 
                              ? `bg-gradient-to-br ${achievement.color} shadow-lg ${iconShadow}` 
                              : 'bg-slate-700/60 border-2 border-slate-600/50'
                          }`}
                        >
                          {earned ? (
                            <motion.div
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                            >
                              <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                            </motion.div>
                          ) : (
                            <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
                          )}
                        </motion.div>
                        
                        <h3 className={`font-bold text-sm sm:text-base mb-1.5 ${
                          earned ? 'text-white' : 'text-slate-300'
                        }`}>
                          {achievement.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 min-h-[32px] flex items-center justify-center">
                          {achievement.description}
                        </p>

                        {/* Progress bar for unearned */}
                        {!earned && progress > 0 && (
                          <div className="px-2">
                            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden shadow-inner">
                              <motion.div 
                                className={`h-2 rounded-full bg-gradient-to-r ${achievement.color} shadow-lg`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ duration: 0.8, type: 'spring', stiffness: 50, delay: 0.8 + index * 0.05 }}
                              />
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 font-medium">
                              {progress >= 100 ? 'Ready to unlock!' : `${Math.round(progress)}%`}
                            </p>
                          </div>
                        )}

                        {/* Earned badge */}
                        {earned && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.9 + index * 0.05, type: 'spring', stiffness: 150 }}
                          >
                            <MagicBadge variant="success" size="sm" className="bg-emerald-500/30 border-emerald-400/50 text-emerald-200">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Unlocked!
                            </MagicBadge>
                          </motion.div>
                        )}
                      </div>
                    </MagicCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
