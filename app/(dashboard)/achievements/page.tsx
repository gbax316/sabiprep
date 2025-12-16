'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
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
} from 'lucide-react';

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

  const getProgress = (achievement: typeof allAchievements[0]) => {
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  const earnedCount = allAchievements.filter(a => isEarned(a.id)).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Achievements" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Summary Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3" />
            <h2 className="font-display text-3xl font-bold mb-1">
              {earnedCount} / {allAchievements.length}
            </h2>
            <p className="text-white/80">Achievements Unlocked</p>
          </div>
          <div className="p-4">
            <ProgressBar 
              value={(earnedCount / allAchievements.length) * 100} 
              color="warning"
              showLabel
            />
          </div>
        </Card>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center p-3">
              <p className="font-display text-xl font-bold text-slate-900">{stats.questionsAnswered}</p>
              <p className="text-xs text-slate-500">Questions</p>
            </Card>
            <Card className="text-center p-3">
              <p className="font-display text-xl font-bold text-slate-900">{stats.currentStreak}</p>
              <p className="text-xs text-slate-500">Day Streak</p>
            </Card>
            <Card className="text-center p-3">
              <p className="font-display text-xl font-bold text-slate-900">{Math.round(stats.accuracy)}%</p>
              <p className="text-xs text-slate-500">Accuracy</p>
            </Card>
          </div>
        )}

        {/* Achievements Grid */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            All Achievements
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {allAchievements.map((achievement) => {
              const Icon = achievement.icon;
              const earned = isEarned(achievement.id);
              const progress = getProgress(achievement);

              return (
                <Card 
                  key={achievement.id}
                  className={`relative overflow-hidden ${!earned && 'opacity-75'}`}
                >
                  {/* Badge icon */}
                  <div className="text-center py-4">
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
                      earned 
                        ? `bg-gradient-to-br ${achievement.color}` 
                        : 'bg-slate-200'
                    }`}>
                      {earned ? (
                        <Icon className="w-8 h-8 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-sm text-slate-900 mb-1">
                      {achievement.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      {achievement.description}
                    </p>

                    {/* Progress bar for unearned */}
                    {!earned && (
                      <div className="px-2">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full bg-gradient-to-r ${achievement.color}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {Math.round(progress)}%
                        </p>
                      </div>
                    )}

                    {/* Earned badge */}
                    {earned && (
                      <Badge variant="success" size="sm">
                        Unlocked!
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
