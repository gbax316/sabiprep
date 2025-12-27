'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Clock, 
  Target, 
  ChevronRight, 
  CheckCircle,
  Flame,
  Star,
  Zap,
} from 'lucide-react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import type { DailyChallenge, UserDailyChallenge, Subject } from '@/types/database';

interface DailyChallengeCardProps {
  challenge: DailyChallenge | null;
  completion?: UserDailyChallenge | null;
  subject?: Subject | null;
  onStart?: () => void;
  isLoading?: boolean;
  showCountdown?: boolean;
  compact?: boolean;
}

export function DailyChallengeCard({
  challenge,
  completion,
  subject,
  onStart,
  isLoading = false,
  showCountdown = true,
  compact = false,
}: DailyChallengeCardProps) {
  const router = useRouter();
  const isCompleted = !!completion;

  // Calculate time until next challenge
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const hoursUntilReset = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  // No challenge available
  if (!challenge) {
    return (
      <MagicCard className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-purple-500/20">
        <div className={`${compact ? 'p-4' : 'p-6'} text-center`}>
          <Sparkles className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-3 text-purple-400 opacity-50`} />
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-white mb-1`}>
            No Challenge Today
          </h3>
          <p className="text-sm text-slate-400 mb-3">Check back later for new challenges!</p>
          {showCountdown && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 text-sm">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">
                Next in {hoursUntilReset}h {minutesUntilReset}m
              </span>
            </div>
          )}
        </div>
      </MagicCard>
    );
  }

  // Compact view for dashboard widget
  if (compact) {
    return (
      <MagicCard 
        className={`
          overflow-hidden cursor-pointer transition-all duration-300
          ${isCompleted 
            ? 'bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30'
            : 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 hover:border-purple-500/50'
          }
        `}
        onClick={() => router.push('/daily-challenge')}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-xl
                ${isCompleted 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }
              `}>
                {isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : (subject?.icon || '📚')}
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">
                  {isCompleted ? 'Challenge Complete!' : 'Daily Challenge'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isCompleted 
                    ? `${Math.round(completion?.score_percentage || 0)}% • +${completion?.xp_earned || 0} XP`
                    : `${challenge.question_count} questions • ${Math.floor(challenge.time_limit_seconds / 60)} min`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20">
                  <Star className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">
                    +{challenge.question_count + 2} XP
                  </span>
                </div>
              )}
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
      </MagicCard>
    );
  }

  // Full view
  return (
    <MagicCard 
      className={`
        overflow-hidden
        ${isCompleted 
          ? 'bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30'
          : 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30'
        }
      `}
    >
      {/* Animated gradient border for uncompleted challenge */}
      {!isCompleted && (
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
        </div>
      )}

      <div className="p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                ${isCompleted 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }
              `}
              animate={!isCompleted ? { 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isCompleted ? (
                <CheckCircle className="w-7 h-7 text-white" />
              ) : (
                subject?.icon || '📚'
              )}
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">
                  Daily Challenge
                </h3>
                {!isCompleted && (
                  <motion.div
                    className="px-2 py-0.5 rounded-full bg-purple-500/30 text-xs font-semibold text-purple-300"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    NEW
                  </motion.div>
                )}
              </div>
              <p className="text-purple-200 text-sm">{subject?.name || 'Mixed Topics'}</p>
            </div>
          </div>

          {/* XP Badge */}
          <div className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-xl
            ${isCompleted 
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-amber-500/20 border border-amber-500/30'
            }
          `}>
            {isCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-emerald-300">
                  +{completion?.xp_earned || 0} XP
                </span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-amber-300">
                  +{challenge.question_count + 2} XP
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-purple-200">
            <Target className="w-4 h-4" />
            <span>{challenge.question_count} questions</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-200">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(challenge.time_limit_seconds / 60)} minutes</span>
          </div>
          {isCompleted && completion && (
            <div className="flex items-center gap-1.5 text-emerald-300">
              <Flame className="w-4 h-4" />
              <span>{Math.round(completion.score_percentage || 0)}% score</span>
            </div>
          )}
        </div>

        {/* Action */}
        {isCompleted ? (
          <MagicButton
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              if (completion?.session_id) {
                router.push(`/results/${completion.session_id}`);
              }
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            View Results
            <ChevronRight className="w-4 h-4 ml-2" />
          </MagicButton>
        ) : (
          <MagicButton
            variant="primary"
            size="sm"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 border-0 hover:from-purple-600 hover:to-pink-600"
            onClick={onStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Challenge
              </>
            )}
          </MagicButton>
        )}

        {/* Countdown */}
        {showCountdown && !isCompleted && (
          <div className="mt-4 pt-4 border-t border-purple-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Challenge resets in</span>
              <span className="text-purple-300 font-medium">
                {hoursUntilReset}h {minutesUntilReset}m
              </span>
            </div>
          </div>
        )}
      </div>
    </MagicCard>
  );
}

// Multi-challenge carousel for dashboard
interface DailyChallengeCarouselProps {
  challenges: DailyChallenge[];
  completions: UserDailyChallenge[];
  subjects: Map<string, Subject>;
  onStartChallenge?: (challenge: DailyChallenge) => void;
}

export function DailyChallengeCarousel({
  challenges,
  completions,
  subjects,
  onStartChallenge,
}: DailyChallengeCarouselProps) {
  if (challenges.length === 0) {
    return <DailyChallengeCard challenge={null} />;
  }

  // Sort: incomplete first, then by subject name
  const sortedChallenges = [...challenges].sort((a, b) => {
    const aCompleted = completions.some(c => c.daily_challenge_id === a.id);
    const bCompleted = completions.some(c => c.daily_challenge_id === b.id);
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    return 0;
  });

  // Show the first incomplete challenge prominently
  const primaryChallenge = sortedChallenges[0];
  const primaryCompletion = completions.find(c => c.daily_challenge_id === primaryChallenge.id);
  const primarySubject = subjects.get(primaryChallenge.subject_id);

  const completedCount = completions.length;
  const totalCount = challenges.length;

  return (
    <div className="space-y-3">
      {/* Primary challenge */}
      <DailyChallengeCard
        challenge={primaryChallenge}
        completion={primaryCompletion}
        subject={primarySubject}
        onStart={() => onStartChallenge?.(primaryChallenge)}
      />

      {/* Progress indicator */}
      {challenges.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-slate-400">
            {completedCount === totalCount 
              ? 'All challenges complete!' 
              : `${completedCount} of ${totalCount} completed`
            }
          </span>
          <div className="flex gap-1.5">
            {challenges.map((challenge) => {
              const isComplete = completions.some(c => c.daily_challenge_id === challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={`w-2 h-2 rounded-full ${
                    isComplete ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyChallengeCard;

