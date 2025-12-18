'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, createSession, getTopics } from '@/lib/api';
import type { Subject } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Flag, RotateCcw } from 'lucide-react';

export default function TestInstructionsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examStyle = searchParams.get('style') || 'waec';
  
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(50);

  useEffect(() => {
    loadSubject();
  }, [subjectId]);

  async function loadSubject() {
    try {
      setLoading(true);
      const subjectData = await getSubject(subjectId);
      setSubject(subjectData);
    } catch (error) {
      console.error('Error loading subject:', error);
      alert('Failed to load subject');
      router.push('/test');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load total questions from stored distribution
    const distributionData = sessionStorage.getItem('testDistribution');
    if (distributionData) {
      try {
        const { totalQuestions: storedTotal } = JSON.parse(distributionData);
        if (storedTotal) {
          setTotalQuestions(storedTotal);
        }
      } catch (e) {
        console.error('Error parsing distribution data:', e);
      }
    }
  }, []);

  async function handleBeginTest() {
    if (!userId || !subject) return;

    try {
      setCreatingSession(true);

      // Get distribution from sessionStorage
      const distributionData = sessionStorage.getItem('testDistribution');
      if (!distributionData) {
        alert('Distribution data not found. Please go back and try again.');
        return;
      }

      const { topicIds, distribution, examStyle: storedStyle, totalQuestions: storedTotal } = JSON.parse(distributionData);
      
      // Use the stored total questions (which matches the actual distribution)
      const actualTotalQuestions = storedTotal || totalQuestions;

      // Create session with multi-topic support
      const session = await createSession({
        userId,
        subjectId: subject.id,
        topicIds,
        mode: 'test',
        totalQuestions: actualTotalQuestions, // Use actual total from distribution
        // Store exam style in metadata (we'll add this field to sessions table)
      });

      // Store exam style and distribution in sessionStorage for the test page
      sessionStorage.setItem(`testConfig_${session.id}`, JSON.stringify({
        examStyle: storedStyle,
        distribution,
        topicIds,
        totalQuestions: actualTotalQuestions,
      }));

      // Navigate to test session
      router.push(`/test/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start test. Please try again.');
    } finally {
      setCreatingSession(false);
    }
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

  const rules = [
    {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: 'No hints or solutions during test',
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-indigo-600" />,
      text: 'You can navigate freely and flag questions',
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      text: 'No time limit, but timing is tracked',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      text: 'Review all answers before submission',
    },
  ];

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
              <h1 className="text-2xl font-bold text-gray-900">Pre-Test Instructions</h1>
              <p className="text-sm text-gray-600">{subject.name} - {totalQuestions} questions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Test Info Card */}
        <Card variant="outlined" className="bg-indigo-50 border-indigo-200">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Test Mode: Comprehensive Assessment</h2>
            <p className="text-gray-700">
              This test simulates real exam conditions with {totalQuestions} questions distributed across all topics.
            </p>
          </div>
        </Card>

        {/* Rules */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Test Rules</h3>
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">{rule.icon}</div>
                <p className="text-gray-700 flex-1">{rule.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation Info */}
        <Card variant="outlined" className="bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Flag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Navigation Features</p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Use Previous/Next buttons to move between questions</li>
                <li>Access question palette from bottom drawer</li>
                <li>Flag questions for review using the star icon</li>
                <li>Jump to any question anytime</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Begin Button */}
        <Button
          variant="primary"
          size="full"
          onClick={handleBeginTest}
          disabled={creatingSession}
          className="py-4 text-lg"
        >
          {creatingSession ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Starting Test...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Begin Test
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
