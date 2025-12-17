'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
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
  CheckCircle2,
  XCircle,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';

export default function TestModePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, 'A' | 'B' | 'C' | 'D' | 'E'>>(new Map());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(Date.now());

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
  
  // Determine if we should show the passage
  const shouldShowPassage = !!(currentQuestion?.passage && (
    !previousQuestion ||
    previousQuestion.passage_id !== currentQuestion.passage_id
  ));

  function handleAnswerSelect(answer: 'A' | 'B' | 'C' | 'D' | 'E') {
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
  }

  function handleNavigateToQuestion(index: number) {
    setCurrentIndex(index);
  }

  async function handleSubmit() {
    try {
      setShowSubmitConfirm(false);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      let correct = 0;

      // Record all answers
      for (const question of questions) {
        const userAnswer = answers.get(question.id);
        if (userAnswer) {
          const isCorrect = userAnswer === question.correct_answer;
          if (isCorrect) correct++;

          await createSessionAnswer({
            sessionId: sessionId,
            questionId: question.id,
            userAnswer: userAnswer as 'A' | 'B' | 'C' | 'D',
            isCorrect,
            timeSpentSeconds: Math.floor(timeSpent / questions.length),
            hintUsed: false,
            solutionViewed: false,
          });
        }
      }

      // Complete session
      const scorePercentage = (correct / questions.length) * 100;
      await completeSession(sessionId, scorePercentage);

      // Navigate to results
      router.push(`/results/${sessionId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your test...</p>
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

  const answeredCount = answers.size;
  const unansweredCount = questions.length - answeredCount;

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
                <h1 className="text-lg font-bold text-gray-900">Test Mode</h1>
              </div>
            </div>
            <Badge variant={answeredCount === questions.length ? 'success' : 'warning'}>
              {answeredCount} / {questions.length} answered
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Question Navigator */}
        <Card>
          <p className="text-sm font-medium text-gray-700 mb-3">Question Navigator</p>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((question, idx) => {
              const hasPassage = !!question.passage_id;
              const hasImage = !!question.question_image_url;
              
              return (
                <button
                  key={question.id}
                  onClick={() => handleNavigateToQuestion(idx)}
                  className={`
                    relative aspect-square rounded-lg font-semibold text-sm transition-all
                    ${currentIndex === idx && 'ring-2 ring-purple-600 ring-offset-2'}
                    ${answers.has(question.id)
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {idx + 1}
                  {(hasPassage || hasImage) && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                      {hasPassage && (
                        <BookOpen className="w-3 h-3 text-blue-600 bg-white rounded-full p-0.5" />
                      )}
                      {hasImage && (
                        <ImageIcon className="w-3 h-3 text-indigo-600 bg-white rounded-full p-0.5" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Question Display Component */}
        <QuestionDisplay
          question={currentQuestion}
          showPassage={shouldShowPassage}
          selectedAnswer={answers.get(currentQuestion.id) || null}
          onAnswerSelect={handleAnswerSelect}
          showCorrectAnswer={false}
          questionNumber={currentIndex + 1}
          disabled={false}
        />

        {/* Submit Button */}
        <Button
          variant="success"
          size="full"
          onClick={() => setShowSubmitConfirm(true)}
          disabled={answeredCount < questions.length}
        >
          {answeredCount < questions.length
            ? `Answer ${unansweredCount} more question${unansweredCount === 1 ? '' : 's'} to submit`
            : 'Submit Test'}
        </Button>

        {/* Progress Info */}
        <Card variant="outlined" className="bg-purple-50 border-purple-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-2xl font-bold text-gray-900">{answeredCount}</p>
              </div>
              <p className="text-xs text-gray-600">Answered</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-gray-400" />
                <p className="text-2xl font-bold text-gray-900">{unansweredCount}</p>
              </div>
              <p className="text-xs text-gray-600">Remaining</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <Modal
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          title="Submit Test?"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              You have answered all {questions.length} questions. Once you submit, you cannot change your answers.
            </p>
            <p className="text-sm text-gray-600">
              Your score will be calculated and you'll see detailed results.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowSubmitConfirm(false)}
              >
                Review Answers
              </Button>
              <Button
                variant="primary"
                size="full"
                onClick={handleSubmit}
              >
                Submit Test
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
