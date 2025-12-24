'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getSubject, getTopics, createSession } from '@/lib/api';
import type { Subject, Topic } from '@/types/database';
import {
  ModeSelector,
  StylePicker,
  TopicSelector,
  QuestionSlider,
  TimePicker,
  StartButton,
  type LearningMode,
  type StyleOption,
  getQuestionCountFromStyle,
  getTimeLimitFromStyle,
  type TimedStyle,
} from '@/components/learn';

export default function ConfigureLearningPage({ 
  params 
}: { 
  params: Promise<{ subjectId: string }> 
}) {
  const { subjectId } = use(params);
  const router = useRouter();
  const { userId, isGuest } = useAuth();
  
  // Loading and data states
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Configuration states
  const [selectedMode, setSelectedMode] = useState<LearningMode>('practice');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>('quick');
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimit, setTimeLimit] = useState(30); // in minutes
  const [customQuestionCount, setCustomQuestionCount] = useState(20);
  
  // Calculate max questions available
  const maxQuestions = topics.reduce((sum, topic) => sum + (topic.total_questions || 0), 0) || 100;
  
  useEffect(() => {
    loadData();
  }, [subjectId]);
  
  // Update question count when style changes
  useEffect(() => {
    if (selectedMode === 'timed') {
      if (selectedStyle === 'custom') {
        // For timed mode custom, questions and time are independent
        // Question count is controlled directly by QuestionSlider component
        // Only initialize if switching to custom for the first time (preserve existing value otherwise)
        // QuestionSlider will handle validation and limits
      } else {
        // For timed mode standard durations, use the helper function
        const count = getQuestionCountFromStyle(selectedMode, selectedStyle, undefined, subject?.name);
        setQuestionCount(Math.min(count, maxQuestions));
      }
    } else {
      // For practice and test modes
      if (selectedStyle !== 'custom') {
        const count = getQuestionCountFromStyle(selectedMode, selectedStyle, undefined, subject?.name);
        setQuestionCount(Math.min(count, maxQuestions));
      } else {
        setQuestionCount(Math.min(customQuestionCount, maxQuestions));
      }
    }
  }, [selectedStyle, selectedMode, customQuestionCount, maxQuestions, subject?.name]);
  
  // Reset style when mode changes
  useEffect(() => {
    if (selectedMode === 'practice') {
      setSelectedStyle('quick');
    } else if (selectedMode === 'test') {
      setSelectedStyle('waec');
    } else {
      setSelectedStyle('30min');
    }
  }, [selectedMode]);
  
  async function loadData() {
    try {
      setLoading(true);
      const [subjectData, topicsData] = await Promise.all([
        getSubject(subjectId),
        getTopics(subjectId),
      ]);
      
      setSubject(subjectData);
      setTopics(topicsData);
      
      // Select all topics by default
      if (topicsData.length > 0) {
        setSelectedTopicIds(new Set(topicsData.map(t => t.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      router.push('/subjects');
    } finally {
      setLoading(false);
    }
  }
  
  function handleTopicToggle(topicId: string) {
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
  
  function handleSelectAllTopics() {
    setSelectedTopicIds(new Set(topics.map(t => t.id)));
  }
  
  function handleDeselectAllTopics() {
    setSelectedTopicIds(new Set());
  }
  
  async function handleStartLearning() {
    if ((!userId && !isGuest) || !subject) return;
    if (selectedTopicIds.size === 0) {
      alert('Please select at least one topic');
      return;
    }
    
    try {
      setCreatingSession(true);
      
      const topicIdsArray = Array.from(selectedTopicIds);
      
      // Calculate time limit and question count for timed mode
      let timeLimitSeconds: number | undefined;
      let finalQuestionCount = questionCount;
      
      if (selectedMode === 'timed') {
        if (selectedStyle === 'custom') {
          timeLimitSeconds = timeLimit * 60;
          // For custom timed mode, use the question count selected directly by user via QuestionSlider
          // Questions and time are independent - don't calculate one from the other
          finalQuestionCount = Math.min(questionCount, maxQuestions);
        } else {
          timeLimitSeconds = getTimeLimitFromStyle(selectedStyle as TimedStyle);
          // Recalculate question count from style for standard timed durations
          finalQuestionCount = Math.min(
            getQuestionCountFromStyle(selectedMode, selectedStyle, undefined, subject?.name),
            maxQuestions
          );
        }
      } else if (selectedStyle === 'custom') {
        // For practice/test custom mode, use customQuestionCount
        finalQuestionCount = Math.min(customQuestionCount, maxQuestions);
      } else {
        // For practice/test standard styles, recalculate to ensure it's correct
        finalQuestionCount = Math.min(
          getQuestionCountFromStyle(selectedMode, selectedStyle, undefined, subject?.name),
          maxQuestions
        );
      }
      
      // Ensure questionCount is valid (at least 1)
      if (finalQuestionCount < 1) {
        alert('Please select a valid number of questions');
        setCreatingSession(false);
        return;
      }
      
      // For timed mode, ensure time limit is valid
      if (selectedMode === 'timed' && (!timeLimitSeconds || timeLimitSeconds < 1)) {
        alert('Please select a valid time limit');
        setCreatingSession(false);
        return;
      }
      
      // Ensure we have at least one topic
      if (topicIdsArray.length === 0) {
        alert('Please select at least one topic');
        setCreatingSession(false);
        return;
      }
      
      // Create session - always set both topicId (first topic) and topicIds (all topics)
      // This ensures fallback logic works on the timed page even if sessionStorage is lost
      const session = await createSession({
        userId: userId || '',
        subjectId: subject.id,
        topicIds: topicIdsArray, // Always pass all selected topics
        topicId: topicIdsArray[0], // Always pass first topic as fallback
        mode: selectedMode,
        totalQuestions: finalQuestionCount,
        timeLimit: timeLimitSeconds,
        isGuest: isGuest,
      });
      
      console.log('[Configure] Session created:', {
        sessionId: session.id,
        mode: selectedMode,
        totalQuestions: finalQuestionCount,
        timeLimitSeconds,
        topicCount: topicIdsArray.length,
      });
      
      // Store configuration for session pages that need it
      if (selectedMode === 'test') {
        // Calculate distribution for test mode
        const distribution = calculateDistribution(topicIdsArray, finalQuestionCount);
        sessionStorage.setItem(`testConfig_${session.id}`, JSON.stringify({
          examStyle: selectedStyle,
          distribution,
          topicIds: topicIdsArray,
          totalQuestions: finalQuestionCount,
        }));
      } else if (selectedMode === 'timed') {
        const distribution = calculateDistribution(topicIdsArray, finalQuestionCount);
        sessionStorage.setItem(`timedConfig_${session.id}`, JSON.stringify({
          distribution,
          topicIds: topicIdsArray, // Store topic IDs for fallback
          totalQuestions: finalQuestionCount,
          totalTimeMinutes: selectedStyle === 'custom' ? timeLimit : Math.floor((timeLimitSeconds || 1800) / 60),
          examFormat: selectedStyle,
        }));
      }
      
      // Navigate to session
      router.push(`/${selectedMode}/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start session. Please try again.');
      setCreatingSession(false);
    }
  }
  
  // Calculate question distribution across topics
  // Returns Record<topicId, questionCount> format for getQuestionsWithDistribution API
  // Ensures the sum of all counts equals totalQuestions
  function calculateDistribution(topicIds: string[], totalQuestions: number): Record<string, number> {
    const distribution: Record<string, number> = {};
    const questionsPerTopic = Math.floor(totalQuestions / topicIds.length);
    let remainder = totalQuestions % topicIds.length;
    
    for (const topicId of topicIds) {
      const count = questionsPerTopic + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      distribution[topicId] = count;
    }
    
    // Verify the distribution sums to totalQuestions (for debugging)
    const sum = Object.values(distribution).reduce((acc, count) => acc + count, 0);
    if (sum !== totalQuestions) {
      console.warn(
        `Distribution calculation error: requested ${totalQuestions} questions, ` +
        `but distribution sums to ${sum}. Distribution:`,
        distribution
      );
    }
    
    return distribution;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </motion.div>
      </div>
    );
  }
  
  if (!subject) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Subject not found</p>
          <button
            onClick={() => router.push('/subjects')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-2xl">{subject.icon || '📚'}</span>
            <h1 className="text-lg font-bold text-slate-800">{subject.name}</h1>
          </div>
          
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </motion.header>
      
      {/* Main Content */}
      <motion.main
        className="px-4 py-6 space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Hero banner */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium text-white/80">Configure Your Session</span>
            </div>
            <h2 className="text-2xl font-bold">Let&apos;s Learn {subject.name}</h2>
            <p className="text-white/70 text-sm mt-1">
              Customize your learning experience below
            </p>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        </motion.div>
        
        {/* Mode Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ModeSelector
            selectedMode={selectedMode}
            onModeSelect={setSelectedMode}
          />
        </motion.section>
        
        {/* Style Picker */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <StylePicker
            mode={selectedMode}
            selectedStyle={selectedStyle}
            onStyleSelect={setSelectedStyle}
            customQuestionCount={customQuestionCount}
            onCustomQuestionCountChange={setCustomQuestionCount}
            subjectName={subject?.name}
          />
        </motion.section>
        
        {/* Question Slider (show for custom style in all modes including timed) */}
        <AnimatePresence>
          {selectedStyle === 'custom' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <QuestionSlider
                mode={selectedMode}
                value={questionCount}
                onChange={setQuestionCount}
                maxQuestions={maxQuestions}
              />
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* Time Picker (only for timed mode custom) */}
        <AnimatePresence>
          {selectedMode === 'timed' && selectedStyle === 'custom' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TimePicker
                value={timeLimit}
                onChange={setTimeLimit}
              />
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* Topic Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TopicSelector
            topics={topics}
            selectedTopicIds={selectedTopicIds}
            onTopicToggle={handleTopicToggle}
            onSelectAll={handleSelectAllTopics}
            onDeselectAll={handleDeselectAllTopics}
          />
        </motion.section>
        
        {/* Summary Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm"
        >
          <h3 className="font-semibold text-slate-800 mb-3">Session Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Mode</span>
              <span className="font-medium text-slate-700 capitalize">{selectedMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Style</span>
              <span className="font-medium text-slate-700 capitalize">{selectedStyle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Topics</span>
              <span className="font-medium text-slate-700">{selectedTopicIds.size} selected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Questions</span>
              <span className="font-medium text-slate-700">{questionCount}</span>
            </div>
            {selectedMode === 'timed' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Time Limit</span>
                <span className="font-medium text-slate-700">
                  {selectedStyle === 'custom' 
                    ? `${timeLimit} min` 
                    : selectedStyle === '30min' 
                      ? '30 min'
                      : selectedStyle === '1hr'
                        ? '1 hour'
                        : selectedStyle === '2hr'
                          ? '2 hours'
                          : selectedStyle
                  }
                </span>
              </div>
            )}
          </div>
        </motion.section>
      </motion.main>
      
      {/* Start Button */}
      <StartButton
        mode={selectedMode}
        isLoading={creatingSession}
        isDisabled={selectedTopicIds.size === 0}
        onClick={handleStartLearning}
        questionCount={questionCount}
      />
    </div>
  );
}

