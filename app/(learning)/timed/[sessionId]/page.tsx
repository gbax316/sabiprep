'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import { Modal } from '@/components/common/Modal';
import { QuestionNavigator } from '@/components/common/QuestionNavigator';
import { useTimer } from '@/hooks/useTimer';
import {
  getSession,
  getRandomQuestions,
  getQuestionsWithDistribution,
  getTopic,
  getSubject,
  getTopics,
  createSessionAnswer,
  updateSession,
  completeSessionWithGoals,
} from '@/lib/api';
import type { LearningSession, Question, Topic, Subject } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  ArrowRight,
  Timer,
  Send,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';

interface QuestionTimeData {
  questionId: string;
  startTime: number;
  timeSpent: number;
  answerChanges: number;
}

export default function TimedModePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, 'A' | 'B' | 'C' | 'D' | 'E'>>(new Map());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPreviousWarning, setShowPreviousWarning] = useState(false);
  const [questionTimes, setQuestionTimes] = useState<Map<string, QuestionTimeData>>(new Map());
  const [examStarted, setExamStarted] = useState(false);
  const [warningsShown, setWarningsShown] = useState({
    halfTime: false,
    tenMinutes: false,
    fiveMinutes: false,
    oneMinute: false,
    thirtySeconds: false,
  });
  const questionStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number | null>(null);

  // Get total time limit from session (in seconds)
  const totalTimeSeconds = session?.time_limit_seconds || 0;

  const { time: timeRemaining, isRunning, start, stop, reset, formattedTime, progress } = useTimer({
    initialTime: 0, // Start with 0, will be reset when session loads
    countDown: true,
    autoStart: false,
    onTimeUp: () => {
      if (!sessionComplete) {
        handleAutoSubmit();
      }
    },
    onTick: (time) => {
      checkTimeWarnings(time);
    },
  });

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Start timer when exam starts (only if timer has been reset to correct time)
  useEffect(() => {
    if (examStarted && !isRunning && totalTimeSeconds > 0 && timeRemaining === totalTimeSeconds) {
      // Timer has been reset to correct time, now start it
      start();
      sessionStartTimeRef.current = Date.now();
    }
  }, [examStarted, isRunning, start, totalTimeSeconds, timeRemaining]);

  useEffect(() => {
    // Reset question start time when navigating
    questionStartTimeRef.current = Date.now();
    
    // Update question time tracking
    const currentQ = questions[currentIndex];
    if (currentQ && !questionTimes.has(currentQ.id)) {
      setQuestionTimes(prev => new Map(prev).set(currentQ.id, {
        questionId: currentQ.id,
        startTime: Date.now(),
        timeSpent: 0,
        answerChanges: 0,
      }));
    }
  }, [currentIndex, questions, questionTimes]);

  async function loadSession() {
    try {
      setLoading(true);
      const sessionData = await getSession(sessionId);
      
      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);

      // Load all data in parallel for maximum performance
      let questionsPromise: Promise<Question[]>;
      let topicsPromise: Promise<Topic[]>;

      if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        // Multi-topic session - check for distribution in sessionStorage
        const timedConfigStr = sessionStorage.getItem(`timedConfig_${sessionId}`);
        if (timedConfigStr) {
          const { distribution } = JSON.parse(timedConfigStr);
          questionsPromise = getQuestionsWithDistribution(distribution);
        } else {
          // Fallback to balanced distribution
          questionsPromise = getRandomQuestionsFromTopics(
            sessionData.topic_ids,
            sessionData.total_questions
          );
        }
        topicsPromise = getTopics(sessionData.subject_id).then(allTopics =>
          allTopics.filter(t => sessionData.topic_ids!.includes(t.id))
        );
      } else {
        // Single topic session (backward compatible)
        const topicId = sessionData.topic_id || sessionData.topic_ids?.[0];
        if (topicId) {
          questionsPromise = getRandomQuestions(topicId, sessionData.total_questions);
          topicsPromise = getTopic(topicId).then(t => t ? [t] : []);
        } else {
          questionsPromise = Promise.resolve([]);
          topicsPromise = Promise.resolve([]);
        }
      }

      // Load everything in parallel
      const [subjectData, questionsData, topicsData] = await Promise.all([
        getSubject(sessionData.subject_id),
        questionsPromise,
        topicsPromise,
      ]);

      setSubject(subjectData);
      setQuestions(questionsData);
      setTopics(topicsData);
      if (topicsData.length > 0) {
        // Set first topic for display
      }

      // Reset timer first, then start exam after a brief delay
      // This ensures the timer is properly initialized before starting
      if (sessionData.time_limit_seconds && sessionData.time_limit_seconds > 0) {
        reset(sessionData.time_limit_seconds);
        // Small delay to ensure timer state is updated
        setTimeout(() => {
          setExamStarted(true);
        }, 50);
      } else {
        // No time limit set, start immediately (backward compatibility)
        setExamStarted(true);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Failed to load session');
      router.push('/home');
    } finally {
      setLoading(false);
    }
  }

  function checkTimeWarnings(timeRemaining: number) {
    const totalSeconds = session?.time_limit_seconds || 0;
    const halfTime = totalSeconds / 2;
    const tenMinutes = 10 * 60;
    const fiveMinutes = 5 * 60;
    const oneMinute = 60;
    const thirtySeconds = 30;

    if (!warningsShown.halfTime && timeRemaining <= halfTime && timeRemaining > halfTime - 60) {
      setWarningsShown(prev => ({ ...prev, halfTime: true }));
      // Show subtle banner (can be enhanced with a toast)
    }

    if (!warningsShown.tenMinutes && timeRemaining <= tenMinutes && timeRemaining > tenMinutes - 60) {
      setWarningsShown(prev => ({ ...prev, tenMinutes: true }));
      // Show modal (handled in render)
    }

    if (!warningsShown.fiveMinutes && timeRemaining <= fiveMinutes && timeRemaining > fiveMinutes - 60) {
      setWarningsShown(prev => ({ ...prev, fiveMinutes: true }));
      // Show modal (handled in render)
    }

    if (!warningsShown.oneMinute && timeRemaining <= oneMinute && timeRemaining > oneMinute - 60) {
      setWarningsShown(prev => ({ ...prev, oneMinute: true }));
      // Show urgent modal (handled in render)
    }

    if (!warningsShown.thirtySeconds && timeRemaining <= thirtySeconds && timeRemaining > thirtySeconds - 60) {
      setWarningsShown(prev => ({ ...prev, thirtySeconds: true }));
      // Show countdown (handled in render)
    }
  }

  async function handleAnswerSelect(answer: 'A' | 'B' | 'C' | 'D' | 'E') {
    if (sessionComplete) return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const previousAnswer = answers.get(currentQ.id);
    const isChangingAnswer = previousAnswer !== undefined && previousAnswer !== answer;

    // Update answer
    setAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(currentQ.id, answer);
      return newMap;
    });

    // Track answer changes
    if (isChangingAnswer) {
      setQuestionTimes(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(currentQ.id);
        if (existing) {
          newMap.set(currentQ.id, {
            ...existing,
            answerChanges: existing.answerChanges + 1,
          });
        }
        return newMap;
      });
    }

    // Calculate time spent on this question
    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    
    // Update question time tracking
    setQuestionTimes(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(currentQ.id);
      if (existing) {
        newMap.set(currentQ.id, {
          ...existing,
          timeSpent: timeSpent,
        });
      }
      return newMap;
    });

    const isCorrect = answer === currentQ.correct_answer;
    if (isCorrect && !previousAnswer) {
      setCorrectAnswers(prev => prev + 1);
    } else if (!isCorrect && previousAnswer === currentQ.correct_answer) {
      setCorrectAnswers(prev => Math.max(0, prev - 1));
    }

    // Record answer immediately (don't wait)
    try {
      await createSessionAnswer({
        sessionId: sessionId,
        questionId: currentQ.id,
        userAnswer: answer as 'A' | 'B' | 'C' | 'D',
        isCorrect,
        timeSpentSeconds: timeSpent,
        hintUsed: false,
        solutionViewed: false,
      });

      // Update session progress
      await updateSession(sessionId, {
        questions_answered: answers.size + (previousAnswer ? 0 : 1),
        correct_answers: correctAnswers + (isCorrect && !previousAnswer ? 1 : 0) - (!isCorrect && previousAnswer === currentQ.correct_answer ? 1 : 0),
      });
    } catch (error) {
      console.error('Error recording answer:', error);
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      // Show subtle warning when going back
      if (currentIndex > 0 && !showPreviousWarning) {
        setShowPreviousWarning(true);
        setTimeout(() => setShowPreviousWarning(false), 3000);
      }
      setCurrentIndex(prev => prev - 1);
    }
  }

  function handleJumpToQuestion(index: number) {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setShowPalette(false);
    }
  }

  async function handleSubmit() {
    await finishSession();
  }

  async function handleAutoSubmit() {
    setSessionComplete(true);
    stop();

    // Submit all answered questions
    const unansweredCount = questions.length - answers.size;
    
    // Calculate final score
    const finalCorrect = Array.from(answers.entries()).reduce((count, [questionId, answer]) => {
      const question = questions.find(q => q.id === questionId);
      return count + (question && answer === question.correct_answer ? 1 : 0);
    }, 0);

    const scorePercentage = (finalCorrect / questions.length) * 100;
    
    // Update session with final time
    const totalTimeSpent = session?.time_limit_seconds ? session.time_limit_seconds - timeRemaining : 0;
    await updateSession(sessionId, {
      questions_answered: answers.size,
      correct_answers: finalCorrect,
      time_spent_seconds: totalTimeSpent,
    });

    await completeSessionWithGoals(
      sessionId,
      scorePercentage,
      totalTimeSpent,
      finalCorrect,
      questions.length,
      userId || undefined
    );
    
    // Show brief overlay before redirect
    setTimeout(() => {
      router.push(`/results/${sessionId}`);
    }, 2000);
  }

  async function finishSession() {
    setSessionComplete(true);
    stop();

    // Calculate final score
    const finalCorrect = Array.from(answers.entries()).reduce((count, [questionId, answer]) => {
      const question = questions.find(q => q.id === questionId);
      return count + (question && answer === question.correct_answer ? 1 : 0);
    }, 0);

    const scorePercentage = (finalCorrect / questions.length) * 100;
    
    // Update session with final time
    const totalTimeSpent = session?.time_limit_seconds ? session.time_limit_seconds - timeRemaining : 0;
    await updateSession(sessionId, {
      questions_answered: answers.size,
      correct_answers: finalCorrect,
      time_spent_seconds: totalTimeSpent,
    });

    await completeSessionWithGoals(
      sessionId,
      scorePercentage,
      totalTimeSpent,
      finalCorrect,
      questions.length,
      userId || undefined
    );
    router.push(`/results/${sessionId}`);
  }

  async function handleCancel() {
    // Save current progress before canceling
    const finalCorrect = Array.from(answers.entries()).reduce((count, [questionId, answer]) => {
      const question = questions.find(q => q.id === questionId);
      return count + (question && answer === question.correct_answer ? 1 : 0);
    }, 0);

    const totalTimeSpent = session?.time_limit_seconds ? session.time_limit_seconds - timeRemaining : 0;
    
    try {
      // Update session with current progress
      await updateSession(sessionId, {
        questions_answered: answers.size,
        correct_answers: finalCorrect,
        time_spent_seconds: totalTimeSpent,
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }

    // Stop timer and navigate away
    stop();
    router.push('/timed');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading timed exam...</p>
        </div>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>No questions available</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const previousQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  
  // Determine if we should show the passage
  const shouldShowPassage = !!(currentQuestion?.passage && (
    !previousQuestion ||
    previousQuestion.passage_id !== currentQuestion.passage_id
  ));

  // Calculate pace indicator
  const expectedProgress = session.time_limit_seconds && session.time_limit_seconds > 0 
    ? (1 - (timeRemaining / session.time_limit_seconds)) * 100 
    : 0;
  const actualProgress = (currentIndex / questions.length) * 100;
  const paceDifference = actualProgress - expectedProgress;
  
  let paceStatus: 'on-track' | 'behind' | 'ahead' = 'on-track';
  let paceColor = 'text-green-600';
  if (paceDifference < -10) {
    paceStatus = 'behind';
    paceColor = 'text-amber-600';
  } else if (paceDifference > 10) {
    paceStatus = 'ahead';
    paceColor = 'text-blue-600';
  }

  // Timer color coding
  const timePercentage = session.time_limit_seconds && session.time_limit_seconds > 0 
    ? (timeRemaining / session.time_limit_seconds) * 100 
    : 100;
  
  let timerColor = 'text-green-600';
  let timerBg = 'bg-green-100';
  let timerPulse = false;
  
  if (timePercentage < 5) {
    timerColor = 'text-red-600';
    timerBg = 'bg-red-100';
    timerPulse = true;
  } else if (timePercentage < 20) {
    timerColor = 'text-red-600';
    timerBg = 'bg-red-100';
  } else if (timePercentage < 50) {
    timerColor = 'text-amber-600';
    timerBg = 'bg-amber-100';
  }

  const unansweredCount = questions.length - answers.size;
  const answeredCount = answers.size;

  // Check for time warnings to show modals
  const showTenMinuteWarning = warningsShown.tenMinutes && timeRemaining <= 10 * 60 && timeRemaining > 9 * 60;
  const showFiveMinuteWarning = warningsShown.fiveMinutes && timeRemaining <= 5 * 60 && timeRemaining > 4 * 60;
  const showOneMinuteWarning = warningsShown.oneMinute && timeRemaining <= 60 && timeRemaining > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="block sm:hidden space-y-3">
            {/* Top Row: Back, Subject & Timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => router.back()}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{subject?.name}</p>
                  <h1 className="text-base font-bold text-gray-900 truncate">Timed Mode ⚡</h1>
                </div>
              </div>
              <div className={`
                px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-all flex-shrink-0
                ${timerColor} ${timerBg} ${timerPulse ? 'animate-pulse' : ''}
                shadow-sm hover:shadow-md
              `}>
                <Timer className="w-4 h-4" />
                <span className="text-base">{formattedTime}</span>
              </div>
            </div>
            
            {/* Question Badge & Action Buttons */}
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm" className="flex-shrink-0">
                Q{currentIndex + 1}/{questions.length}
              </Badge>
              <div className="flex-1 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 text-gray-600 border-gray-300 hover:bg-gray-50 text-xs px-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex-1 text-orange-600 border-orange-600 text-xs px-2"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Submit
                </Button>
              </div>
            </div>

            {/* Progress Bar - Mobile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {answeredCount} answered | {unansweredCount} remaining
                </span>
                <span className={paceColor + ' text-xs'}>
                  {paceStatus === 'on-track' && '✓ On track'}
                  {paceStatus === 'behind' && '⚠️ Behind'}
                  {paceStatus === 'ahead' && '⚡ Ahead'}
                </span>
              </div>
              <ProgressBar
                value={actualProgress}
                color="primary"
                showLabel={false}
              />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:block space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <p className="text-sm text-gray-600">{subject?.name}</p>
                  <h1 className="text-lg font-bold text-gray-900">Timed Mode ⚡</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="warning" size="sm">
                  Question {currentIndex + 1} / {questions.length}
                </Badge>
                <div className={`
                  px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                  ${timerColor} ${timerBg} ${timerPulse ? 'animate-pulse' : ''}
                  shadow-sm hover:shadow-md
                `}>
                  <Timer className="w-5 h-5" />
                  <span className="text-xl">{formattedTime}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="text-orange-600 border-orange-600 hover:bg-orange-50 hover:border-orange-700 transition-all shadow-sm hover:shadow"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Submit
                </Button>
              </div>
            </div>

            {/* Progress and Pace Indicator - Desktop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {answeredCount} answered | {unansweredCount} remaining
                </span>
                <span className={paceColor}>
                  {paceStatus === 'on-track' && '✓ On track'}
                  {paceStatus === 'behind' && '⚠️ Behind pace'}
                  {paceStatus === 'ahead' && '⚡ Ahead of pace'}
                </span>
              </div>
              <ProgressBar
                value={actualProgress}
                color="primary"
                showLabel={false}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Time Warning Modals */}
      {showTenMinuteWarning && (
        <Modal
          isOpen={true}
          onClose={() => setWarningsShown(prev => ({ ...prev, tenMinutes: false }))}
          title="⏰ 10 Minutes Remaining!"
        >
          <div className="p-4">
            <p className="text-gray-700 mb-2">
              You have {unansweredCount} unanswered questions remaining.
            </p>
            <p className="text-sm text-gray-600">
              Consider prioritizing questions you can answer quickly.
            </p>
            <Button
              variant="primary"
              onClick={() => setWarningsShown(prev => ({ ...prev, tenMinutes: false }))}
              className="mt-4 w-full"
            >
              Got it
            </Button>
          </div>
        </Modal>
      )}

      {showFiveMinuteWarning && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="🚨 5 Minutes Remaining!"
        >
          <div className="p-4">
            <p className="text-gray-700">
              Prioritize unanswered questions. Time is running out!
            </p>
          </div>
        </Modal>
      )}

      {showOneMinuteWarning && (
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="⏰ FINAL MINUTE!"
        >
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-900 font-bold text-lg">
              Complete current question and review!
            </p>
          </div>
        </Modal>
      )}

      {/* Halfway Banner */}
      {warningsShown.halfTime && timeRemaining <= (session.time_limit_seconds || 0) / 2 && timeRemaining > (session.time_limit_seconds || 0) / 2 - 60 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200/60 px-4 py-3 text-center shadow-sm">
          <p className="text-sm font-medium text-amber-800">
            ⏱️ Halfway mark! You should be near question {Math.ceil(questions.length / 2)}
          </p>
        </div>
      )}

      {/* 30 Second Countdown Banner */}
      {warningsShown.thirtySeconds && timeRemaining <= 30 && (
        <div className="bg-red-600 text-white px-4 py-2 text-center animate-pulse">
          <p className="font-bold text-lg">
            {Math.floor(timeRemaining)}... {Math.max(0, Math.floor(timeRemaining) - 1)}... {Math.max(0, Math.floor(timeRemaining) - 2)}...
          </p>
        </div>
      )}

      {/* Previous Button Warning */}
      {showPreviousWarning && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200/60 px-4 py-3 text-center shadow-sm">
          <p className="text-sm font-medium text-amber-800">
            ⏰ Every second counts! Make sure you're using your time wisely.
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Question Display */}
        <QuestionDisplay
          question={currentQuestion}
          showPassage={shouldShowPassage}
          selectedAnswer={answers.get(currentQuestion.id) || null}
          onAnswerSelect={handleAnswerSelect}
          showCorrectAnswer={false}
          questionNumber={currentIndex + 1}
          disabled={sessionComplete}
        />

        {/* Navigation */}
        <Card className="shadow-lg border-gray-200/80 hover:shadow-xl transition-shadow duration-300">
          <div className="space-y-3">
            {/* Navigator Toggle Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPalette(!showPalette)}
                className="w-full sm:w-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm hover:shadow"
              >
                {showPalette ? (
                  <>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Hide Navigator</span>
                    <span className="sm:hidden text-xs">Hide Navigator</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                    <span className="hidden sm:inline">Show Navigator</span>
                    <span className="sm:hidden text-xs">Show Navigator</span>
                  </>
                )}
              </Button>
            </div>

            {/* Previous and Next Buttons - Always Side by Side */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={handlePrevious}
                disabled={currentIndex === 0 || sessionComplete}
                className="flex-1 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1 || sessionComplete}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {currentIndex === questions.length - 1 ? 'Review' : 'Next'}
              </Button>
            </div>

            {/* Submit Button - Only show when on last question */}
            {currentIndex === questions.length - 1 && (
              <div className="flex justify-center pt-3 border-t border-gray-200/60">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={sessionComplete}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  Submit Exam
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Question Navigator */}
        {showPalette && (
          <Card className="p-3 sm:p-4 shadow-lg border-gray-200/80 bg-white/95 backdrop-blur-sm">
            <QuestionNavigator
              questions={questions.map((q, index) => ({
                id: q.id,
                index: index,
                status: index === currentIndex 
                  ? 'current' 
                  : answers.has(q.id) 
                    ? 'answered' 
                    : 'unanswered',
                hasPassage: !!q.passage_id,
                hasImage: !!q.question_image_url,
              }))}
              currentIndex={currentIndex}
              onNavigate={handleJumpToQuestion}
              variant="sidebar"
            />
          </Card>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Exam?"
      >
        <div className="p-4 sm:p-6">
          <p className="text-gray-700 mb-2 text-sm sm:text-base">
            Are you sure you want to cancel this exam? Your progress will be saved.
          </p>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">
            You've answered {answeredCount} of {questions.length} questions. This session will be marked as incomplete.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelConfirm(false)}
              className="w-full sm:flex-1 order-2 sm:order-1"
            >
              Continue Exam
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCancel}
              className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 order-1 sm:order-2"
            >
              Cancel Exam
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit Early?"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-2">
            You have {formattedTime} remaining. Submit anyway?
          </p>
          <p className="text-sm text-gray-600 mb-4">
            {unansweredCount} questions will be marked as incorrect.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSubmitConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto-Submit Overlay */}
      {sessionComplete && timeRemaining === 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white p-8 text-center max-w-md">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">TIME'S UP!</h2>
            <p className="text-gray-600 mb-4">Submitting your answers...</p>
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </Card>
        </div>
      )}
    </div>
  );
}
