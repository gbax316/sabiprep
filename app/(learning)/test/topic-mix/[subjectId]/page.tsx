'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, TrendingUp } from 'lucide-react';

type ExamStyle = 'waec' | 'jamb' | 'custom';

interface TopicDistribution {
  topic: Topic;
  count: number;
  percentage: number;
  remainder?: number; // For internal calculation
}

export default function TopicMixPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examStyle = (searchParams?.get('style') || 'waec') as ExamStyle;
  const customCount = searchParams?.get('count') ? parseInt(searchParams.get('count')!) : null;
  
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [distribution, setDistribution] = useState<TopicDistribution[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(50);

  useEffect(() => {
    loadSubjectData();
  }, [subjectId, examStyle, customCount]);

  async function loadSubjectData() {
    try {
      setLoading(true);
      const [subjectData, topicsData] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);
      setSubject(subjectData);
      setTopics(topicsData);

      // Calculate distribution based on exam style
      const distribution = calculateDistribution(topicsData, examStyle, customCount);
      setDistribution(distribution);
      // Calculate actual total from distribution (should match requested count)
      const calculatedTotal = distribution.reduce((sum, d) => sum + d.count, 0);
      
      // Determine expected total
      let expectedTotal = 50;
      if (examStyle === 'custom' && customCount) {
        expectedTotal = customCount;
      } else if (examStyle === 'jamb') {
        expectedTotal = 55;
      }
      
      // Verify total matches
      if (calculatedTotal !== expectedTotal) {
        console.error(
          `Distribution mismatch: calculated ${calculatedTotal}, expected ${expectedTotal}. ` +
          `Distribution: ${JSON.stringify(distribution.map(d => ({ topic: d.topic.name, count: d.count })))}`
        );
      }
      
      setTotalQuestions(calculatedTotal);
    } catch (error) {
      console.error('Error loading subject:', error);
      alert('Failed to load subject');
      router.push('/test');
    } finally {
      setLoading(false);
    }
  }

  function calculateDistribution(
    topics: Topic[],
    style: ExamStyle,
    customCount: number | null
  ): TopicDistribution[] {
    // Filter topics with questions
    const availableTopics = topics.filter(t => t.total_questions > 0);
    
    if (availableTopics.length === 0) return [];

    let totalCount = 50;
    
    if (style === 'custom' && customCount) {
      totalCount = customCount;
    } else if (style === 'jamb') {
      totalCount = 55; // JAMB typically has 50-60, using 55 as default
    }

    // Calculate proportional distribution using floor to avoid over-allocation
    const totalAvailable = availableTopics.reduce((sum, t) => sum + t.total_questions, 0);
    
    // Use floor division first, then distribute remainder
    const distribution: TopicDistribution[] = availableTopics.map(topic => {
      const proportion = topic.total_questions / totalAvailable;
      const floorCount = Math.floor(proportion * totalCount);
      
      // Cap at available questions
      const cappedCount = Math.min(floorCount, topic.total_questions);
      
      return {
        topic,
        count: Math.max(0, cappedCount),
        percentage: 0,
        remainder: (proportion * totalCount) - floorCount, // Store fractional part for remainder distribution
      };
    });

    // Calculate current total and remainder
    let currentTotal = distribution.reduce((sum, d) => sum + d.count, 0);
    let remainder = totalCount - currentTotal;
    
    // Distribute remainder to topics with highest fractional parts
    if (remainder > 0) {
      // Sort by remainder (descending), then by available capacity
      const sorted = [...distribution].sort((a, b) => {
        const aRemainder = a.remainder ?? 0;
        const bRemainder = b.remainder ?? 0;
        if (Math.abs(bRemainder - aRemainder) > 0.001) {
          return bRemainder - aRemainder;
        }
        const aCapacity = a.topic.total_questions - a.count;
        const bCapacity = b.topic.total_questions - b.count;
        return bCapacity - aCapacity;
      });
      
      // Distribute remainder one by one
      for (let i = 0; i < remainder && i < sorted.length; i++) {
        const item = sorted[i];
        const idx = distribution.findIndex(d => d.topic.id === item.topic.id);
        const availableCapacity = item.topic.total_questions - item.count;
        
        if (availableCapacity > 0) {
          distribution[idx].count++;
          currentTotal++;
        }
      }
    } else if (remainder < 0) {
      // Need to reduce - remove from topics with lowest remainder
      const sorted = [...distribution].sort((a, b) => {
        if (Math.abs(a.remainder - b.remainder) > 0.001) {
          return a.remainder - b.remainder;
        }
        return a.count - b.count;
      });
      
      for (let i = 0; i < Math.abs(remainder) && i < sorted.length; i++) {
        const item = sorted[i];
        const idx = distribution.findIndex(d => d.topic.id === item.topic.id);
        
        if (distribution[idx].count > 0) {
          distribution[idx].count--;
          currentTotal--;
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

    // Final verification and adjustment
    const finalTotal = finalDistribution.reduce((sum, d) => sum + d.count, 0);
    if (finalTotal !== totalCount) {
      // Last resort: adjust from largest topics
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
      
      // Recalculate percentages
      finalDistribution.forEach(d => {
        d.percentage = Math.round((d.count / totalCount) * 100);
      });
    }

    return finalDistribution;
  }

  function handleContinue() {
    // Store distribution info and navigate to instructions
    const topicIds = distribution.map(d => d.topic.id);
    const distributionMap = Object.fromEntries(
      distribution.map(d => [d.topic.id, d.count])
    );
    
    // Store in sessionStorage for use in test creation
    sessionStorage.setItem('testDistribution', JSON.stringify({
      topicIds,
      distribution: distributionMap,
      examStyle,
      totalQuestions,
    }));

    router.push(`/test/instructions/${subjectId}?style=${examStyle}&total=${totalQuestions}`);
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

  if (!subject || distribution.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>No topics available</p>
      </div>
    );
  }

  const styleNames = {
    waec: 'WAEC Style',
    jamb: 'JAMB Style',
    custom: 'Custom Test',
  };

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
              <p className="text-sm text-gray-600">{subject.name} - {styleNames[examStyle]}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card variant="outlined" className="bg-indigo-50 border-indigo-200">
          <div className="flex gap-3">
            <div className="text-2xl">📊</div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Your test will include:</p>
              <p className="text-sm text-gray-700">
                Questions are automatically distributed across all topics based on {styleNames[examStyle].toLowerCase()} format. This distribution cannot be modified.
              </p>
            </div>
          </div>
        </Card>

        {/* Distribution Table - Streamlined */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Question Distribution</h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span className="text-xl font-bold text-indigo-600">{totalQuestions}</span>
              <span className="text-sm text-gray-600">total</span>
            </div>
          </div>

          {/* Compact Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Topic</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Questions</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((item, idx) => (
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
                      <span className="font-semibold text-indigo-600">{item.count}</span>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className="text-sm text-gray-600">{item.percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Continue Button */}
        <Button
          variant="primary"
          size="full"
          onClick={handleContinue}
          className="py-4 text-lg"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          I Understand - Continue
        </Button>
      </div>
    </div>
  );
}
