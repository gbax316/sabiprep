'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Star, ChevronRight, X } from 'lucide-react';
import { MagicCard } from '@/components/magic/MagicCard';
import type { Achievement, UserAchievement } from '@/types/database';

interface AchievementCardProps {
  achievement: Achievement;
  earned?: boolean;
  earnedAt?: string;
  progress?: number;
  onClick?: () => void;
}

// Achievement type configuration
const ACHIEVEMENT_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  questions_answered: { 
    color: 'text-cyan-400', 
    bgColor: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30'
  },
  streak: { 
    color: 'text-orange-400', 
    bgColor: 'from-orange-500/20 to-amber-500/20',
    borderColor: 'border-orange-500/30'
  },
  accuracy: { 
    color: 'text-emerald-400', 
    bgColor: 'from-emerald-500/20 to-green-500/20',
    borderColor: 'border-emerald-500/30'
  },
  daily_challenge: { 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30'
  },
};

export function AchievementCard({
  achievement,
  earned = false,
  earnedAt,
  progress = 0,
  onClick,
}: AchievementCardProps) {
  const config = ACHIEVEMENT_CONFIG[achievement.requirement_type] || ACHIEVEMENT_CONFIG.questions_answered;

  return (
    <motion.div
      className={`
        relative p-4 rounded-xl border
        bg-gradient-to-br ${config.bgColor} ${config.borderColor}
        ${earned ? 'opacity-100' : 'opacity-50'}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-300
      `}
      whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
    >
      {/* Shimmer effect for recently earned */}
      {earned && earnedAt && isRecent(earnedAt) && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
          ${earned 
            ? 'bg-gradient-to-br from-white/10 to-white/5' 
            : 'bg-slate-800/50'}
        `}>
          {earned ? (
            <span>{achievement.icon || '🏆'}</span>
          ) : (
            <Lock className="w-5 h-5 text-slate-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${earned ? 'text-white' : 'text-slate-400'} truncate`}>
            {achievement.name}
          </h4>
          <p className="text-xs text-slate-400 truncate">
            {achievement.description}
          </p>
          
          {/* Progress bar for unearned */}
          {!earned && progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${config.bgColor.replace('/20', '/60')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {progress >= 100 ? 'Ready to unlock!' : `${Math.round(progress)}% complete`}
              </p>
            </div>
          )}
          
          {/* Earned date */}
          {earned && earnedAt && (
            <p className="text-xs text-slate-500 mt-1">
              Earned {formatDate(earnedAt)}
            </p>
          )}
        </div>

        {/* Star indicator */}
        {earned && (
          <Star className={`w-5 h-5 ${config.color} fill-current`} />
        )}
      </div>
    </motion.div>
  );
}

function isRecent(dateStr: string): boolean {
  const earned = new Date(dateStr);
  const now = new Date();
  const diffHours = (now.getTime() - earned.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface AchievementShowcaseProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  currentStats?: {
    questionsAnswered: number;
    currentStreak: number;
    accuracy: number;
  };
  maxDisplay?: number;
  showUnearned?: boolean;
  title?: string;
}

export function AchievementShowcase({
  achievements,
  userAchievements,
  currentStats,
  maxDisplay = 6,
  showUnearned = true,
  title = 'Achievements',
}: AchievementShowcaseProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  // Sort: earned first (by date), then unearned (by progress)
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aEarned = earnedIds.has(a.id);
    const bEarned = earnedIds.has(b.id);

    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;

    if (aEarned && bEarned) {
      const aDate = userAchievements.find(ua => ua.achievement_id === a.id)?.earned_at;
      const bDate = userAchievements.find(ua => ua.achievement_id === b.id)?.earned_at;
      if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime();
    }

    // For unearned, sort by progress (closest to completion first)
    const aProgress = getProgress(a, currentStats);
    const bProgress = getProgress(b, currentStats);
    return bProgress - aProgress;
  });

  const displayedAchievements = showUnearned
    ? sortedAchievements
    : sortedAchievements.filter(a => earnedIds.has(a.id));

  const visibleAchievements = showAll
    ? displayedAchievements
    : displayedAchievements.slice(0, maxDisplay);

  const earnedCount = userAchievements.length;
  const totalCount = achievements.length;

  function getProgress(achievement: Achievement, stats?: typeof currentStats): number {
    if (!stats) return 0;

    switch (achievement.requirement_type) {
      case 'questions_answered':
        return (stats.questionsAnswered / achievement.requirement_value) * 100;
      case 'streak':
        return (stats.currentStreak / achievement.requirement_value) * 100;
      case 'accuracy':
        return stats.questionsAnswered >= 20 
          ? (stats.accuracy / achievement.requirement_value) * 100 
          : 0;
      default:
        return 0;
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <span className="text-sm text-slate-400">
            {earnedCount}/{totalCount}
          </span>
        </div>
        {displayedAchievements.length > maxDisplay && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {showAll ? 'Show less' : 'View all'}
            <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {visibleAchievements.map((achievement, index) => {
            const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
            const earned = earnedIds.has(achievement.id);
            const progress = getProgress(achievement, currentStats);

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <AchievementCard
                  achievement={achievement}
                  earned={earned}
                  earnedAt={userAchievement?.earned_at}
                  progress={progress}
                  onClick={() => setSelectedAchievement(achievement)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {displayedAchievements.length === 0 && (
        <MagicCard className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400">Start completing challenges to earn achievements!</p>
        </MagicCard>
      )}

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-3xl">
                  {selectedAchievement.icon || '🏆'}
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                {selectedAchievement.name}
              </h3>
              <p className="text-slate-400 mb-4">
                {selectedAchievement.description}
              </p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Requirement: {selectedAchievement.requirement_value} {selectedAchievement.requirement_type.replace('_', ' ')}
                </span>
                {earnedIds.has(selectedAchievement.id) && (
                  <span className="text-emerald-400">✓ Earned</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for sidebar/header
interface AchievementPreviewProps {
  userAchievements: UserAchievement[];
  totalAchievements: number;
  onClick?: () => void;
}

export function AchievementPreview({
  userAchievements,
  totalAchievements,
  onClick,
}: AchievementPreviewProps) {
  const recentAchievements = [...userAchievements]
    .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
    .slice(0, 3);

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="flex -space-x-2">
        {recentAchievements.map((ua, index) => (
          <div
            key={ua.id}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm border-2 border-slate-900"
            style={{ zIndex: 3 - index }}
          >
            {(ua as any).achievement?.icon || '🏆'}
          </div>
        ))}
        {userAchievements.length === 0 && (
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-slate-500" />
          </div>
        )}
      </div>
      <div className="text-sm">
        <span className="font-semibold text-white">{userAchievements.length}</span>
        <span className="text-slate-400">/{totalAchievements}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500" />
    </motion.div>
  );
}

export default AchievementShowcase;

