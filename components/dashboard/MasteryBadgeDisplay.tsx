'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { MasteryBadge, UserMasteryBadge } from '@/types/database';

interface MasteryBadgeDisplayProps {
  badge: MasteryBadge;
  earned?: boolean;
  earnedAt?: string;
  progress?: number; // 0-100, progress towards earning
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

// Badge level configuration with colors and descriptions
const BADGE_CONFIG: Record<number, { gradient: string; glow: string; ring: string }> = {
  1: { gradient: 'from-slate-400 to-slate-600', glow: 'shadow-slate-400/30', ring: 'ring-slate-400' },
  2: { gradient: 'from-blue-400 to-blue-600', glow: 'shadow-blue-400/30', ring: 'ring-blue-400' },
  3: { gradient: 'from-cyan-400 to-cyan-600', glow: 'shadow-cyan-400/30', ring: 'ring-cyan-400' },
  4: { gradient: 'from-teal-400 to-teal-600', glow: 'shadow-teal-400/30', ring: 'ring-teal-400' },
  5: { gradient: 'from-emerald-400 to-emerald-600', glow: 'shadow-emerald-400/30', ring: 'ring-emerald-400' },
  6: { gradient: 'from-yellow-400 to-yellow-600', glow: 'shadow-yellow-400/30', ring: 'ring-yellow-400' },
  7: { gradient: 'from-amber-400 to-amber-600', glow: 'shadow-amber-400/30', ring: 'ring-amber-400' },
  8: { gradient: 'from-orange-400 to-orange-600', glow: 'shadow-orange-400/30', ring: 'ring-orange-400' },
  9: { gradient: 'from-rose-400 to-rose-600', glow: 'shadow-rose-400/30', ring: 'ring-rose-400' },
  10: { gradient: 'from-pink-400 to-pink-600', glow: 'shadow-pink-400/30', ring: 'ring-pink-400' },
  11: { gradient: 'from-red-400 to-red-600', glow: 'shadow-red-400/30', ring: 'ring-red-400' },
  12: { gradient: 'from-violet-400 to-violet-600', glow: 'shadow-violet-400/30', ring: 'ring-violet-400' },
};

const SIZE_CLASSES = {
  sm: {
    container: 'w-12 h-12',
    icon: 'text-xl',
    ring: 'w-14 h-14',
    label: 'text-xs',
  },
  md: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    ring: 'w-[72px] h-[72px]',
    label: 'text-sm',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'text-4xl',
    ring: 'w-28 h-28',
    label: 'text-base',
  },
};

export function MasteryBadgeDisplay({
  badge,
  earned = false,
  earnedAt,
  progress = 0,
  size = 'md',
  showProgress = false,
  onClick,
}: MasteryBadgeDisplayProps) {
  const config = BADGE_CONFIG[badge.level] || BADGE_CONFIG[1];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <motion.div
      className={`relative flex flex-col items-center gap-2 ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
    >
      {/* Progress Ring (if showing progress) */}
      {showProgress && !earned && (
        <div className={`absolute ${sizeClass.ring} -top-1 -left-1`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.89} 289`}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Badge Icon */}
      <motion.div
        className={`
          ${sizeClass.container}
          rounded-xl
          flex items-center justify-center
          bg-gradient-to-br ${config.gradient}
          ${earned ? `shadow-lg ${config.glow}` : 'opacity-40 grayscale'}
          transition-all duration-300
          ${earned ? 'ring-2 ring-offset-2 ring-offset-slate-950 ' + config.ring : ''}
        `}
        initial={false}
        animate={earned ? { 
          boxShadow: ['0 0 20px rgba(255,255,255,0.2)', '0 0 40px rgba(255,255,255,0.4)', '0 0 20px rgba(255,255,255,0.2)']
        } : {}}
        transition={earned ? { duration: 2, repeat: Infinity } : {}}
      >
        <span className={sizeClass.icon}>{badge.icon || '🏆'}</span>
      </motion.div>

      {/* Badge Label */}
      <div className="text-center">
        <p className={`font-semibold ${earned ? 'text-white' : 'text-slate-500'} ${sizeClass.label}`}>
          {badge.name}
        </p>
        {earned && earnedAt && size === 'lg' && (
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
        {!earned && showProgress && (
          <p className="text-xs text-slate-500">
            {Math.round(progress)}%
          </p>
        )}
      </div>
    </motion.div>
  );
}

interface MasteryBadgeGridProps {
  badges: MasteryBadge[];
  userBadges: UserMasteryBadge[];
  currentXP?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  maxDisplay?: number;
}

export function MasteryBadgeGrid({
  badges,
  userBadges,
  currentXP = 0,
  size = 'sm',
  showProgress = true,
  maxDisplay,
}: MasteryBadgeGridProps) {
  const earnedBadgeIds = new Set(userBadges.map(ub => ub.mastery_badge_id));
  
  // Sort badges by level
  const sortedBadges = [...badges].sort((a, b) => a.level - b.level);
  const displayBadges = maxDisplay ? sortedBadges.slice(0, maxDisplay) : sortedBadges;

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {displayBadges.map((badge) => {
        const userBadge = userBadges.find(ub => ub.mastery_badge_id === badge.id);
        const earned = earnedBadgeIds.has(badge.id);
        
        // Calculate progress for unearned badges
        const progress = !earned && badge.xp_requirement > 0
          ? Math.min(100, (currentXP / badge.xp_requirement) * 100)
          : 0;

        return (
          <MasteryBadgeDisplay
            key={badge.id}
            badge={badge}
            earned={earned}
            earnedAt={userBadge?.earned_at}
            progress={progress}
            size={size}
            showProgress={showProgress && !earned}
          />
        );
      })}
    </div>
  );
}

interface CurrentMasteryLevelProps {
  badges: MasteryBadge[];
  userBadges: UserMasteryBadge[];
  currentXP: number;
}

export function CurrentMasteryLevel({
  badges,
  userBadges,
  currentXP,
}: CurrentMasteryLevelProps) {
  // Find the current and next badge
  const sortedBadges = [...badges].sort((a, b) => a.level - b.level);
  const earnedBadgeIds = new Set(userBadges.map(ub => ub.mastery_badge_id));
  
  let currentBadge: MasteryBadge | null = null;
  let nextBadge: MasteryBadge | null = null;

  for (let i = 0; i < sortedBadges.length; i++) {
    if (earnedBadgeIds.has(sortedBadges[i].id)) {
      currentBadge = sortedBadges[i];
    } else if (!nextBadge) {
      nextBadge = sortedBadges[i];
    }
  }

  // If no badges earned yet, show first badge as "next"
  if (!currentBadge && sortedBadges.length > 0) {
    nextBadge = sortedBadges[0];
  }

  const progressToNext = nextBadge && nextBadge.xp_requirement > 0
    ? Math.min(100, (currentXP / nextBadge.xp_requirement) * 100)
    : 100;

  const xpToNext = nextBadge ? Math.max(0, nextBadge.xp_requirement - currentXP) : 0;

  return (
    <div className="flex items-center gap-4">
      {/* Current Badge */}
      {currentBadge && (
        <MasteryBadgeDisplay
          badge={currentBadge}
          earned={true}
          size="md"
        />
      )}

      {/* Progress to next */}
      {nextBadge && (
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Next: {nextBadge.name}</span>
            <span className="text-sm text-cyan-400">{xpToNext} XP to go</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Next Badge Preview */}
      {nextBadge && (
        <MasteryBadgeDisplay
          badge={nextBadge}
          earned={false}
          progress={progressToNext}
          size="md"
          showProgress={true}
        />
      )}
    </div>
  );
}

export default MasteryBadgeDisplay;

