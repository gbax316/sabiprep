'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

type TimedExamFormat = 'speed-drill' | 'waec' | 'jamb' | 'custom';

interface TopicDistribution {
  topic: Topic;
  count: number;
  percentage: number;
  remainder?: number;
}

export default function TimedTopicMixPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examFormat = (searchParams.get('format') || 'speed-drill') as TimedExamFormat;
  const customCount = searchParams.get('count') ? parseInt(searchParams.get('count')!) : null;
  const customTime = searchParams.get('time') ? parseInt(searchParams.get('time')!) : null;
  
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [distribution, setDistribution] = useState<TopicDistribution[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState(20);

  useEffect(() => {
    loadSubjectData();
  }, [subjectId, examFormat, customCount, customTime]);

  async function loadSubjectData() {
    try {
      setLoading(true);
      const [subjectData, topicsData] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);
      setSubject(subjectData);
      setTopics(topicsData);

      // Calculate distribution based on exam format
      const { distribution: dist, totalQuestions: total, totalTime } = calculateDistribution(
        topicsData,
        examFormat,
        customCount,
        customTime
      );
      setDistribution(dist);
      setTotalQuestions(total);
      setTotalTimeMinutes(totalTime);
    } catch (error) {
      console.error('Error loading subject:', error);
      alert('Failed to load subject');
      router.push('/timed');
    } finally {
      setLoading(false);
    }
  }

  function calculateDistribution(
    topics: Topic[],
    format: TimedExamFormat,
    customCount: number | null,
    customTime: number | null
  ): { distribution: TopicDistribution[]; totalQuestions: number; totalTime: number } {
    // Filter topics with questions
    const availableTopics = topics.filter(t => t.total_questions > 0);
    
    if (availableTopics.length === 0) {
      return { distribution: [], totalQuestions: 0, totalTime: 0 };
    }

    let totalCount = 20;
    let totalTime = 20;
    
    if (format === 'custom' && customCount && customTime) {
      totalCount = customCount;
      totalTime = customTime;
    } else if (format === 'waec') {
      totalCount = 50;
      totalTime = 60;
    } else if (format === 'jamb') {
      totalCount = 60;
      totalTime = 60;
    } else if (format === 'speed-drill') {
      totalCount = 20;
      totalTime = 20;
    }

    // Calculate proportional distribution
    const totalAvailable = availableTopics.reduce((sum, t) => sum + t.total_questions, 0);
    
    const distribution: TopicDistribution[] = availableTopics.map(topic => {
      const proportion = topic.total_questions / totalAvailable;
      const floorCount = Math.floor(proportion * totalCount);
      const cappedCount = Math.min(floorCount, topic.total_questions);
      
      return {
        topic,
        count: Math.max(0, cappedCount),
        percentage: 0,
        remainder: (proportion * totalCount) - floorCount,
      };
    });

    // Distribute remainder
    let currentTotal = distribution.reduce((sum, d) => sum + d.count, 0);
    let remainder = totalCount - currentTotal;
    
    if (remainder > 0) {
      const sorted = [...distribution].sort((a, b) => {
        if (Math.abs(b.remainder! - a.remainder!) > 0.001) {
          return b.remainder! - a.remainder!;
        }
        const aCapacity = a.topic.total_questions - a.count;
        const bCapacity = b.topic.total_questions - b.count;
        return bCapacity - aCapacity;
      });
      
      for (let i = 0; i < remainder && i < sorted.length; i++) {
        const item = sorted[i];
        const idx = distribution.findIndex(d => d.topic.id === item.topic.id);
        const availableCapacity = item.topic.total_questions - item.count;
        
        if (availableCapacity > 0) {
          distribution[idx].count++;
          currentTotal++;
        }
      }
    }

    // Filter out zero-count topics and recalculate percentages
    const finalDistribution = distribution
      .filter(d => d.count > 0)
      .map(d => ({
        topic: d.topic,
        count: d.count,
        percentage: Math.round((d.count / totalCount) * 100),
      }));

    // Final verification
    const finalTotal = finalDistribution.reduce((sum, d) => sum + d.count, 0);
    if (finalTotal !== totalCount) {
      const sortedFinal = [...finalDistribution].sort((a, b) => b.count - a.count);
      let diff = totalCount - finalTotal;
      
      for (const item of sortedFinal) {
        if (diff === 0) break;
        const idx = finalDistribution.findIndex(d => d.topic.id === item.topic.id);
        
        if (diff > 0 && item.count < item.topic.total_questions) {
          finalDistribution[idx].count++;
          diff--;
        } else if (diff < 0 && item.count > 0) {
          finalDistribution[idx].count--;
          diff++;
        }
      }
      
      finalDistribution.forEach(d => {
        d.percentage = Math.round((d.count / totalCount) * 100);
      });
    }

    return { distribution: finalDistribution, totalQuestions: totalCount, totalTime };
  }

  function handleContinue() {
    // Store distribution info for use in timed session creation
    const topicIds = distribution.map(d => d.topic.id);
    const distributionMap = Object.fromEntries(
      distribution.map(d => [d.topic.id, d.count])
    );
    
    // Store in sessionStorage
    sessionStorage.setItem('timedDistribution', JSON.stringify({
      topicIds,
      distribution: distributionMap,
      examFormat,
      totalQuestions,
      totalTimeMinutes,
    }));

    router.push(`/timed/instructions/${subjectId}?format=${examFormat}&total=${totalQuestions}&time=${totalTimeMinutes}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subject || distribution.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>No topics available</p>
      </div>
    );
  }

  const formatNames = {
    'speed-drill': 'Speed Drill',
    'waec': 'WAEC Simulation',
    'jamb': 'JAMB Simulation',
    'custom': 'Custom Timed',
  };

  const avgTimePerQuestion = Math.round((totalTimeMinutes * 60) / totalQuestions);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Topic Distribution</h1>
              <p className="text-sm text-gray-600">{subject.name} - {formatNames[examFormat]}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-orange-50 border-orange-200">
          <div className="flex gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Your timed test includes:</p>
              <p className="text-sm text-gray-700">
                Questions are automatically distributed across all topics based on {formatNames[examFormat].toLowerCase()} format. This distribution cannot be modified.
              </p>
            </div>
          </div>
        </Card>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Total Questions</p>
              <p className="text-4xl font-bold">{totalQuestions}</p>
            </div>
            <div className="text-center">
              <p className="text-white/90 text-sm mb-1">Time Allocation</p>
              <p className="text-4xl font-bold">{totalTimeMinutes}</p>
              <p className="text-white/90 text-sm">minutes</p>
            </div>
            <div className="text-right">
              <p className="text-white/90 text-sm mb-1">Average per Question</p>
              <p className="text-4xl font-bold">{avgTimePerQuestion}</p>
              <p className="text-white/90 text-sm">seconds</p>
            </div>
          </div>
        </Card>

        {/* Distribution Table */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Question Distribution</h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-xl font-bold text-orange-600">{totalQuestions}</span>
              <span className="text-sm text-gray-600">total</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Topic</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Questions</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Percentage</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Time Allocation</th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((item, idx) => {
                  const topicTimeMinutes = Math.round((item.count / totalQuestions) * totalTimeMinutes);
                  const topicTimeSeconds = topicTimeMinutes * 60;
                  const avgPerQuestion = Math.round(topicTimeSeconds / item.count);
                  
                  return (
                    <tr 
                      key={item.topic.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {idx % 5 === 0 && '📊'}
                            {idx % 5 === 1 && '📐'}
                            {idx % 5 === 2 && '📈'}
                            {idx % 5 === 3 && '🔢'}
                            {idx % 5 === 4 && '📉'}
                          </span>
                          <span className="font-medium text-gray-900">{item.topic.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="font-semibold text-orange-600">{item.count}</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <span className="text-sm text-gray-600">{item.percentage}%</span>
                      </td>
                      <td className="text-center py-2 px-3">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-gray-900">{topicTimeMinutes}m</span>
                          <span className="text-xs text-gray-500">~{avgPerQuestion}s/q</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Continue Button */}
        <Button
          variant="primary"
          size="full"
          onClick={handleContinue}
          className="py-4 text-lg bg-orange-600 hover:bg-orange-700"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          I Understand - Continue
        </Button>
      </div>
    </div>
  );
}
