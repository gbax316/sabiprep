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

  useEffect(() => {
    loadReviewData();
  }, [sessionId]);

  async function loadReviewData() {
    try {
      setLoading(true);
      const [sessionData, sessionAnswers] = await Promise.all([
        getSession(sessionId),
        getSessionAnswers(sessionId),
      ]);

      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);
      setAnswers(sessionAnswers);

      // Get questions from session answers
      const questionIds = sessionAnswers.map(a => a.question_id);
      const questionsData = await getQuestionsByIds(questionIds);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading review data:', error);
      alert('Failed to load review data');
      router.push(`/results/${sessionId}`);
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
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateToQuestion = (index: number) => {
    setCurrentIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  if (!session || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No questions found</p>
          <Link href={`/results/${sessionId}`}>
            <Button variant="primary">Back to Results</Button>
          </Link>
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

        {/* Question Display with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            <QuestionDisplay
              question={currentQuestion}
              showPassage={shouldShowPassage}
              selectedAnswer={userAnswer}
              showCorrectAnswer={true}
              isReview={true}
              questionNumber={currentIndex + 1}
              disabled={true}
            />
          </motion.div>
        </AnimatePresence>

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

        {/* Solution Section */}
        {currentQuestion?.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-white mb-2 sm:mb-3">Explanation</h3>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
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
