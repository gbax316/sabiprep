'use client';

import React, { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
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
} from 'lucide-react';

// Mock data for daily challenges
const todayChallenge = {
  id: '1',
  title: 'Mathematics Master',
  description: 'Answer 10 algebra questions correctly',
  subject: 'Mathematics',
  questionCount: 10,
  timeLimit: 15, // minutes
  reward: 100,
  completed: false,
};

const weeklyProgress = [
  { day: 'Mon', completed: true },
  { day: 'Tue', completed: true },
  { day: 'Wed', completed: true },
  { day: 'Thu', completed: false },
  { day: 'Fri', completed: false },
  { day: 'Sat', completed: false },
  { day: 'Sun', completed: false },
];

const pastChallenges = [
  { id: '2', title: 'English Expert', score: 85, reward: 100, date: 'Yesterday' },
  { id: '3', title: 'Science Whiz', score: 90, reward: 100, date: '2 days ago' },
  { id: '4', title: 'History Buff', score: 75, reward: 100, date: '3 days ago' },
];

export default function DailyChallengePage() {
  const { userId } = useAuth();
  const [starting, setStarting] = useState(false);

  const handleStartChallenge = () => {
    setStarting(true);
    // In a real app, this would create a session and navigate
    setTimeout(() => {
      alert('Daily Challenge feature coming soon!');
      setStarting(false);
    }, 1000);
  };

  // Calculate time until next challenge
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const hoursUntilReset = Math.floor((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor(((tomorrow.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Daily Challenge" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Today's Challenge Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                <span className="font-semibold">Today&apos;s Challenge</span>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                +{todayChallenge.reward} XP
              </Badge>
            </div>

            <h2 className="font-display text-2xl font-bold mb-2">
              {todayChallenge.title}
            </h2>
            <p className="text-white/80 mb-4">
              {todayChallenge.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {todayChallenge.timeLimit} min
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {todayChallenge.questionCount} questions
              </span>
            </div>
          </div>

          <div className="p-4">
            <Button
              variant="primary"
              size="full"
              onClick={handleStartChallenge}
              isLoading={starting}
              className="shadow-lg shadow-primary-500/25"
            >
              {starting ? 'Starting...' : 'Start Challenge'}
            </Button>
          </div>
        </Card>

        {/* Countdown Timer */}
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-800">Next challenge in</p>
                <p className="font-display text-xl font-bold text-amber-900">
                  {hoursUntilReset}h {minutesUntilReset}m
                </p>
              </div>
            </div>
            <Gift className="w-8 h-8 text-amber-400" />
          </div>
        </Card>

        {/* Weekly Progress */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            Weekly Streak
          </h2>
          <Card>
            <div className="flex items-center justify-between">
              {weeklyProgress.map((day, idx) => (
                <div key={day.day} className="text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    day.completed 
                      ? 'bg-emerald-100' 
                      : idx === 3 
                        ? 'bg-primary-100 ring-2 ring-primary-500' 
                        : 'bg-slate-100'
                  }`}>
                    {day.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : idx === 3 ? (
                      <Sparkles className="w-5 h-5 text-primary-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    day.completed ? 'text-emerald-600' : idx === 3 ? 'text-primary-600' : 'text-slate-400'
                  }`}>
                    {day.day}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-slate-900">3 Day Streak</span>
                </div>
                <span className="text-sm text-slate-500">Complete today to continue!</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Rewards Info */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">7-Day Streak Bonus</h3>
              <p className="text-sm text-slate-600">Complete all 7 days for 500 bonus XP!</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-amber-600">4</p>
              <p className="text-xs text-slate-500">days left</p>
            </div>
          </div>
        </Card>

        {/* Past Challenges */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            Recent Challenges
          </h2>
          <div className="space-y-3">
            {pastChallenges.map((challenge) => (
              <Card key={challenge.id} className="card-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{challenge.title}</p>
                      <p className="text-xs text-slate-500">{challenge.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{challenge.score}%</p>
                    <p className="text-xs text-emerald-600">+{challenge.reward} XP</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
