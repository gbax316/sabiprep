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
import { ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubjectsPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadSubjects() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const [allSubjects, userProgress] = await Promise.all([
        getSubjects(),
        getUserProgress(userId),
      ]);

      setSubjects(allSubjects);
      setProgress(userProgress);
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
            <div>
              <h1 className="font-display text-3xl font-black text-white">All Subjects</h1>
              <p className="text-slate-400">Choose your learning path</p>
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
        {/* Subjects Grid with Stagger Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject, idx) => {
            const subjectProgress = getSubjectProgress(subject.id);

            return (
              <Link key={subject.id} href={`/topics/${subject.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <MagicCard 
                    hover 
                    className="p-6 space-y-4 bg-slate-900/50 border border-slate-700 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/20"
                  >
                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                    <div className="relative">
                      {/* Subject Icon with Badges */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 text-2xl">
                          {subject.icon || '📚'}
                        </div>
                        {subjectProgress && (
                          <MagicBadge variant="success" size="sm">
                            {subjectProgress.accuracy}% accuracy
                          </MagicBadge>
                        )}
                      </div>

                      {/* Subject Info */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-white">
                          {subject.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {subject.total_questions} questions
                        </p>
                      </div>

                      {/* Progress Bar */}
                      {subjectProgress && (
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Progress</span>
                            <span>{subjectProgress.accuracy}%</span>
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
                            {subjectProgress.topicsStarted} topics started · {subjectProgress.questionsAttempted} questions answered
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      <MagicButton 
                        variant="secondary" 
                        size="sm"
                        className="w-full mt-4"
                      >
                        {subjectProgress ? 'Continue' : 'Start Learning'} →
                      </MagicButton>
                    </div>
                  </MagicCard>
                </motion.div>
              </Link>
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
