'use client';

import React, { useEffect, useState } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserProgress } from '@/lib/api';
import type { Subject, UserProgress } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, TrendingUp, Target, BookOpen, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubjectsPage() {
  const { userId, isGuest, enableGuestMode, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Enable guest mode if not authenticated
  useEffect(() => {
    if (!authLoading && !userId && !isGuest) {
      enableGuestMode();
    }
  }, [authLoading, userId, isGuest, enableGuestMode]);

  useEffect(() => {
    if (!authLoading) {
      loadSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  async function loadSubjects() {
    try {
      setLoading(true);
      setError(null);
      
      // Always load subjects (no auth required)
      const allSubjects = await getSubjects();
      setSubjects(allSubjects);
      
      // Only load progress if user is authenticated (not guest)
      if (userId && !isGuest) {
        try {
          const userProgress = await getUserProgress(userId);
          setProgress(userProgress);
        } catch (progressError) {
          // If progress loading fails, just continue without it
          console.warn('Could not load user progress:', progressError);
          setProgress([]);
        }
      } else {
        setProgress([]);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get progress for a subject (average of all topics)
  const getSubjectProgress = (subjectId: string) => {
    const subjectProgress = progress.filter(p => p.subject_id === subjectId);
    if (subjectProgress.length === 0) return null;

    const totalAccuracy = subjectProgress.reduce((sum, p) => sum + p.accuracy_percentage, 0);
    const avgAccuracy = totalAccuracy / subjectProgress.length;
    const totalQuestions = subjectProgress.reduce((sum, p) => sum + p.questions_attempted, 0);

    return {
      accuracy: Math.round(avgAccuracy),
      questionsAttempted: totalQuestions,
      topicsStarted: subjectProgress.length,
    };
  };

  const handleStartLearning = (subject: Subject) => {
    // Navigate directly to the unified configure page
    router.push(`/learn/configure/${subject.id}`);
  };

  const handleBrowseTopics = (subject: Subject) => {
    router.push(`/topics/${subject.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading subjects...</p>
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
            onClick={() => { setError(null); loadSubjects(); }}
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
            <Link href="/home">
              <MagicButton variant="ghost" size="sm">
                <ArrowLeft className="w-5 h-5" />
              </MagicButton>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-black text-white">Learning Gateway</h1>
                {isGuest && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium border border-amber-500/30">
                    Guest Mode
                  </span>
                )}
              </div>
              <p className="text-slate-400">Select a subject, then choose your learning mode</p>
            </div>
          </div>

          {/* Search with Glow Effect */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20 transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <MagicCard className="p-4 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-purple-500/10 border-cyan-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">How to Start Learning</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Click on any subject below to choose your learning mode: <span className="text-cyan-400">Practice</span> (with hints), <span className="text-amber-400">Test</span> (exam simulation), or <span className="text-orange-400">Timed</span> (speed challenge). You can also browse topics directly.
                </p>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        {/* Subjects Grid with Stagger Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject, idx) => {
            const subjectProgress = getSubjectProgress(subject.id);

            return (
                <motion.div
                key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <MagicCard 
                    hover 
                  className="p-6 space-y-4 bg-slate-900/50 border border-slate-700 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/20 relative overflow-hidden group"
                  >
                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                    <div className="relative">
                      {/* Subject Icon with Badges */}
                      <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 text-3xl group-hover:scale-110 transition-transform">
                          {subject.icon || '📚'}
                        </div>
                        {subjectProgress && (
                        <div className="flex flex-col items-end gap-2">
                          <MagicBadge variant="success" size="sm">
                            {subjectProgress.accuracy}% accuracy
                          </MagicBadge>
                          {subjectProgress.topicsStarted > 0 && (
                            <MagicBadge variant="info" size="sm">
                              {subjectProgress.topicsStarted} topics
                            </MagicBadge>
                          )}
                        </div>
                        )}
                      </div>

                      {/* Subject Info */}
                    <div className="space-y-2 mb-4">
                      <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {subject.name}
                        </h3>
                      {subject.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {subject.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {subject.total_questions} questions
                        </span>
                        {subject.exam_types && subject.exam_types.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {subject.exam_types.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                      </div>

                      {/* Progress Bar */}
                    {subjectProgress && subjectProgress.accuracy > 0 && (
                      <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Your Progress
                          </span>
                          <span className="font-semibold text-cyan-400">{subjectProgress.accuracy}%</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${subjectProgress.accuracy}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.05 }}
                            />
                          </div>
                          <p className="text-xs text-slate-500">
                          {subjectProgress.questionsAttempted} questions answered across {subjectProgress.topicsStarted} topics
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      <MagicButton 
                      variant="primary" 
                      size="md"
                      className="w-full mt-4 group-hover:scale-105 transition-transform"
                      onClick={() => handleStartLearning(subject)}
                      >
                      {subjectProgress ? 'Continue Learning' : 'Start Learning'} →
                      </MagicButton>
                    </div>
                  </MagicCard>
                </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No subjects found
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
