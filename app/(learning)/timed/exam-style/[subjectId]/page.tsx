'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Clock, GraduationCap, BookOpen, Settings } from 'lucide-react';

type TimedExamFormat = 'speed-drill' | 'waec' | 'jamb' | 'custom';

export default function TimedExamStylePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<TimedExamFormat | null>(null);
  const [customCount, setCustomCount] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState<number | null>(null);
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
      router.push('/timed');
    } finally {
      setLoading(false);
    }
  }

  function handleFormatSelect(format: TimedExamFormat) {
    if (format === 'custom') {
      setShowCustomOptions(true);
      setSelectedFormat(format);
    } else {
      setSelectedFormat(format);
      // Navigate to topic mix preview with exam format
      router.push(`/timed/topic-mix/${subjectId}?format=${format}`);
    }
  }

  function handleCustomStart() {
    if (customCount && customTime) {
      router.push(`/timed/topic-mix/${subjectId}?format=custom&count=${customCount}&time=${customTime}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  const examFormats = [
    {
      id: 'speed-drill' as TimedExamFormat,
      name: 'Speed Drill',
      description: '20 questions, 20 minutes (1 min/question)',
      icon: <Zap className="w-8 h-8" />,
      color: 'bg-orange-600',
      questionCount: 20,
      timeMinutes: 20,
    },
    {
      id: 'waec' as TimedExamFormat,
      name: 'WAEC Simulation',
      description: '50 questions, 60 minutes (1.2 min/question)',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'bg-blue-600',
      questionCount: 50,
      timeMinutes: 60,
    },
    {
      id: 'jamb' as TimedExamFormat,
      name: 'JAMB Simulation',
      description: '60 questions, 60 minutes (1 min/question)',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'bg-purple-600',
      questionCount: 60,
      timeMinutes: 60,
    },
    {
      id: 'custom' as TimedExamFormat,
      name: 'Custom Timed',
      description: 'Choose question count + time allocation',
      icon: <Settings className="w-8 h-8" />,
      color: 'bg-indigo-600',
      questionCount: null,
      timeMinutes: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/timed')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Timed Mode</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{subject.name} - Choose Format</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200/80 shadow-sm">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Exam Format Selection</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                Choose the timed exam format that matches your preparation needs. The timer starts immediately when you begin and cannot be paused.
              </p>
            </div>
          </div>
        </Card>

        {/* Exam Format Cards */}
        <div className="space-y-3 sm:space-y-4">
          {examFormats.map((format) => (
            <Card
              key={format.id}
              className={`
                cursor-pointer transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.98]
                ${selectedFormat === format.id ? 'ring-2 ring-orange-500 ring-offset-2 bg-orange-50/50' : 'bg-white'}
                border-gray-200/80
              `}
              onClick={() => handleFormatSelect(format.id)}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon */}
                <div className={`${format.color} text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0 shadow-md`}>
                  <div className="w-5 h-5 sm:w-8 sm:h-8">
                    {format.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5 sm:mb-1">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{format.name}</h3>
                    {format.questionCount && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap">
                          {format.questionCount} Q
                        </span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap">
                          {format.timeMinutes}m
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">{format.description}</p>
                  
                  {format.id === 'custom' && showCustomOptions && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200/60 space-y-4">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Select number of questions:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[20, 30, 40, 50].map((count) => (
                            <button
                              key={count}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomCount(count);
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
                      
                      {customCount && (
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Select time allocation:</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[15, 30, 45, 60].map((minutes) => (
                              <button
                                key={minutes}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomTime(minutes);
                                }}
                                className={`
                                  py-2.5 sm:py-2 px-2 sm:px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all
                                  shadow-sm hover:shadow-md active:scale-95
                                  ${customTime === minutes
                                    ? 'bg-orange-600 text-white shadow-md'
                                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                                  }
                                `}
                              >
                                {minutes}m
                              </button>
                            ))}
                          </div>
                          {customCount && customTime && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200/60">
                              <p className="text-xs sm:text-sm text-indigo-900">
                                <strong>Average:</strong> {Math.round((customTime * 60) / customCount)}s per question
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {customCount && customTime && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomStart();
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                        >
                          Continue with Custom Format
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {format.id !== 'custom' || !showCustomOptions ? (
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
