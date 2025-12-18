'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { SearchInput } from '@/components/common/Input';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserProgress } from '@/lib/api';
import type { Subject, UserProgress } from '@/types/database';
import Link from 'next/link';
import { ArrowLeft, BookOpen, TrendingUp, Play, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PracticeModePage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userId) {
      loadSubjects();
    }
  }, [userId]);

  async function loadSubjects() {
    if (!userId) return;

    try {
      setLoading(true);
      const [allSubjects, userProgress] = await Promise.all([
        getSubjects(),
        getUserProgress(userId),
      ]);

      setSubjects(allSubjects);
      setProgress(userProgress);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get progress for a subject
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

  const handleSubjectClick = (subjectId: string) => {
    // Navigate to exam style selection for practice mode
    router.push(`/practice/exam-style/${subjectId}`);
  };

  const handleBackClick = () => {
    router.push('/home');
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Practice Mode
              </h1>
              <p className="text-sm text-gray-600">
                Learn at your own pace with instant feedback and explanations
              </p>
            </div>
          </div>

          {/* Search */}
          <SearchInput
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const subjectProgress = getSubjectProgress(subject.id);

              return (
                <div
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject.id)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-xl transition-all hover:scale-[1.02] h-full">
                    <div className="space-y-4">
                      {/* Subject Icon and Name */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-5xl">{subject.icon || '📚'}</div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{subject.name}</h3>
                            {subject.exam_types && subject.exam_types.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {subject.exam_types.slice(0, 3).map((exam) => (
                                  <Badge key={exam} variant="info" size="sm">
                                    {exam}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>

                      {/* Description */}
                      {subject.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {subject.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BookOpen className="w-4 h-4" />
                          <span>{subject.total_questions} questions</span>
                        </div>

                        {subjectProgress && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                              {subjectProgress.accuracy}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {subjectProgress && (
                        <div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${subjectProgress.accuracy}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {subjectProgress.topicsStarted} topics started · {subjectProgress.questionsAttempted} questions answered
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
        </div>

        {/* Empty State for Subjects */}
        {filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No subjects found
            </h3>
            <p className="text-gray-600">
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