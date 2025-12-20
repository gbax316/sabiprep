'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';

type TopicSelectionMode = 'specific' | 'mix';

export default function PracticeTopicSelectPage({ 
  params 
}: { 
  params: Promise<{ subjectId: string }> 
}) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedMode, setSelectedMode] = useState<TopicSelectionMode>('mix'); // Default to mix
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  // Read question count from URL params if available, otherwise default to 20
  const [questionCount, setQuestionCount] = useState(() => {
    const countParam = searchParams?.get('count');
    return countParam ? parseInt(countParam, 10) : 20;
  });

  useEffect(() => {
    loadData();
  }, [subjectId]);

  async function loadData() {
    try {
      setLoading(true);
      const [subjectData, topicsData] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);

      setSubject(subjectData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
      router.push('/practice');
    } finally {
      setLoading(false);
    }
  }

  function toggleTopicSelection(topicId: string) {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  function handleContinue() {
    if (selectedMode === 'specific' && selectedTopicIds.size === 0) {
      alert('Please select at least one topic');
      return;
    }

    // Navigate to confirmation screen
    // For mix mode, only include topics that have questions available (limit to 20 for performance)
    const topicIds = selectedMode === 'mix' 
      ? topics.filter(t => t.total_questions > 0)
          .sort((a, b) => b.total_questions - a.total_questions)
          .slice(0, 20)
          .map(t => t.id)
      : Array.from(selectedTopicIds);
    
    if (topicIds.length === 0) {
      alert('No topics with questions available. Please select specific topics.');
      return;
    }
    
    const params = new URLSearchParams({
      subjectId,
      questionCount: questionCount.toString(),
      topicIds: topicIds.join(','),
      mode: selectedMode,
    });

    router.push(`/practice/confirm?${params.toString()}`);
  }

  // Calculate total available questions
  const totalAvailableQuestions = topics.reduce((sum, topic) => sum + topic.total_questions, 0);
  const selectedTopicsTotalQuestions = Array.from(selectedTopicIds).reduce((sum, topicId) => {
    const topic = topics.find(t => t.id === topicId);
    return sum + (topic?.total_questions || 0);
  }, 0);

  // Filter topics that have questions available
  const topicsWithQuestions = topics.filter(t => t.total_questions > 0);

  // Calculate mix distribution preview (only for topics with questions)
  // Limit to reasonable number of topics to avoid too many
  const getMixDistribution = () => {
    if (topicsWithQuestions.length === 0) return [];
    // Limit to max 20 topics for mix, prioritize topics with more questions
    const sortedTopics = [...topicsWithQuestions].sort((a, b) => b.total_questions - a.total_questions);
    const limitedTopics = sortedTopics.slice(0, Math.min(20, sortedTopics.length));
    const questionsPerTopic = Math.ceil(questionCount / limitedTopics.length);
    return limitedTopics.map(topic => ({
      topic,
      count: Math.min(questionsPerTopic, topic.total_questions),
    })).filter(item => item.count > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading topics...</p>
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

  const mixDistribution = getMixDistribution();
  const canProceed = selectedMode === 'mix' ? topicsWithQuestions.length > 0 : selectedTopicIds.size > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/practice')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="text-xl sm:text-2xl flex-shrink-0">{subject.icon || '📚'}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{subject.name}</p>
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">Select Topics</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {/* Question Count Selector */}
        <Card padding="none" className="p-4 sm:p-6 shadow-md border-gray-200/80">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
            How many questions?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[10, 20, 30, 50].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                disabled={count > totalAvailableQuestions}
                className={`
                  py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base
                  shadow-sm hover:shadow-md active:scale-95
                  ${questionCount === count
                    ? 'bg-indigo-600 text-white shadow-md'
                    : count > totalAvailableQuestions
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50/30'
                  }
                `}
              >
                {count}
              </button>
            ))}
          </div>
        </Card>

        {/* Selection Mode Toggle */}
        <Card padding="none" className="p-4 sm:p-6 shadow-md border-gray-200/80">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Choose Your Practice Style</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {/* Option A: Mix of Topics (Default/Recommended) */}
            <button
              onClick={() => {
                setSelectedMode('mix');
                setSelectedTopicIds(new Set());
              }}
              className={`
                w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200
                shadow-sm hover:shadow-md active:scale-[0.98]
                ${selectedMode === 'mix'
                  ? 'border-indigo-600 bg-indigo-50/80 shadow-md'
                  : 'border-gray-200 hover:border-indigo-200 bg-white'
                }
              `}
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex items-start gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                    transition-all
                    ${selectedMode === 'mix'
                      ? 'border-indigo-600 bg-indigo-600 shadow-sm'
                      : 'border-gray-300'
                    }
                  `}>
                    {selectedMode === 'mix' && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <h3 className="font-bold text-sm sm:text-base text-gray-900">Mix of Topics</h3>
                      <Badge variant="success" size="sm" className="text-xs">Default</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                      System generates a balanced mix from all available topics
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0 hidden sm:block" />
                </div>
                  {selectedMode === 'mix' && mixDistribution.length > 0 && (
                    <div className="w-full mt-2 sm:mt-0 sm:ml-8 p-2.5 sm:p-3 bg-white rounded-lg border border-indigo-200/80 shadow-sm overflow-hidden">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Topic Distribution Preview:
                      </p>
                      <div className="space-y-1.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1 -mr-1">
                        {mixDistribution.slice(0, 5).map(({ topic, count }) => (
                          <div key={topic.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs">
                            <span className="text-gray-600 break-words sm:truncate sm:flex-1 min-w-0 pr-1">{topic.name}</span>
                            <span className="font-semibold text-indigo-600 whitespace-nowrap flex-shrink-0">{count} Q</span>
                          </div>
                        ))}
                        {mixDistribution.length > 5 && (
                          <p className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                            ... and {mixDistribution.length - 5} more topics
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        Total: {questionCount} questions from {mixDistribution.length} topics
                      </p>
                    </div>
                  )}
              </div>
            </button>

            {/* Option B: Select Specific Topics */}
            <button
              onClick={() => setSelectedMode('specific')}
              className={`
                w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200
                shadow-sm hover:shadow-md active:scale-[0.98]
                ${selectedMode === 'specific'
                  ? 'border-indigo-600 bg-indigo-50/80 shadow-md'
                  : 'border-gray-200 hover:border-indigo-200 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`
                  w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  transition-all
                  ${selectedMode === 'specific'
                    ? 'border-indigo-600 bg-indigo-600 shadow-sm'
                    : 'border-gray-300'
                  }
                `}>
                  {selectedMode === 'specific' && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900">Select Specific Topics</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                    Choose one or multiple topics to focus on
                  </p>
                </div>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0 hidden sm:block" />
              </div>
            </button>
          </div>
        </Card>

        {/* Topic Selection (only shown for specific mode) */}
        {selectedMode === 'specific' && (
          <Card padding="none" className="p-4 sm:p-6 shadow-md border-gray-200/80">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Select Specific Topics
            </h3>
            <div className="w-full">
              <MultiSelectDropdown
                options={topicsWithQuestions.map(topic => ({
                  id: topic.id,
                  label: topic.name,
                  count: topic.total_questions,
                  difficulty: topic.difficulty || undefined,
                }))}
                selectedIds={selectedTopicIds}
                onSelectionChange={setSelectedTopicIds}
                placeholder="Select one or more topics..."
              />
            </div>
            {selectedTopicIds.size > 0 && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200/80 shadow-sm">
                <p className="text-xs sm:text-sm text-gray-700 break-words">
                  <span className="font-semibold">{selectedTopicIds.size}</span> topic(s) selected ·{' '}
                  <span className="font-semibold">{selectedTopicsTotalQuestions}</span> questions available
                </p>
                {selectedTopicsTotalQuestions < questionCount && (
                  <p className="text-xs text-amber-600 mt-1.5 break-words">
                    ⚠️ Selected topics have fewer questions than requested. Some questions may be repeated.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-4">
          <Button
            variant="outline"
            size="md"
            onClick={() => router.push('/practice')}
            className="w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px] hover:bg-red-600 hover:text-white hover:border-red-600"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleContinue}
            disabled={!canProceed || questionCount > totalAvailableQuestions}
            rightIcon={<ChevronRight className="w-5 h-5" />}
            className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
