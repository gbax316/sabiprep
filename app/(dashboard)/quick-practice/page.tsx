'use client';

import React, { useEffect, useState } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
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
  Sparkles,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuickPracticePage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<number>(0);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadTopicsForSubject(selectedSubject);
    }
  }, [selectedSubject]);

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

  async function loadTopicsForSubject(subjectId: string) {
    try {
      const topicsData = await getTopics(subjectId);
      setTopics(topicsData);
      
      // Calculate total available questions across all topics
      const totalAvailable = topicsData.reduce((sum, topic) => sum + topic.total_questions, 0);
      setAvailableQuestions(totalAvailable);
    } catch (error) {
      console.error('Error loading topics:', error);
      setTopics([]);
      setAvailableQuestions(0);
    }
  }

  async function startQuickPractice() {
    if (!userId || !selectedSubject) return;

    try {
      setStarting(true);
      
      // Check if we have enough questions available
      if (availableQuestions < questionCount) {
        alert(`Only ${availableQuestions} questions available in this subject. Please select a lower number.`);
        setStarting(false);
        return;
      }

      // Filter topics that have questions
      const topicsWithQuestions = topics.filter(t => t.total_questions > 0);
      if (topicsWithQuestions.length === 0) {
        alert('No topics with questions available for this subject');
        setStarting(false);
        return;
      }

      // Strategy: Use multiple topics if needed to ensure we get the requested count
      // Sort topics by question count (descending) to prioritize topics with more questions
      const sortedTopics = [...topicsWithQuestions].sort((a, b) => b.total_questions - a.total_questions);
      
      // Calculate how many topics we need to get enough questions
      let totalAvailable = 0;
      const selectedTopicIds: string[] = [];
      
      for (const topic of sortedTopics) {
        selectedTopicIds.push(topic.id);
        totalAvailable += topic.total_questions;
        if (totalAvailable >= questionCount) {
          break; // We have enough questions
        }
      }

      // Create a practice session with multiple topics if needed
      const session = await createSession({
        userId,
        subjectId: selectedSubject,
        topicIds: selectedTopicIds, // Use multiple topics to ensure we get enough questions
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
  const canStart = availableQuestions >= questionCount && questionCount > 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header title="Quick Practice" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MagicCard className="overflow-hidden bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-cyan-500/30">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/50">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-display text-3xl font-black text-white mb-2">Quick Practice</h1>
              <p className="text-slate-300 text-lg">
                Jump into a random practice session instantly
              </p>
            </div>
          </MagicCard>
        </motion.div>

        {/* Subject Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="font-display text-xl font-bold text-white mb-4">
            Choose a Subject
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {subjects.map((subject, idx) => (
              <motion.button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
                className={`p-4 rounded-xl border-2 transition-all text-left group ${
                  selectedSubject === subject.id
                    ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 shadow-lg shadow-cyan-500/20'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                    selectedSubject === subject.id
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500'
                      : 'bg-slate-800'
                  }`}>
                    {subject.icon || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold mb-1 truncate ${
                      selectedSubject === subject.id ? 'text-white' : 'text-slate-300'
                    }`}>
                      {subject.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {subject.total_questions} questions
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Question Count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-white">
              Number of Questions
            </h2>
            {selectedSubjectData && (
              <MagicBadge variant={canStart ? 'success' : 'warning'} size="sm">
                {availableQuestions} available
              </MagicBadge>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[5, 10, 15, 20].map((count, idx) => {
              const isAvailable = availableQuestions >= count;
              const isSelected = questionCount === count;
              
              return (
                <motion.button
                  key={count}
                  onClick={() => {
                    if (isAvailable) {
                      setQuestionCount(count);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                  disabled={!isAvailable}
                  className={`py-4 rounded-xl font-bold transition-all relative ${
                    isSelected && isAvailable
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/50 scale-105'
                      : isAvailable
                      ? 'bg-slate-900/50 border-2 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800/50'
                      : 'bg-slate-900/30 border-2 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  {count}
                  {isSelected && isAvailable && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
          {!canStart && availableQuestions > 0 && (
            <p className="text-sm text-amber-400 mt-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Only {availableQuestions} questions available. Select a lower number.
            </p>
          )}
          {availableQuestions === 0 && selectedSubjectData && (
            <p className="text-sm text-red-400 mt-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              No questions available for this subject yet.
            </p>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <MagicCard className="bg-slate-900/50 border-slate-700">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              What to Expect
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                  <Shuffle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white mb-1">Smart Topic Selection</p>
                  <p className="text-sm text-slate-400">Automatically selects topics with enough questions to meet your count</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white mb-1">Hints & Solutions</p>
                  <p className="text-sm text-slate-400">Get instant feedback with hints and detailed explanations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white mb-1">Learn at Your Pace</p>
                  <p className="text-sm text-slate-400">No time limits - take as long as you need to understand each concept</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white mb-1">Track Your Progress</p>
                  <p className="text-sm text-slate-400">Your performance is automatically saved and tracked</p>
                </div>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <MagicButton
            variant="primary"
            size="lg"
            onClick={startQuickPractice}
            disabled={!canStart || starting}
            className="w-full shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-6 h-6" />
            {starting ? 'Starting...' : canStart ? `Start ${questionCount} Question${questionCount > 1 ? 's' : ''}` : 'Not Enough Questions'}
          </MagicButton>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
