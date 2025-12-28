'use client';

import React, { useEffect, useState, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import { QuestionNavigator } from '@/components/common/QuestionNavigator';
import {
  getSession,
  getSessionAnswers,
  getQuestionsByIds,
} from '@/lib/api';
import type { LearningSession, SessionAnswer, Question } from '@/types/database';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BookOpen,
  Home,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function QuestionReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    loadReviewData();
  }, [sessionId]);

  async function loadReviewData() {
    try {
      setLoading(true);
      const [sessionData, sessionAnswers] = await Promise.all([
        getSession(sessionId).catch(err => {
          console.error('Error fetching session:', err);
          return null;
        }),
        getSessionAnswers(sessionId).catch(err => {
          console.error('Error fetching session answers:', err);
          return [];
        }),
      ]);

      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);
      const allAnswers = sessionAnswers || [];
      setAnswers(allAnswers);

      // Get ALL question IDs from session answers, preserving order of first appearance
      // Use a Set to track seen IDs while maintaining order
      const seenIds = new Set<string>();
      const questionIds: string[] = [];
      
      allAnswers.forEach((answer) => {
        if (answer.question_id && !seenIds.has(answer.question_id)) {
          seenIds.add(answer.question_id);
          questionIds.push(answer.question_id);
        }
      });
      
      console.log(`[Review] Loading ${allAnswers.length} answers with ${questionIds.length} unique questions`);
      console.log(`[Review] Question IDs:`, questionIds);
      
      if (questionIds.length === 0) {
        // No answers found - might be a guest session without stored answers
        console.warn('No answers found for session. This might be a guest session without stored answers.');
        setQuestions([]);
        return;
      }

      // Fetch questions - handle potential batching if needed
      let questionsData: Question[] = [];
      try {
        // Supabase .in() can handle up to 100 items, but let's batch if more
        const BATCH_SIZE = 100;
        if (questionIds.length > BATCH_SIZE) {
          console.log(`[Review] Batching ${questionIds.length} questions into chunks of ${BATCH_SIZE}`);
          const batches: Question[][] = [];
          for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
            const batch = questionIds.slice(i, i + BATCH_SIZE);
            const batchQuestions = await getQuestionsByIds(batch);
            batches.push(batchQuestions);
          }
          questionsData = batches.flat();
        } else {
          questionsData = await getQuestionsByIds(questionIds);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        questionsData = [];
      }
      
      // Ensure questions are in the same order as questionIds and all are included
      const questionMap = new Map(questionsData.map(q => [q.id, q]));
      const orderedQuestions: Question[] = [];
      const missingIds: string[] = [];
      
      questionIds.forEach((id, index) => {
        const question = questionMap.get(id);
        if (question) {
          orderedQuestions.push(question);
        } else {
          missingIds.push(id);
          console.warn(`[Review] Question ${id} (index ${index}) not found in database`);
        }
      });
      
      console.log(`[Review] Results: ${orderedQuestions.length} questions loaded out of ${questionIds.length} expected`);
      console.log(`[Review] Total answers: ${allAnswers.length}, Unique questions: ${questionIds.length}`);
      
      if (missingIds.length > 0) {
        console.warn(`[Review] Missing ${missingIds.length} questions:`, missingIds.slice(0, 5), missingIds.length > 5 ? '...' : '');
        const missingAnswers = allAnswers.filter(a => missingIds.includes(a.question_id));
        console.warn(`[Review] ${missingAnswers.length} answers reference missing questions`);
      }
      
      if (orderedQuestions.length === 0 && questionIds.length > 0) {
        console.error('[Review] No questions loaded! This might indicate a data issue.');
        console.error('[Review] Question IDs requested:', questionIds.slice(0, 10), questionIds.length > 10 ? '...' : '');
      }
      
      if (orderedQuestions.length > 0) {
        console.log(`[Review] Successfully loaded ${orderedQuestions.length} questions for review`);
        console.log(`[Review] Question IDs in order:`, orderedQuestions.map(q => q.id).slice(0, 10), orderedQuestions.length > 10 ? '...' : '');
      }
      
      if (orderedQuestions.length !== questionIds.length) {
        console.error(`[Review] Mismatch: Expected ${questionIds.length} questions but got ${orderedQuestions.length}`);
      }
      
      setQuestions(orderedQuestions);
    } catch (error) {
      console.error('Error loading review data:', error);
      // Don't show alert for network errors - they're handled above
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - this might be a guest session or connectivity issue');
      }
      // Only redirect if it's not a guest session
      if (!sessionId.startsWith('guest_')) {
        router.push(`/results/${sessionId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.find(a => a.question_id === currentQuestion.id) : null;
  const isCorrect = currentAnswer?.is_correct === true;
  const userAnswer = currentAnswer?.user_answer || null;
  const correctAnswer = currentQuestion?.correct_answer || null;

  // Determine if we should show passage (only if different from previous)
  const previousQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const shouldShowPassage = !!(currentQuestion?.passage && (
    !previousQuestion ||
    previousQuestion.passage_id !== currentQuestion.passage_id
  ));

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const handleNavigateToQuestion = (index: number) => {
    goToQuestion(index);
  };

  // Handle drag end for swipe gestures
  const handleDragEnd = (event: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50; // Minimum distance to trigger swipe
    const velocityThreshold = 500; // Minimum velocity to trigger swipe

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        handlePrevious();
      } else if (info.offset.x < 0 && currentIndex < questions.length - 1) {
        // Swipe left - go to next
        handleNext();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, questions.length]);

  // Track swipe direction for animation
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');

  // Handle navigation with direction tracking
  const goToQuestion = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < questions.length) {
      setSwipeDirection(newIndex > currentIndex ? 'left' : 'right');
      setCurrentIndex(newIndex);
      setShowSolution(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Session not found</p>
          <Link href="/home">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center max-w-md px-4">
          <p className="text-slate-400 mb-2">
            {sessionId.startsWith('guest_') 
              ? 'Review is not available for guest sessions. Please sign up to save and review your answers.'
              : answers.length === 0
              ? 'No answers found for this session.'
              : `No questions found. ${answers.length} answer${answers.length !== 1 ? 's' : ''} recorded but questions could not be loaded.`}
          </p>
          {answers.length > 0 && !sessionId.startsWith('guest_') && (
            <p className="text-xs text-amber-400 mb-4">
              Check the browser console for details about missing questions.
            </p>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <Link href={`/results/${sessionId}`}>
              <Button variant="outline">Back to Results</Button>
            </Link>
            {sessionId.startsWith('guest_') && (
              <Link href="/home">
                <Button variant="primary">Sign Up</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="container-app">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link href={`/results/${sessionId}`}>
                <button
                  className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 hover:bg-white/10 rounded-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                </button>
              </Link>
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="font-display font-bold text-sm sm:text-base text-white leading-tight truncate">
                  Question Review
                </h1>
                <p className="text-xs text-slate-400 truncate">
                  {currentIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <Link href="/home">
              <button
                className="p-2 sm:p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white/5 flex-shrink-0"
                aria-label="Home"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center gap-2">
            <Badge variant={isCorrect ? 'success' : 'error'} size="sm" className="text-xs sm:text-sm">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Incorrect
                </>
              )}
            </Badge>
            <span className="text-xs sm:text-sm text-slate-400">
              Question {currentIndex + 1} of {questions.length}
              {answers.length > questions.length && (
                <span className="ml-1 text-amber-400" title={`${answers.length} total answers (some may be duplicates)`}>
                  ({answers.length} answers)
                </span>
              )}
            </span>
          </div>
          <div className="w-full max-w-[200px] sm:max-w-[300px] bg-slate-800 rounded-full h-2 sm:h-2.5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card - Single Card View with Swipe */}
        <div className="relative w-full">
          {/* Navigation Arrows - Fixed Position */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Arrow */}
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`flex-shrink-0 p-2.5 sm:p-3 rounded-full border-2 transition-all duration-200 ${
                currentIndex === 0
                  ? 'bg-slate-800/50 border-slate-700/30 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800/95 hover:bg-slate-700/95 border-slate-700/60 hover:border-cyan-500/70 text-cyan-400 shadow-lg hover:shadow-cyan-500/30 active:scale-95'
              }`}
              aria-label="Previous question"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Question Card Container */}
            <div 
              className="flex-1 overflow-hidden relative min-h-[300px]"
              style={{ touchAction: 'pan-x' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {currentQuestion && (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ 
                      x: swipeDirection === 'left' ? 300 : -300, 
                      opacity: 0,
                      scale: 0.95 
                    }}
                    animate={{ 
                      x: 0, 
                      opacity: 1,
                      scale: 1 
                    }}
                    exit={{ 
                      x: swipeDirection === 'left' ? -300 : 300, 
                      opacity: 0,
                      scale: 0.95 
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                    className="w-full"
                  >
                    <Card className="p-4 sm:p-5 md:p-6 bg-slate-900/90 border-2 border-slate-600/80 rounded-2xl shadow-2xl shadow-cyan-500/10">
                      <div className="w-full">
                        <QuestionDisplay
                          question={currentQuestion}
                          showPassage={shouldShowPassage}
                          selectedAnswer={currentAnswer?.user_answer || null}
                          showCorrectAnswer={true}
                          isReview={true}
                          questionNumber={currentIndex + 1}
                          disabled={true}
                        />
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!currentQuestion && (
                <div className="w-full flex items-center justify-center p-8">
                  <p className="text-slate-400">No question to display</p>
                </div>
              )}
            </div>

            {/* Right Arrow */}
            <button
              onClick={handleNext}
              disabled={currentIndex >= questions.length - 1}
              className={`flex-shrink-0 p-2.5 sm:p-3 rounded-full border-2 transition-all duration-200 ${
                currentIndex >= questions.length - 1
                  ? 'bg-slate-800/50 border-slate-700/30 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800/95 hover:bg-slate-700/95 border-slate-700/60 hover:border-cyan-500/70 text-cyan-400 shadow-lg hover:shadow-cyan-500/30 active:scale-95'
              }`}
              aria-label="Next question"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Swipe Hint */}
          <p className="text-center text-xs text-slate-500 mt-3">
            Swipe or use arrows to navigate • Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Answer Review Section */}
        {currentAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
          >
            <Card className={`p-4 sm:p-6 border-2 ${
              isCorrect 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 flex-shrink-0" />
                  )}
                  <h3 className={`font-bold text-base sm:text-lg ${
                    isCorrect ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    {isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className={`p-3 sm:p-4 rounded-lg border-2 ${
                    isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/40'
                      : 'bg-rose-500/20 border-rose-500/40'
                  }`}>
                    <p className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2">Your Answer</p>
                    {userAnswer ? (
                      <div>
                        <p className={`font-bold text-sm sm:text-base mb-1 ${
                          isCorrect ? 'text-emerald-200' : 'text-rose-200'
                        }`}>
                          {userAnswer}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-300">
                          {currentQuestion[`option_${userAnswer.toLowerCase()}` as keyof Question] as string}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">Not answered</p>
                    )}
                  </div>
                  {!isCorrect && correctAnswer && (
                    <div className="p-3 sm:p-4 rounded-lg border-2 bg-emerald-500/20 border-emerald-500/40">
                      <p className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2">Correct Answer</p>
                      <div>
                        <p className="font-bold text-sm sm:text-base text-emerald-200 mb-1">
                          {correctAnswer}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-300">
                          {currentQuestion[`option_${correctAnswer.toLowerCase()}` as keyof Question] as string}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Solution Section with Toggle */}
        {currentQuestion?.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-2xl">
              {/* Toggle Button */}
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 transition-colors mb-3 sm:mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {showSolution ? 'Hide Solution' : 'Show Solution'}
                  </h3>
                </div>
                {showSolution ? (
                  <ChevronUp className="w-5 h-5 text-blue-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-400" />
                )}
              </button>

              {/* Collapsible Solution Content */}
              <AnimatePresence>
                {showSolution && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 sm:pt-3">
                      <h4 className="font-semibold text-sm sm:text-base text-blue-300 mb-2 sm:mb-3">Explanation</h4>
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* Hint Section (if used) */}
        {currentAnswer?.hint_used && currentQuestion?.hint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
          >
            <Card className="p-4 sm:p-6 bg-amber-500/10 border-2 border-amber-500/30">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-amber-300 mb-2">Hint Used</h3>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                    {currentQuestion.hint}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Navigation Controls */}
        <Card className="p-4 sm:p-6 bg-slate-900/50 border-slate-700">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="min-h-12 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>

            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors text-xs sm:text-sm min-h-12"
            >
              {showNavigator ? 'Hide' : 'Show'} Navigator
            </button>

            <Button
              variant="outline"
              size="sm"
              rightIcon={<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />}
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className="min-h-12 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
            </Button>
          </div>

          {/* Question Navigator */}
          {showNavigator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="mt-4 sm:mt-6"
            >
              <QuestionNavigator
                questions={questions.map((q, idx) => {
                  const answer = answers.find(a => a.question_id === q.id);
                  let status: 'unanswered' | 'answered' | 'correct' | 'incorrect' | 'flagged' | 'current' = 'unanswered';
                  if (answer) {
                    status = answer.is_correct ? 'correct' : 'incorrect';
                  }
                  if (idx === currentIndex) {
                    status = 'current';
                  }
                  return {
                    id: q.id,
                    index: idx,
                    status,
                    hasPassage: !!q.passage,
                    hasImage: !!q.question_image_url,
                  };
                })}
                currentIndex={currentIndex}
                onNavigate={handleNavigateToQuestion}
                showResults={true}
                isOpen={true}
                variant="bottom"
              />
            </motion.div>
          )}
        </Card>

        {/* Back to Results Button */}
        <div className="flex justify-center pt-2 sm:pt-4">
          <Link href={`/results/${sessionId}`}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
              className="min-h-12 text-xs sm:text-sm"
            >
              Back to Results
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
