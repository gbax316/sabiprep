'use client';

import React, { useEffect, useState } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  getTodayDailyChallenges,
  getDailyChallenge,
  getUserDailyChallengeCompletions,
  createSession,
  getSubjects,
  getSubject,
  getUserStats,
  forceGenerateDailyChallenge,
} from '@/lib/api';
import type { DailyChallenge, UserDailyChallenge, Subject } from '@/types/database';
import {
  Sparkles,
  Clock,
  Trophy,
  Flame,
  Gift,
  Star,
  ChevronRight,
  Lock,
  CheckCircle,
  Target,
  Zap,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DailyChallengePage() {
  const { userId, isGuest } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null); // Track which challenge is starting
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<UserDailyChallenge[]>([]);
  const [subjects, setSubjects] = useState<Map<string, Subject>>(new Map());
  const [stats, setStats] = useState<{ currentStreak: number; xpPoints: number } | null>(null);

  useEffect(() => {
    if (!isGuest && userId) {
      loadDailyChallenges();
    } else if (isGuest) {
      setLoading(false);
    }
  }, [userId, isGuest]);

  async function loadDailyChallenges() {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Load today's challenges and user completions in parallel
      const [challenges, completions, userStats] = await Promise.all([
        getTodayDailyChallenges(),
        getUserDailyChallengeCompletions(userId, 7), // Last 7 completions
        getUserStats(userId),
      ]);

      setDailyChallenges(challenges);
      setCompletedChallenges(completions);
      setStats({
        currentStreak: userStats.currentStreak,
        xpPoints: userStats.xpPoints,
      });

      // Build subjects map for quick lookup
      const subjectsMap = new Map<string, Subject>();
      for (const challenge of challenges) {
        if ('subject' in challenge && challenge.subject) {
          const subject = challenge.subject as Subject;
          subjectsMap.set(subject.id, subject);
        }
      }
      setSubjects(subjectsMap);
    } catch (error) {
      console.error('Error loading daily challenges:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Set empty arrays on error so the page still renders
      setDailyChallenges([]);
      setCompletedChallenges([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartChallenge(challenge: DailyChallenge) {
    if (!userId || isGuest) {
      router.push('/login');
      return;
    }

    // Check if already completed
    const existingCompletion = completedChallenges.find(
      c => c.daily_challenge_id === challenge.id
    );
    if (existingCompletion) {
      // Navigate to results if completed
      if (existingCompletion.session_id) {
        router.push(`/results/${existingCompletion.session_id}`);
      }
      return;
    }

    try {
      setStarting(challenge.id);

      // Get subject info from the subjects map or from challenge itself
      const subject = subjects.get(challenge.subject_id) || 
        (challenge as any).subject as Subject | undefined;
      
      if (!subject) {
        // Try to fetch subject
        const fetchedSubject = await getSubject(challenge.subject_id);
        if (!fetchedSubject) {
          throw new Error('Subject not found');
        }
      }

      // Create a timed session for the daily challenge
      // Note: timeLimit is in seconds (createSession stores it directly as time_limit_seconds)
      const session = await createSession({
        userId,
        subjectId: challenge.subject_id,
        topicIds: [], // Daily challenges use question_ids directly
        mode: 'timed',
        totalQuestions: challenge.question_count,
        timeLimit: challenge.time_limit_seconds, // Pass in seconds (1200 for 20 minutes)
      });

      // Store challenge metadata and questions in sessionStorage
      if (typeof window !== 'undefined') {
        // Store daily challenge info
        sessionStorage.setItem(`dailyChallenge_${session.id}`, JSON.stringify({
          challengeId: challenge.id,
          questionIds: challenge.question_ids,
          isDailyChallenge: true,
        }));
        
        // Store pre-selected question IDs for the timed page
        sessionStorage.setItem(`session_${session.id}_questions`, JSON.stringify({
          questionIds: challenge.question_ids,
          distribution: null,
          topicIds: [],
          isDailyChallenge: true,
        }));
      }

      // Navigate to timed mode with the challenge questions
      router.push(`/timed/${session.id}`);
    } catch (error) {
      console.error('Error starting daily challenge:', error);
      alert('Failed to start challenge. Please try again.');
      setStarting(null);
    }
  }

  // Calculate time until next challenge
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const hoursUntilReset = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  // Get weekly progress (last 7 days)
  const getWeeklyProgress = () => {
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if user completed any challenge on this date
      const completed = completedChallenges.some(c => {
        const completedDate = new Date(c.completed_at).toISOString().split('T')[0];
        return completedDate === dateStr;
      });
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.push({
        day: dayNames[date.getDay()],
        date: dateStr,
        completed,
        isToday: i === 0,
      });
    }
    
    return days;
  };

  const weeklyProgress = getWeeklyProgress();
  const completedToday = completedChallenges.some(c => {
    const completedDate = new Date(c.completed_at).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return completedDate === today;
  });

  if (isGuest) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <Header title="Daily Challenge" showBack />
        <div className="container-app py-6">
          <MagicCard className="p-6 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-bold text-white mb-2">Sign in Required</h2>
            <p className="text-slate-400 mb-4">Please sign in to access daily challenges.</p>
            <MagicButton variant="primary" onClick={() => router.push('/login')}>
              Sign In
            </MagicButton>
          </MagicCard>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <Header title="Daily Challenge" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading daily challenges...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header title="Daily Challenge" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Header Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {stats && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-semibold">{stats.currentStreak}d streak</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30">
                  <Star className="w-4 h-4 text-violet-400" />
                  <span className="text-white font-semibold">{stats.xpPoints} XP</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Today's Challenges */}
        {dailyChallenges.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Today's Challenges
            </h2>
            {dailyChallenges.map((challenge, index) => {
              const subject = subjects.get(challenge.subject_id);
              const completion = completedChallenges.find(c => c.daily_challenge_id === challenge.id);
              const isCompleted = !!completion;
              const isStarting = starting === challenge.id;

              return (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <MagicCard className="overflow-hidden bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                            {subject?.icon || '📚'}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">
                              {subject?.name || 'Challenge'}
                            </h3>
                            <p className="text-sm text-purple-200">{challenge.question_count} questions • {Math.floor(challenge.time_limit_seconds / 60)} minutes</p>
                          </div>
                        </div>
                        {isCompleted ? (
                          <MagicBadge variant="success" className="bg-emerald-500/30 border-emerald-400/50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </MagicBadge>
                        ) : (
                          <MagicBadge variant="info" className="bg-amber-500/30 border-amber-400/50">
                            <Star className="w-3 h-3 mr-1" />
                            +{challenge.question_count + 2} XP
                          </MagicBadge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-sm text-purple-200">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {Math.floor(challenge.time_limit_seconds / 60)} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {challenge.question_count} questions
                        </span>
                        {isCompleted && completion && (
                          <span className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            {Math.round(completion.score_percentage || 0)}%
                          </span>
                        )}
                      </div>

                      {isCompleted && completion ? (
                        <MagicButton
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (completion.session_id) {
                              router.push(`/results/${completion.session_id}`);
                            }
                          }}
                          className="w-full"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          View Results
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </MagicButton>
                      ) : (
                        <MagicButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartChallenge(challenge)}
                          disabled={isStarting}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 border-0"
                        >
                          {isStarting ? (
                            'Starting...'
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Start Challenge
                            </>
                          )}
                        </MagicButton>
                      )}
                    </div>
                  </MagicCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <MagicCard className="p-8 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-bold text-white mb-2">No Challenges Today</h3>
            <p className="text-slate-400">Check back tomorrow for new daily challenges!</p>
          </MagicCard>
        )}

        {/* Countdown Timer */}
        <MagicCard className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-200">Next challenge in</p>
                <p className="font-bold text-white text-xl">
                  {hoursUntilReset}h {minutesUntilReset}m
                </p>
              </div>
            </div>
            <Gift className="w-8 h-8 text-amber-400" />
          </div>
        </MagicCard>

        {/* Weekly Progress */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Weekly Progress
          </h2>
          <MagicCard>
            <div className="flex items-center justify-between p-4">
              {weeklyProgress.map((day, idx) => (
                <div key={day.date} className="text-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      day.completed
                        ? 'bg-gradient-to-br from-emerald-500 to-green-500'
                        : day.isToday
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 ring-2 ring-amber-400'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    {day.completed ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : day.isToday ? (
                      <Sparkles className="w-5 h-5 text-white" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      day.completed
                        ? 'text-emerald-400'
                        : day.isToday
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
            {stats && stats.currentStreak > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <span className="font-semibold text-white">{stats.currentStreak} Day Streak</span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {completedToday ? 'Great job today! 🎉' : 'Complete today to continue!'}
                  </span>
                </div>
              </div>
            )}
          </MagicCard>
        </div>

        {/* Recent Completions */}
        {completedChallenges.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Recent Completions</h2>
            <div className="space-y-3">
              {completedChallenges.slice(0, 5).map((completion, index) => {
                const challenge = dailyChallenges.find(c => c.id === completion.daily_challenge_id);
                const subject = challenge ? subjects.get(challenge.subject_id) : null;
                const completedDate = new Date(completion.completed_at);
                const isToday = completedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                const dateLabel = isToday
                  ? 'Today'
                  : completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <motion.div
                    key={completion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MagicCard className="bg-slate-900/50 border-slate-700">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-xl">
                            {subject?.icon || '📚'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{subject?.name || 'Challenge'}</p>
                            <p className="text-xs text-slate-400">{dateLabel}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">
                            {Math.round(completion.score_percentage || 0)}%
                          </p>
                          <p className="text-xs text-emerald-400">+{completion.xp_earned} XP</p>
                        </div>
                      </div>
                    </MagicCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
