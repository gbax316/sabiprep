'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import { QuestionNavigator } from '@/components/common/QuestionNavigator';
import {
  getSession,
  getSessionAnswers,
  getRandomQuestions,
  getRandomQuestionsFromTopics,
  getQuestionsWithDistribution,
  getQuestionsByIds,
  getTopic,
  getSubject,
  getTopics,
  createSessionAnswer,
  updateSession,
  completeSessionWithGoals,
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import type { LearningSession, Question, Topic, Subject } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  Image as ImageIcon,
  Flag,
  ChevronUp,
  ChevronDown,
  Send,
} from 'lucide-react';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import {
  hasReachedQuestionLimit,
  incrementGuestQuestionCount,
  getSystemWideQuestionCount,
} from '@/lib/guest-session';

export default function TestModePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { userId, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, 'A' | 'B' | 'C' | 'D' | 'E'>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    // Reset question start time when navigating
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  async function loadSession() {
    try {
      setLoading(true);
      
      // Load session
      const sessionData = await getSession(sessionId);
      
      if (!sessionData) {
        console.error('Session not found:', sessionId);
        router.replace('/home');
        return;
      }

      setSession(sessionData);

      // Check if guest has reached question limit
      if (isGuest && hasReachedQuestionLimit()) {
        setShowSignupModal(true);
      }

      // FIRST: Try to restore original questions from session_answers
      const sessionAnswers = await getSessionAnswers(sessionId);
      let questionsData: Question[] = [];
      let topicsData: Topic[] = [];
      
      if (sessionAnswers.length > 0) {
        // Restore original questions
        const questionIds = sessionAnswers.map(a => a.question_id);
        questionsData = await getQuestionsByIds(questionIds);
        
        // If we got questions, use them
        if (questionsData.length > 0) {
          setQuestions(questionsData);
          
          // Restore answered state
          const answersMap = new Map<string, 'A' | 'B' | 'C' | 'D' | 'E'>();
          sessionAnswers.forEach(answer => {
            if (answer.user_answer) {
              answersMap.set(answer.question_id, answer.user_answer as 'A' | 'B' | 'C' | 'D' | 'E');
            }
          });
          setAnswers(answersMap);
          
          // Restore flagged questions
          // Note: Flagged state might not be stored in session_answers, so we'll keep current state
          
          // Load subject and topics
          const [subjectData, topicsResult] = await Promise.all([
            getSubject(sessionData.subject_id),
            sessionData.topic_ids && sessionData.topic_ids.length > 1
              ? getTopics(sessionData.subject_id).then(allTopics => 
                  allTopics.filter(t => sessionData.topic_ids!.includes(t.id))
                )
              : getTopic(sessionData.topic_id || sessionData.topic_ids?.[0] || '').then(t => t ? [t] : [])
          ]);
          
          setSubject(subjectData);
          setTopics(topicsResult);
          
          return; // Successfully restored
        }
      }
      
      // FALLBACK: If no session_answers, fetch new questions
      // This handles brand new sessions that haven't been started yet
      const testConfigStr = sessionStorage.getItem(`testConfig_${sessionId}`);
      const loadPromises: Promise<any>[] = [getSubject(sessionData.subject_id)];

      if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        // Multi-topic session - check for distribution in sessionStorage
        if (testConfigStr) {
          const { distribution, totalQuestions: expectedTotal, topicIds } = JSON.parse(testConfigStr);
          
          // Handle both array format (old) and Record format (new)
          let distributionRecord: Record<string, number>;
          if (Array.isArray(distribution)) {
            // Convert old array format to Record
            distributionRecord = {};
            distribution.forEach((item: { topicId: string; count: number }) => {
              distributionRecord[item.topicId] = item.count;
            });
          } else {
            distributionRecord = distribution;
          }
          
          // Fetch questions and validate count
          let fetchedQuestions = await getQuestionsWithDistribution(distributionRecord);
          
          // If we got fewer questions than expected, try to fetch more from any available topic
          if (fetchedQuestions.length < expectedTotal) {
            const shortfall = expectedTotal - fetchedQuestions.length;
            const existingQuestionIds = new Set(fetchedQuestions.map(q => q.id));
            
            // Try to fetch additional questions from any topic in the session
            const additionalPromises = topicIds.map((topicId: string) =>
              supabase
                .from('questions')
                .select('*')
                .eq('status', 'published')
                .eq('topic_id', topicId)
                .limit(shortfall + 10) // Get extra to filter duplicates
            );
            
            const additionalResults = await Promise.all(additionalPromises);
            for (const { data } of additionalResults) {
              if (data && fetchedQuestions.length < expectedTotal) {
                const newQuestions = data.filter((q: Question) => !existingQuestionIds.has(q.id));
                const needed = expectedTotal - fetchedQuestions.length;
                fetchedQuestions.push(...newQuestions.slice(0, needed));
                newQuestions.forEach((q: Question) => existingQuestionIds.add(q.id));
              }
            }
            
            // If still short, shuffle and take what we have (better than failing)
            if (fetchedQuestions.length < expectedTotal) {
              console.warn(
                `Could only fetch ${fetchedQuestions.length} of ${expectedTotal} questions. ` +
                `Some topics may not have enough questions available.`
              );
            }
          }
          
          // Ensure we don't exceed expected total
          if (fetchedQuestions.length > expectedTotal) {
            fetchedQuestions = fetchedQuestions.slice(0, expectedTotal);
          }
          
          loadPromises.push(Promise.resolve(fetchedQuestions));
        } else {
          // Fallback to balanced distribution
          loadPromises.push(
            getRandomQuestionsFromTopics(
              sessionData.topic_ids,
              sessionData.total_questions
            )
          );
        }
        
        // Load topics in parallel
        loadPromises.push(getTopics(sessionData.subject_id));
      } else {
        // Single topic session (backward compatible)
        const topicId = sessionData.topic_id || sessionData.topic_ids?.[0];
        if (topicId) {
          loadPromises.push(
            Promise.all([
              getTopic(topicId),
              getRandomQuestions(topicId, sessionData.total_questions),
            ])
          );
        }
      }

      const results = await Promise.all(loadPromises);
      const subjectData = results[0];
      setSubject(subjectData);

      if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        questionsData = results[1];
        const allTopics = results[2] as Topic[];
        topicsData = allTopics.filter(t => sessionData.topic_ids!.includes(t.id));
        setTopics(topicsData);
      } else {
        const topicId = sessionData.topic_id || sessionData.topic_ids?.[0];
        if (topicId) {
          const [topicData, questionsResult] = results[1] as [Topic, Question[]];
          questionsData = questionsResult;
          if (topicData) {
            topicsData = [topicData];
            setTopics([topicData]);
          }
        }
      }

      if (!questionsData || questionsData.length === 0) {
        // No questions available - this will be handled in the render section
        setQuestions([]);
      } else {
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setLoading(false);
      router.replace('/home');
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
    // Check guest question limit before allowing answer
    if (isGuest) {
      if (hasReachedQuestionLimit()) {
        setShowSignupModal(true);
        return; // Block answering
      }
      
      // Track question if this is the first time answering it
      const wasAlreadyAnswered = answers.has(currentQuestion.id);
      if (!wasAlreadyAnswered) {
        const newSystemCount = incrementGuestQuestionCount();
        if (newSystemCount >= 5) {
          setShowSignupModal(true);
        }
      }
    }
    
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
  }

  function handleNavigateToQuestion(index: number) {
    setCurrentIndex(index);
    setShowPalette(false);
  }

  function handleToggleFlag() {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestion.id)) {
      newFlagged.delete(currentQuestion.id);
    } else {
      newFlagged.add(currentQuestion.id);
    }
    setFlaggedQuestions(newFlagged);
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowPalette(false); // Close palette when navigating
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowPalette(false); // Close palette when navigating
    }
  }

  function handleShowReview() {
    setShowReviewScreen(true);
  }

  async function handleSubmit() {
    try {
      setShowSubmitConfirm(false);
      setShowReviewScreen(false);
      const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
      let correct = 0;

      // Record all answers (skip for guests)
      if (!isGuest && userId) {
        for (const question of questions) {
          const userAnswer = answers.get(question.id);
          
          if (userAnswer) {
            const isCorrect = userAnswer === question.correct_answer;
            if (isCorrect) correct++;

            await createSessionAnswer({
              sessionId: sessionId,
              questionId: question.id,
              topicId: question.topic_id, // Store topic_id for analytics
              userAnswer: userAnswer as 'A' | 'B' | 'C' | 'D',
              isCorrect,
              timeSpentSeconds: Math.floor(totalTimeSpent / questions.length), // Average time per question
              hintUsed: false,
              solutionViewed: false,
              firstAttemptCorrect: isCorrect, // In test mode, first attempt is the only attempt
              attemptCount: 1,
            });
          }
        }
      } else {
        // For guests, just count correct answers
        for (const question of questions) {
          const userAnswer = answers.get(question.id);
          if (userAnswer && userAnswer === question.correct_answer) {
            correct++;
          }
        }
      }

      // Complete session with correct time and score (skip for guests)
      if (!isGuest && userId) {
        const scorePercentage = (correct / questions.length) * 100;
        await completeSessionWithGoals(
          sessionId, 
          scorePercentage, 
          totalTimeSpent,
          correct,
          questions.length,
          userId
        );
      }

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

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <p className="text-gray-600 mb-4">Session not found</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    // Get subject info for recovery
    const subjectId = session.subject_id;
    const topicId = session.topic_id || session.topic_ids?.[0];
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <p className="text-gray-600 mb-2">No questions available for this session</p>
          <p className="text-sm text-gray-500 mb-4">
            The questions for this session are no longer available.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/subjects')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Start New Session
            </button>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <p className="text-gray-600 mb-2">Unable to load current question</p>
          <p className="text-sm text-gray-500 mb-4">
            There was an error loading the question for this session.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/subjects')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Start New Session
            </button>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = answers.size;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestions.size;
  const progressPercentage = Math.round((answeredCount / questions.length) * 100);

  // Pre-submission review screen
  if (showReviewScreen) {
    const unansweredQuestions = questions
      .map((q, idx) => ({ question: q, index: idx }))
      .filter(({ question }) => !answers.has(question.id));
    
    const flaggedQuestionsList = questions
      .map((q, idx) => ({ question: q, index: idx }))
      .filter(({ question }) => flaggedQuestions.has(question.id));

    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Review Before Submission</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReviewScreen(false)}
              >
                Back to Test
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Statistics */}
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{answeredCount}</div>
                <div className="text-sm text-gray-600">Answered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{unansweredCount}</div>
                <div className="text-sm text-gray-600">Unanswered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{flaggedCount}</div>
                <div className="text-sm text-gray-600">Flagged</div>
              </div>
            </div>
          </Card>

          {/* Question Grid */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Questions</h2>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((question, idx) => {
                const isAnswered = answers.has(question.id);
                const isFlagged = flaggedQuestions.has(question.id);
                
                return (
                  <button
                    key={question.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowReviewScreen(false);
                    }}
                    className={`
                      relative aspect-square rounded-lg font-semibold text-sm transition-all
                      ${isAnswered 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                      }
                      ${isFlagged ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                    `}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 bg-white rounded-full p-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1">
                <Flag className="w-3 h-3 text-amber-500" />
                <span>Flagged</span>
              </div>
            </div>
          </Card>

          {/* Filters */}
          {(unansweredQuestions.length > 0 || flaggedQuestionsList.length > 0) && (
            <div className="flex gap-2">
              {unansweredQuestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentIndex(unansweredQuestions[0].index);
                    setShowReviewScreen(false);
                  }}
                >
                  Show Unanswered ({unansweredQuestions.length})
                </Button>
              )}
              {flaggedQuestionsList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentIndex(flaggedQuestionsList[0].index);
                    setShowReviewScreen(false);
                  }}
                >
                  Show Flagged ({flaggedQuestionsList.length})
                </Button>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="full"
              onClick={() => setShowReviewScreen(false)}
            >
              Review Questions
            </Button>
            <Button
              variant="primary"
              size="full"
              onClick={() => {
                if (unansweredCount > 0) {
                  setShowSubmitConfirm(true);
                } else {
                  handleSubmit();
                }
              }}
            >
              <Send className="w-5 h-5 mr-2" />
              {unansweredCount > 0 ? 'Submit Anyway' : 'Submit Test'}
            </Button>
          </div>
        </div>

        {/* Warning Modal for Unanswered */}
        {showSubmitConfirm && unansweredCount > 0 && (
          <Modal
            isOpen={showSubmitConfirm}
            onClose={() => setShowSubmitConfirm(false)}
            title="Unanswered Questions"
          >
            <div className="space-y-4">
              <p className="text-gray-700">
                You have {unansweredCount} unanswered question{unansweredCount === 1 ? '' : 's'}. 
                Are you sure you want to submit?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Review Questions
                </Button>
                <Button
                  variant="primary"
                  size="full"
                  onClick={handleSubmit}
                >
                  Submit Anyway
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Signup Prompt Modal for Guests */}
        {isGuest && (
          <SignupPromptModal
            isOpen={showSignupModal}
            onClose={() => setShowSignupModal(false)}
            questionCount={getSystemWideQuestionCount()}
          />
        )}
      </div>
    );
  }

  // Main test interface
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => {
                  // For guests, navigate to home; for authenticated users, go home
                  if (isGuest || sessionId.startsWith('guest_')) {
                    router.replace('/home');
                  } else {
                    router.push('/home');
                  }
                }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{subject?.name}</p>
                <h1 className="text-sm sm:text-lg font-bold text-gray-900">Test Mode</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge variant={answeredCount === questions.length ? 'success' : 'warning'} className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                {currentIndex + 1}/{questions.length}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowReview}
                className="ml-1 sm:ml-2 text-xs sm:text-sm px-2 sm:px-3"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Review
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Progress Stats */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{answeredCount} answered | {unansweredCount} remaining</span>
            {flaggedCount > 0 && (
              <span className="flex items-center gap-1">
                <Flag className="w-3 h-3 text-amber-500" />
                {flaggedCount} flagged
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Question Display */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {topics.length > 0 && currentQuestion.topic_id && (
                  <Badge variant="info" size="sm">
                    {topics.find(t => t.id === currentQuestion.topic_id)?.name || 'Topic'}
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={handleToggleFlag}
              className={`
                p-2 rounded-full transition-colors
                ${flaggedQuestions.has(currentQuestion.id)
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }
              `}
            >
              <Flag className={`w-5 h-5 ${flaggedQuestions.has(currentQuestion.id) ? 'fill-current' : ''}`} />
            </button>
          </div>

          <QuestionDisplay
            question={currentQuestion}
            showPassage={shouldShowPassage}
            selectedAnswer={answers.get(currentQuestion.id) || null}
            onAnswerSelect={handleAnswerSelect}
            showCorrectAnswer={false}
            questionNumber={currentIndex + 1}
            disabled={false}
          />
        </Card>

        {/* Navigation Buttons - Always Visible */}
        <Card className="bg-white border-2 border-indigo-200 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`
                flex-1 py-3 px-4 rounded-lg font-semibold text-base border-2 transition-all
                flex items-center justify-center
                ${currentIndex === 0 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300 text-gray-400' 
                  : 'bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 active:bg-indigo-100'
                }
              `}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Previous
            </button>
            
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="flex-1 py-3 px-4 rounded-lg font-semibold text-base border-2 border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 active:bg-indigo-100 transition-all flex items-center justify-center"
            >
              {showPalette ? 'Hide' : 'Show'} Palette
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              className={`
                flex-1 py-3 px-4 rounded-lg font-semibold text-base border-2 transition-all
                flex items-center justify-center
                ${currentIndex === questions.length - 1
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300 text-gray-400'
                  : 'bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 active:bg-indigo-100'
                }
              `}
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </Card>

        {/* Question Palette */}
        {showPalette && (
          <Card>
            <QuestionNavigator
              questions={questions.map((q, idx) => {
                const isAnswered = answers.has(q.id);
                const isFlagged = flaggedQuestions.has(q.id);
                let status: 'unanswered' | 'answered' | 'flagged' | 'current' = 
                  idx === currentIndex ? 'current' : (isAnswered ? 'answered' : 'unanswered');
                
                if (isFlagged) {
                  status = 'flagged';
                }

                return {
                  id: q.id,
                  index: idx,
                  status,
                  hasPassage: !!q.passage_id,
                  hasImage: !!q.question_image_url,
                };
              })}
              currentIndex={currentIndex}
              onNavigate={handleNavigateToQuestion}
              variant="bottom"
              isOpen={showPalette}
              onToggle={() => setShowPalette(false)}
            />
          </Card>
        )}

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

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-200 shadow-2xl z-20 pb-safe">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {answeredCount === questions.length ? (
            // Show Submit button when all questions are answered
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <div className="text-center px-2 sm:px-4 bg-green-50 rounded-lg py-1.5 sm:py-2 border border-green-200 hidden sm:block">
                <p className="text-xs sm:text-sm font-bold text-green-700">
                  All {questions.length} answered
                </p>
              </div>
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-bold text-sm sm:text-base bg-green-600 border-2 border-green-600 text-white hover:bg-green-700 hover:border-green-700 active:bg-green-800 shadow-lg transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Submit Test
              </button>
            </div>
          ) : (
            // Show navigation buttons when not all answered
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`
                  py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm border-2 transition-all
                  flex items-center justify-center
                  ${currentIndex === 0 
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300 text-gray-500' 
                    : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 active:bg-indigo-800 shadow-md'
                  }
                `}
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <div className="text-center px-2 sm:px-4 bg-indigo-50 rounded-lg py-1.5 sm:py-2 border border-indigo-200">
                <p className="text-xs sm:text-sm font-bold text-indigo-700">
                  {currentIndex + 1}/{questions.length}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  {answeredCount} done
                </p>
              </div>

              {currentIndex === questions.length - 1 ? (
                // On last question but not all answered - show Review button
                <button
                  onClick={handleShowReview}
                  className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm bg-amber-600 border-2 border-amber-600 text-white hover:bg-amber-700 hover:border-amber-700 active:bg-amber-800 shadow-md transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Review & Submit</span>
                  <span className="sm:hidden">Review</span>
                </button>
              ) : (
                // Show Next button
                <button
                  onClick={handleNext}
                  className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm border-2 bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 active:bg-indigo-800 shadow-md transition-all flex items-center justify-center"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 sm:ml-2" />
                </button>
              )}
            </div>
          )}
        </div>
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
              {unansweredCount > 0 
                ? `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. `
                : 'You have answered all questions. '
              }
              Once you submit, you cannot change your answers.
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
