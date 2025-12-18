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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Subject not found</p>
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
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/test')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Test Mode</h1>
              <p className="text-sm text-gray-600">{subject.name} - Choose Exam Style</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <div className="text-2xl">📋</div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Exam Style Selection</p>
              <p className="text-sm text-gray-700">
                Choose the exam format that matches your preparation needs. The system will automatically distribute questions across all topics based on the selected style.
              </p>
            </div>
          </div>
        </Card>

        {/* Exam Style Cards */}
        <div className="space-y-4">
          {examStyles.map((style) => (
            <Card
              key={style.id}
              className={`
                cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02]
                ${selectedStyle === style.id ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
              `}
              onClick={() => handleStyleSelect(style.id)}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`${style.color} text-white p-4 rounded-2xl flex-shrink-0`}>
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">{style.name}</h3>
                    {style.questionCount && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
                        {style.questionCount} questions
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{style.description}</p>
                  
                  {style.id === 'custom' && showCustomOptions && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Select number of questions:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[20, 30, 40, 50].map((count) => (
                          <button
                            key={count}
                            onClick={() => handleCustomCountSelect(count)}
                            className={`
                              py-2 px-3 rounded-lg font-semibold text-sm transition-all
                              ${customCount === count
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
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
                    <div className="flex gap-2 mt-2">
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
                <div className="flex-shrink-0 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
