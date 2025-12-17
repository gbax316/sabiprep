'use client';

import React, { useEffect, useState, use } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { ProgressRing } from '@/components/magic/ProgressRing';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics, getUserProgress } from '@/lib/api';
import type { Subject, Topic, UserProgress } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TopicsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !userId) {
      router.push('/login');
    }
  }, [userId, authLoading, router]);

  useEffect(() => {
    if (userId) {
      loadTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, userId]);

  async function loadTopics() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const [subjectData, topicsData, userProgress] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
        getUserProgress(userId),
      ]);

      setSubject(subjectData);
      setTopics(topicsData);
      setProgress(userProgress.filter(p => p.subject_id === subjectId));
    } catch (error) {
      console.error('Error loading topics:', error);
      setError('Failed to load topics. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get progress for a topic
  const getTopicProgress = (topicId: string) => {
    return progress.find(p => p.topic_id === topicId);
  };

  // Calculate subject stats
  const subjectStats = {
    completedTopics: progress.filter(p => p.accuracy_percentage >= 80).length,
    accuracy: progress.length > 0 
      ? Math.round(progress.reduce((sum, p) => sum + p.accuracy_percentage, 0) / progress.length)
      : 0,
    streak: 0, // This would come from user stats
  };

  // Get difficulty variant
  const getDifficultyVariant = (difficulty?: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Hard':
        return 'accent';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading topics...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-xl text-white mb-4">Subject not found</p>
          <Link href="/subjects">
            <MagicButton variant="primary">
              Back to Subjects
            </MagicButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mx-4 mt-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => { setError(null); loadTopics(); }}
            className="mt-2 text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Frosted Glass Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/subjects">
              <MagicButton variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </MagicButton>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="text-4xl">{subject.icon || '📚'}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{subject.name}</h1>
                <p className="text-sm text-slate-400">{topics.length} topics available</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Subject Header Card with Stats */}
        <MagicCard glow className="p-6 space-y-4 bg-slate-900/50 border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                {subject.name}
              </h2>
              <p className="text-slate-400 mt-2">
                {topics.length} topics • {subject.total_questions} questions
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 text-3xl">
              {subject.icon || '📚'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{subjectStats.completedTopics}</div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-400">{subjectStats.accuracy}%</div>
              <div className="text-xs text-slate-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{subjectStats.streak}</div>
              <div className="text-xs text-slate-400">Day Streak</div>
            </div>
          </div>
        </MagicCard>

        {/* Topics List */}
        <div className="space-y-4">
          {filteredTopics.map((topic, idx) => {
            const topicProgress = getTopicProgress(topic.id);
            const isCompleted = topicProgress && topicProgress.accuracy_percentage >= 80;
            const isLocked = false; // Implement locking logic if needed
            const hasProgress = !!topicProgress;
            const progressPercentage = topicProgress 
              ? Math.round((topicProgress.questions_correct / topicProgress.questions_attempted) * 100)
              : 0;

            return (
              <Link key={topic.id} href={`/mode-select/${topic.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <MagicCard 
                    hover 
                    className="p-5 space-y-3 bg-slate-900/50 border border-slate-700 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{topic.name}</h3>
                          {isCompleted && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                          {isLocked && (
                            <Lock className="w-5 h-5 text-slate-500" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span>{topic.total_questions} questions</span>
                          {topic.difficulty && (
                            <MagicBadge 
                              variant={getDifficultyVariant(topic.difficulty)} 
                              size="sm"
                            >
                              {topic.difficulty}
                            </MagicBadge>
                          )}
                        </div>
                      </div>

                      {hasProgress && (
                        <ProgressRing 
                          progress={progressPercentage} 
                          size="sm" 
                          showLabel={false}
                        />
                      )}
                    </div>

                    {/* Progress Bar */}
                    {hasProgress && topicProgress && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          {topicProgress.questions_correct} / {topicProgress.questions_attempted} correct
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    <MagicButton
                      variant={isLocked ? 'ghost' : 'secondary'}
                      size="sm"
                      className="w-full"
                      disabled={isLocked}
                    >
                      {isLocked ? 'Locked' : hasProgress ? 'Continue' : 'Start'} →
                    </MagicButton>
                  </MagicCard>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No topics found
            </h3>
            <p className="text-slate-400">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
