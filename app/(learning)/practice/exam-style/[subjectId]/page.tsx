'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lightbulb, BookOpen, Settings, Target } from 'lucide-react';

type PracticeStyle = 'quick' | 'comprehensive' | 'custom';

export default function PracticeExamStylePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<PracticeStyle | null>(null);
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
      router.push('/practice');
    } finally {
      setLoading(false);
    }
  }

  function handleStyleSelect(style: PracticeStyle) {
    if (style === 'custom') {
      setShowCustomOptions(true);
      setSelectedStyle(style);
    } else {
      setSelectedStyle(style);
      // Navigate to topic select page with practice style
      router.push(`/practice/topic-select/${subjectId}?style=${style}`);
    }
  }

  function handleCustomCountSelect(count: number) {
    setCustomCount(count);
    router.push(`/practice/topic-select/${subjectId}?style=custom&count=${count}`);
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

  const practiceStyles = [
    {
      id: 'quick' as PracticeStyle,
      name: 'Quick Practice',
      description: '10-20 questions for a quick review session',
      icon: <Lightbulb className="w-8 h-8" />,
      color: 'bg-blue-600',
      questionCount: 15,
    },
    {
      id: 'comprehensive' as PracticeStyle,
      name: 'Comprehensive Practice',
      description: '30-50 questions covering multiple topics',
      icon: <Target className="w-8 h-8" />,
      color: 'bg-indigo-600',
      questionCount: 40,
    },
    {
      id: 'custom' as PracticeStyle,
      name: 'Custom Practice',
      description: 'Choose 10, 20, 30, or 50 questions',
      icon: <Settings className="w-8 h-8" />,
      color: 'bg-purple-600',
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
              onClick={() => router.push('/practice')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Practice Mode</h1>
              <p className="text-sm text-gray-600">{subject.name} - Choose Practice Style</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Practice Style Selection</p>
              <p className="text-sm text-gray-700">
                Choose how you want to practice. You can select specific topics or let the system create a balanced mix across all topics.
              </p>
            </div>
          </div>
        </Card>

        {/* Practice Style Cards */}
        <div className="space-y-4">
          {practiceStyles.map((style) => (
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
                        ~{style.questionCount} questions
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{style.description}</p>
                  
                  {style.id === 'custom' && showCustomOptions && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Select number of questions:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[10, 20, 30, 50].map((count) => (
                          <button
                            key={count}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomCountSelect(count);
                            }}
                            className={`
                              py-2 px-3 rounded-lg font-semibold text-sm transition-all
                              ${customCount === count
                                ? 'bg-purple-600 text-white'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
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
                      {[10, 20, 30, 50].map((count) => (
                        <span
                          key={count}
                          className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                        >
                          {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {style.id !== 'custom' || !showCustomOptions ? (
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
