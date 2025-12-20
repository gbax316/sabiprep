'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, BookOpen, Settings } from 'lucide-react';

type ExamStyle = 'waec' | 'jamb' | 'custom';

export default function ExamStylePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ExamStyle | null>(null);
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [showCustomOptions, setShowCustomOptions] = useState(false);

  useEffect(() => {
    loadSubjectData();
  }, [subjectId]);

  async function loadSubjectData() {
    try {
      setLoading(true);
      const [subjectData, topicsData] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);
      setSubject(subjectData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading subject:', error);
      alert('Failed to load subject');
      router.push('/test');
    } finally {
      setLoading(false);
    }
  }

  function handleStyleSelect(style: ExamStyle) {
    if (style === 'custom') {
      setShowCustomOptions(true);
      setSelectedStyle(style);
    } else {
      setSelectedStyle(style);
      // Navigate to topic mix preview with exam style
      router.push(`/test/topic-mix/${subjectId}?style=${style}`);
    }
  }

  function handleCustomCountSelect(count: number) {
    setCustomCount(count);
    router.push(`/test/topic-mix/${subjectId}?style=custom&count=${count}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading exam formats...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <p className="text-sm sm:text-base text-gray-600">Subject not found</p>
        </div>
      </div>
    );
  }

  const examStyles = [
    {
      id: 'waec' as ExamStyle,
      name: 'WAEC Style',
      description: '50 questions matching WAEC syllabus distribution',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'bg-blue-600',
      questionCount: 50,
    },
    {
      id: 'jamb' as ExamStyle,
      name: 'JAMB Style',
      description: '50-60 questions mirroring JAMB format',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'bg-purple-600',
      questionCount: 55,
    },
    {
      id: 'custom' as ExamStyle,
      name: 'Custom Test',
      description: 'Choose 20, 30, 40, or 50 questions with proportional mix',
      icon: <Settings className="w-8 h-8" />,
      color: 'bg-indigo-600',
      questionCount: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/test')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Test Mode</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{subject.name} - Choose Style</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/80 shadow-sm">
          <div className="flex gap-3">
            <div className="text-xl sm:text-2xl flex-shrink-0">📋</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Exam Style Selection</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                Choose the exam format that matches your preparation needs. The system will automatically distribute questions across all topics based on the selected style.
              </p>
            </div>
          </div>
        </Card>

        {/* Exam Style Cards */}
        <div className="space-y-3 sm:space-y-4">
          {examStyles.map((style) => (
            <Card
              key={style.id}
              className={`
                cursor-pointer transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.98]
                ${selectedStyle === style.id ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/50' : 'bg-white'}
                border-gray-200/80
              `}
              onClick={() => handleStyleSelect(style.id)}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon */}
                <div className={`${style.color} text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0 shadow-md`}>
                  <div className="w-5 h-5 sm:w-8 sm:h-8">
                    {style.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5 sm:mb-1">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{style.name}</h3>
                    {style.questionCount && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap">
                        {style.questionCount} Q
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">{style.description}</p>
                  
                  {style.id === 'custom' && showCustomOptions && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200/60">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Select number of questions:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[20, 30, 40, 50].map((count) => (
                          <button
                            key={count}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomCountSelect(count);
                            }}
                            className={`
                              py-2.5 sm:py-2 px-2 sm:px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all
                              shadow-sm hover:shadow-md active:scale-95
                              ${customCount === count
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                              }
                            `}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {style.id === 'custom' && !showCustomOptions && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {[20, 30, 40, 50].map((count) => (
                        <span
                          key={count}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                        >
                          {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {style.id !== 'custom' || !showCustomOptions ? (
                  <div className="flex-shrink-0 text-gray-400 hidden sm:block">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
