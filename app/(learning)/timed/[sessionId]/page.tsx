'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { useTimer } from '@/hooks/useTimer';
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
  Zap,
  Timer,
} from 'lucide-react';

export default function TimedModePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const TIME_PER_QUESTION = 30; // 30 seconds
  const { time: timeLeft, isRunning, start, reset } = useTimer({
    initialTime: TIME_PER_QUESTION,
    countDown: true,
    onTimeUp: () => {
      if (!sessionComplete) {
        handleTimeUp();
      }
    },
  });

  useEffect(() => {
    loadSession();
  }, [params.sessionId]);

  useEffect(() => {
    if (questions.length > 0 && !sessionComplete) {
      start();
    }
  }, [questions, sessionComplete, start]);

  async function loadSession() {
    try {
      setLoading(true);
      const sessionData = await getSession(params.sessionId);
      
      if (!sessionData) {
        alert('Session not found');
        router.push('/home');
        return;
      }

      setSession(sessionData);

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

  async function handleAnswerSelect(answer: 'A' | 'B' | 'C' | 'D') {
    if (sessionComplete || selectedAnswer) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correct_answer;
    const timeSpent = TIME_PER_QUESTION - timeLeft;

    try {
      // Record answer
      await createSessionAnswer({
        sessionId: params.sessionId,
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        hintUsed: false,
        solutionViewed: false,
      });

      if (isCorrect) {
        setCorrectAnswers(prev => prev + 1);
      }

      // Update session progress
      await updateSession(params.sessionId, {
        questions_answered: currentIndex + 1,
        correct_answers: correctAnswers + (isCorrect ? 1 : 0),
        time_spent_seconds: session ? session.time_spent_seconds + timeSpent : timeSpent,
      });

      // Wait a moment to show result, then advance
      setTimeout(() => {
        handleNext();
      }, 1500);
    } catch (error) {
      console.error('Error recording answer:', error);
    }
  }

  async function handleTimeUp() {
    // Time ran out, move to next question without answering
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      reset();
      start();
    } else {
      await finishSession();
    }
  }

  async function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      reset();
      start();
    } else {
      await finishSession();
    }
  }

  async function finishSession() {
    setSessionComplete(true);
    const scorePercentage = (correctAnswers / questions.length) * 100;
    await completeSession(params.sessionId, scorePercentage);
    router.push(`/results/${params.sessionId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading timed challenge...</p>
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

  const timePercentage = (timeLeft / TIME_PER_QUESTION) * 100;
  const isLowTime = timeLeft <= 10;

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
                <h1 className="text-lg font-bold text-gray-900">Timed Challenge ⚡</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="warning">
                {currentIndex + 1} / {questions.length}
              </Badge>
              <div className={`
                px-4 py-2 rounded-full font-bold flex items-center gap-2
                ${isLowTime ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}
              `}>
                <Timer className="w-5 h-5" />
                <span>{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Timer Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                isLowTime ? 'bg-red-600' : 'bg-orange-600'
              }`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Score Card */}
        <Card variant="gradient" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Current Score</p>
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8" />
                <p className="text-4xl font-bold">{correctAnswers}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/90 text-sm">Accuracy</p>
              <p className="text-3xl font-bold">
                {currentIndex > 0 ? Math.round((correctAnswers / currentIndex) * 100) : 0}%
              </p>
            </div>
          </div>
        </Card>

        {/* Question Card */}
        <Card variant="elevated">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="neutral">Question {currentIndex + 1}</Badge>
              {currentQuestion.difficulty && (
                <Badge variant={
                  currentQuestion.difficulty === 'Easy' ? 'success' :
                  currentQuestion.difficulty === 'Medium' ? 'warning' :
                  'error'
                }>
                  {currentQuestion.difficulty}
                </Badge>
              )}
            </div>

            <div className="prose max-w-none">
              <p className="text-lg text-gray-900 font-medium leading-relaxed">
                {currentQuestion.question_text}
              </p>
            </div>

            {currentQuestion.question_image_url && (
              <img
                src={currentQuestion.question_image_url}
                alt="Question"
                className="max-w-full rounded-lg"
              />
            )}
          </div>
        </Card>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {(['A', 'B', 'C', 'D'] as const).map((key) => {
            const optionText = currentQuestion[`option_${key.toLowerCase()}` as keyof Question] as string;
            const isSelected = selectedAnswer === key;
            const isCorrect = key === currentQuestion.correct_answer;
            const showResult = selectedAnswer !== null;

            return (
              <button
                key={key}
                onClick={() => !selectedAnswer && handleAnswerSelect(key)}
                disabled={selectedAnswer !== null}
                className={`
                  w-full p-4 rounded-xl text-left transition-all
                  ${!showResult && !isSelected && 'bg-white border-2 border-gray-200 hover:border-orange-600 hover:shadow-md'}
                  ${!showResult && isSelected && 'bg-orange-50 border-2 border-orange-600'}
                  ${showResult && isCorrect && 'bg-green-50 border-2 border-green-600'}
                  ${showResult && isSelected && !isCorrect && 'bg-red-50 border-2 border-red-600'}
                  ${showResult && !isSelected && !isCorrect && 'bg-gray-50 border-2 border-gray-200'}
                  ${selectedAnswer && 'cursor-not-allowed'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0
                    ${!showResult && isSelected && 'bg-orange-600 text-white'}
                    ${!showResult && !isSelected && 'bg-gray-200 text-gray-700'}
                    ${showResult && isCorrect && 'bg-green-600 text-white'}
                    ${showResult && isSelected && !isCorrect && 'bg-red-600 text-white'}
                    ${showResult && !isSelected && !isCorrect && 'bg-gray-300 text-gray-600'}
                  `}>
                    {key}
                  </div>
                  <span className="flex-1 text-gray-900">{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Banner */}
        <Card variant="outlined" className="border-orange-200 bg-orange-50">
          <div className="flex gap-3">
            <Zap className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Quick Tip</p>
              <p className="text-sm text-gray-700">
                Answer as many questions correctly as you can. The timer resets for each question!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
