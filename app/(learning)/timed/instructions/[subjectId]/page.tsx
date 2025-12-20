'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/lib/auth-context';
import { getSubject, createSession, getQuestionsWithDistribution } from '@/lib/api';
import type { Subject } from '@/types/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Clock, CheckCircle2, Zap } from 'lucide-react';

export default function TimedInstructionsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const { userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalQuestions = parseInt(searchParams?.get('total') || '20');
  const totalTimeMinutes = parseInt(searchParams?.get('time') || '20');
  
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    loadSubjectData();
  }, [subjectId]);

  async function loadSubjectData() {
    try {
      setLoading(true);
      const subjectData = await getSubject(subjectId);
      setSubject(subjectData);
    } catch (error) {
      console.error('Error loading subject:', error);
      alert('Failed to load subject');
      router.push('/timed');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartExam() {
    if ((!userId && !isGuest) || !subject) return;

    try {
      setCreatingSession(true);

      // Get distribution from sessionStorage
      const distributionStr = sessionStorage.getItem('timedDistribution');
      if (!distributionStr) {
        alert('Distribution data not found. Please go back and try again.');
        router.push('/timed');
        return;
      }

      const { topicIds, distribution, examFormat, totalQuestions: expectedTotal, totalTimeMinutes: expectedTime } = JSON.parse(distributionStr);

      // Create session with multi-topic support (guest or authenticated)
      const session = await createSession({
        userId: userId || '',
        subjectId: subject.id,
        topicIds: topicIds,
        mode: 'timed',
        totalQuestions: expectedTotal,
        timeLimit: expectedTime * 60, // Convert minutes to seconds
        isGuest: isGuest,
      });

      // Store distribution for use in timed session
      sessionStorage.setItem(`timedConfig_${session.id}`, JSON.stringify({
        distribution,
        totalQuestions: expectedTotal,
        totalTimeMinutes: expectedTime,
        examFormat,
      }));

      // Navigate to timed session
      setExamStarted(true);
      router.push(`/timed/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start timed exam. Please try again.');
      setCreatingSession(false);
    }
  }

  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins}`;
  }

  const avgTimePerQuestion = Math.round((totalTimeMinutes * 60) / totalQuestions);
  const timerFormat = formatTime(totalTimeMinutes);

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

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>Subject not found</p>
      </div>
    );
  }

  if (examStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Starting your timed exam...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Pre-Start Instructions</h1>
              <p className="text-sm text-gray-600">{subject.name} - Timed Mode</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Timer Preview Card */}
        <Card className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4" />
            <p className="text-white/90 text-sm mb-2">Timer Format</p>
            <div className="text-6xl font-bold mb-2">{timerFormat}</div>
            <p className="text-white/90 text-sm">
              {totalQuestions} questions · {avgTimePerQuestion} seconds per question average
            </p>
          </div>
        </Card>

        {/* Critical Rules */}
        <Card variant="outlined" className="border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 mb-3">Critical Rules</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Timer starts immediately</strong> when you begin</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>No hints or solutions</strong> during exam</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Cannot pause</strong> once started</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Auto-submits</strong> when time expires</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span><strong>Navigate freely</strong> but watch your time</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Time Warning System Info */}
        <Card>
          <div className="flex gap-3">
            <Clock className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 mb-3">Time Warning System</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span><strong>50% Time Mark:</strong> Progress reminder</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span><strong>10 Minutes Remaining:</strong> Modal alert with unanswered count</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span><strong>5 Minutes Remaining:</strong> Urgent reminder</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span><strong>1 Minute Remaining:</strong> Final countdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  <span><strong>30 Seconds:</strong> Urgent countdown display</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Mental Prep */}
        <Card variant="outlined" className="border-indigo-200 bg-indigo-50">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">Take a breath. You've got this! 💪</p>
            <p className="text-sm text-gray-700">
              Focus on accuracy while managing your time. Answer questions you know first, then return to challenging ones if time permits.
            </p>
          </div>
        </Card>

        {/* Start Button */}
        <Button
          variant="primary"
          size="full"
          onClick={handleStartExam}
          disabled={creatingSession}
          className="py-4 text-lg bg-orange-600 hover:bg-orange-700"
        >
          {creatingSession ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Starting...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Start Timer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
