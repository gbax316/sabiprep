'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getTopics, createSession } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Shuffle,
  Play,
  BookOpen,
  Clock,
  Target,
} from 'lucide-react';

export default function QuickPracticePage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      const allSubjects = await getSubjects();
      setSubjects(allSubjects);
      if (allSubjects.length > 0) {
        setSelectedSubject(allSubjects[0].id);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startQuickPractice() {
    if (!userId || !selectedSubject) return;

    try {
      setStarting(true);
      
      // Get topics for the selected subject
      const topics = await getTopics(selectedSubject);
      if (topics.length === 0) {
        alert('No topics available for this subject');
        return;
      }

      // Pick a random topic
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      // Create a practice session
      const session = await createSession({
        userId,
        subjectId: selectedSubject,
        topicId: randomTopic.id,
        mode: 'practice',
        totalQuestions: questionCount,
      });

      router.push(`/practice/${session.id}`);
    } catch (error) {
      console.error('Error starting quick practice:', error);
      alert('Failed to start practice session');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Header title="Quick Practice" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Hero Card */}
        <Card className="overflow-hidden">
          <div className="gradient-primary p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Quick Practice</h1>
            <p className="text-white/80">
              Jump into a random practice session instantly
            </p>
          </div>
        </Card>

        {/* Subject Selection */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            Choose a Subject
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedSubject === subject.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{subject.name}</p>
                    <p className="text-xs text-slate-500">{subject.total_questions} questions</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
            Number of Questions
          </h2>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  questionCount === count
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-primary-500'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <Card className="bg-slate-50 border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">What to expect</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Shuffle className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-600">Random topic selection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-slate-600">Hints and explanations available</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-slate-600">No time limit - learn at your pace</span>
            </div>
          </div>
        </Card>

        {/* Start Button */}
        <Button
          variant="primary"
          size="full"
          leftIcon={<Play className="w-5 h-5" />}
          onClick={startQuickPractice}
          isLoading={starting}
          className="shadow-lg shadow-primary-500/25"
        >
          {starting ? 'Starting...' : 'Start Quick Practice'}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
