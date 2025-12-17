'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import {
  getSession,
  getRandomQuestions,
  getTopic,
  getSubject,
  createSessionAnswer,
  updateSession,
  completeSession,
} from '@/lib/api';
import type { LearningSession, Question, Topic, Subject } from '@/types/database';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function PracticeModePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    loadSession();
  }, [sessionId]);

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

      // Load topic and subject
      const [topicData, questionsData] = await Promise.all([
        getTopic(sessionData.topic_id!),
        getRandomQuestions(sessionData.topic_id!, sessionData.total_questions),
      ]);

      setQuestions(questionsData);
      setTopic(topicData);

      if (topicData) {
        const subjectData = await getSubject(topicData.subject_id);
        setSubject(subjectData);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Failed to load session');
      router.push('/home');
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const previousQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isAnswered = answeredQuestions.has(currentQuestion?.id || '');
  
  // Determine if we should show the passage
  // Show passage if: question has passage AND (it's first question OR different passage from previous)
  const shouldShowPassage = !!(currentQuestion?.passage && (
    !previousQuestion ||
    previousQuestion.passage_id !== currentQuestion.passage_id
  ));

  async function handleAnswerSelect(answer: 'A' | 'B' | 'C' | 'D' | 'E') {
    if (!currentQuestion || isAnswered) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correct_answer;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      // Record answer
      await createSessionAnswer({
        sessionId: sessionId,
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        hintUsed: showHint,
        solutionViewed: showSolution,
      });

      // Update local state
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestion.id));
      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
      }

      // Update session progress
      await updateSession(sessionId, {
        questions_answered: answeredQuestions.size + 1,
        correct_answers: correctAnswers + (isCorrect ? 1 : 0),
        time_spent_seconds: session ? session.time_spent_seconds + timeSpent : timeSpent,
      });

      // Show solution automatically
      setShowSolution(true);
    } catch (error) {
      console.error('Error recording answer:', error);
      alert('Failed to save answer. Please try again.');
    }
  }

  async function handleNext() {
    if (isLastQuestion) {
      // Complete session
      const scorePercentage = (correctAnswers / questions.length) * 100;
      await completeSession(sessionId, scorePercentage);
      router.push(`/results/${sessionId}`);
    } else {
      // Go to next question
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setShowSolution(false);
      setStartTime(Date.now());
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowHint(false);
      setShowSolution(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your practice session...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p>No questions available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <p className="text-sm text-gray-600">{subject?.name} - {topic?.name}</p>
                <h1 className="text-lg font-bold text-gray-900">Practice Mode</h1>
              </div>
            </div>
            <Badge variant="info">
              {currentIndex + 1} / {questions.length}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Question Display Component */}
        <QuestionDisplay
          question={currentQuestion}
          showPassage={shouldShowPassage}
          selectedAnswer={selectedAnswer}
          onAnswerSelect={handleAnswerSelect}
          showCorrectAnswer={isAnswered}
          questionNumber={currentIndex + 1}
          disabled={isAnswered}
        />

        {/* Hint Button */}
        {!isAnswered && currentQuestion.hint && (
          <Button
            variant="tertiary"
            size="md"
            leftIcon={<Lightbulb className="w-5 h-5" />}
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
        )}

        {/* Hint Box */}
        {showHint && currentQuestion.hint && (
          <Card className="bg-yellow-50 border-2 border-yellow-200">
            <div className="flex gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Hint</p>
                <p className="text-gray-700">{currentQuestion.hint}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Solution Box */}
        {showSolution && currentQuestion.explanation && (
          <Card className={
            selectedAnswer === currentQuestion.correct_answer
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-blue-50 border-2 border-blue-200'
          }>
            <div className="flex gap-3">
              <BookOpen className={`w-6 h-6 flex-shrink-0 ${
                selectedAnswer === currentQuestion.correct_answer ? 'text-green-600' : 'text-blue-600'
              }`} />
              <div>
                <p className="font-semibold text-gray-900 mb-1">
                  {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct!' : '📖 Explanation'}
                </p>
                <p className="text-gray-700 mb-2">{currentQuestion.explanation}</p>
                <p className="text-sm text-gray-600">
                  Correct answer: <span className="font-semibold">{currentQuestion.correct_answer}</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="md"
            leftIcon={<ChevronLeft className="w-5 h-5" />}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            size="full"
            rightIcon={<ChevronRight className="w-5 h-5" />}
            onClick={handleNext}
            disabled={!isAnswered}
          >
            {isLastQuestion ? 'Complete Session' : 'Next Question'}
          </Button>
        </div>

        {/* Progress Summary */}
        <Card variant="outlined" className="bg-indigo-50 border-indigo-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{answeredQuestions.size}</p>
              <p className="text-xs text-gray-600">Answered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{correctAnswers}</p>
              <p className="text-xs text-gray-600">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">
                {answeredQuestions.size > 0 ? Math.round((correctAnswers / answeredQuestions.size) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-600">Accuracy</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
