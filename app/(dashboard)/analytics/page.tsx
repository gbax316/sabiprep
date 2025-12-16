'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { ProgressBar } from '@/components/common/ProgressBar';
import { useAuth } from '@/lib/auth-context';
import { getAnalytics, getSubjects, getTopics } from '@/lib/api';
import type { AnalyticsData, Subject, Topic } from '@/types/database';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  Calendar,
  BarChart3,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic>>(new Map());

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId]);

  async function loadAnalytics() {
    if (!userId) return;

    try {
      setLoading(true);
      
      const [analyticsData, allSubjects] = await Promise.all([
        getAnalytics(userId),
        getSubjects(),
      ]);

      setAnalytics(analyticsData);
      setSubjects(allSubjects);

      // Load topics for strengths and weaknesses
      const topicIds = [...analyticsData.strengths, ...analyticsData.weaknesses];
      const topicsMap = new Map<string, Topic>();
      
      for (const subject of allSubjects) {
        const subjectTopics = await getTopics(subject.id);
        subjectTopics.forEach(topic => {
          if (topicIds.includes(topic.id)) {
            topicsMap.set(topic.id, topic);
          }
        });
      }
      
      setTopics(topicsMap);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 pb-24">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-900 mb-2">No Data Yet</p>
          <p className="text-gray-600">Start learning to see your analytics</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const stats = analytics.totalStats;
  const maxActivity = Math.max(...analytics.weeklyActivity.map(d => d.questionsAnswered), 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Your Analytics 📊</h1>
          <p className="text-sm text-gray-600">Track your learning progress over time</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Stats */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Overall Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.questionsAnswered}</p>
              <p className="text-xs text-gray-600">Questions Answered</p>
            </Card>

            <Card className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{Math.round(stats.accuracy)}%</p>
              <p className="text-xs text-gray-600">Accuracy Rate</p>
            </Card>

            <Card className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {Math.floor(stats.studyTimeMinutes / 60)}h {stats.studyTimeMinutes % 60}m
              </p>
              <p className="text-xs text-gray-600">Study Time</p>
            </Card>

            <Card className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.currentStreak}</p>
              <p className="text-xs text-gray-600">Day Streak</p>
            </Card>
          </div>
        </div>

        {/* Weekly Activity */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-lg text-gray-900">Weekly Activity</h3>
          </div>
          
          <div className="flex items-end justify-between gap-2 h-48">
            {analytics.weeklyActivity.map((day, idx) => {
              const height = (day.questionsAnswered / maxActivity) * 100;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        day.questionsAnswered > 0
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${day.questionsAnswered} questions`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-900">{dayName}</p>
                    <p className="text-xs text-gray-500">{day.questionsAnswered}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Subject Performance */}
        {analytics.subjectPerformance.length > 0 && (
          <Card>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Subject Performance</h3>
            <div className="space-y-4">
              {analytics.subjectPerformance.map((perf) => {
                const subject = subjects.find(s => s.id === perf.subjectId);
                if (!subject) return null;

                return (
                  <div key={perf.subjectId}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{subject.icon || '📚'}</span>
                        <span className="font-medium text-gray-900">{subject.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{Math.round(perf.accuracy)}%</p>
                        <p className="text-xs text-gray-600">
                          {perf.questionsCorrect} / {perf.questionsAttempted}
                        </p>
                      </div>
                    </div>
                    <ProgressBar 
                      value={perf.accuracy} 
                      color={
                        perf.accuracy >= 80 ? 'success' :
                        perf.accuracy >= 60 ? 'warning' :
                        'error'
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <Card className="bg-green-50 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-lg text-gray-900">Your Strengths</h3>
            </div>
            {analytics.strengths.length > 0 ? (
              <div className="space-y-3">
                {analytics.strengths.slice(0, 3).map((topicId) => {
                  const topic = topics.get(topicId);
                  if (!topic) return null;

                  return (
                    <div key={topicId} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                      <span className="text-sm font-medium text-gray-900">{topic.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Keep practicing to identify your strengths!
              </p>
            )}
          </Card>

          {/* Weaknesses */}
          <Card className="bg-orange-50 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-lg text-gray-900">Areas to Improve</h3>
            </div>
            {analytics.weaknesses.length > 0 ? (
              <div className="space-y-3">
                {analytics.weaknesses.slice(0, 3).map((topicId) => {
                  const topic = topics.get(topicId);
                  if (!topic) return null;

                  return (
                    <div key={topicId} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        !
                      </div>
                      <span className="text-sm font-medium text-gray-900">{topic.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No weak areas identified yet!
              </p>
            )}
          </Card>
        </div>

        {/* Motivational Card */}
        <Card variant="gradient" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="text-center py-6">
            <Award className="w-16 h-16 mx-auto mb-3" />
            <h3 className="text-2xl font-bold mb-2">Keep Up the Great Work!</h3>
            <p className="text-white/90">
              You're on track to achieving your learning goals. Stay consistent and you'll see amazing results!
            </p>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
