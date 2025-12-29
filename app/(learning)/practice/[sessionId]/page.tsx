'use client';

import React, { useEffect, useState, use } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { QuestionDisplay } from '@/components/common/QuestionDisplay';
import {
  getSession,
  getSessionAnswers,
  getRandomQuestions,
  getRandomQuestionsFromTopics,
  getQuestionsByIds,
  getTopic,
  getTopics,
  getSubject,
  createSessionAnswer,
  updateSession,
  completeSessionWithGoals,
} from '@/lib/api';
import type { LearningSession, Question, Topic, Subject } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  LogOut,
} from 'lucide-react';
import { QuestionNavigator } from '@/components/common/QuestionNavigator';
import { SignupPromptModal } from '@/components/common/SignupPromptModal';
import {
  hasReachedQuestionLimit,
  incrementGuestQuestionCount,
  getSystemWideQuestionCount,
} from '@/lib/guest-session';

export default function PracticeModePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { userId, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3 | null>(null); // Progressive hint level
  const [showSolution, setShowSolution] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [hintUsage, setHintUsage] = useState<Map<string, 1 | 2 | 3>>(new Map()); // Track hint levels used per question
  const [solutionViewed, setSolutionViewed] = useState<Set<string>>(new Set());
  const [attemptCounts, setAttemptCounts] = useState<Map<string, number>>(new Map());
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<Map<string, boolean>>(new Map());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Auto-save progress every 30 seconds (skip for guests)
  useEffect(() => {
    // Skip auto-save for guests or if session is not in progress
    // Also check if sessionId starts with 'guest_' to catch guest sessions
    if (!session || session.status !== 'in_progress' || isGuest || sessionId.startsWith('guest_')) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        // Double-check we're not trying to update a guest session
        if (sessionId.startsWith('guest_')) return;
        
        await updateSession(sessionId, {
          questions_answered: answeredQuestions.size,
          correct_answers: correctAnswers,
          last_question_index: currentIndex,
        });
      } catch (error) {
        // Silently fail for guest sessions, log others
        if (!sessionId.startsWith('guest_')) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, session?.status, answeredQuestions.size, correctAnswers, currentIndex, isGuest]);

  async function loadSession() {
    try {
      setLoading(true);
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
      
      if (sessionAnswers.length > 0) {
        // Restore original questions
        const questionIds = sessionAnswers.map(a => a.question_id);
        questionsData = await getQuestionsByIds(questionIds);
        
        // If we got questions, use them
        if (questionsData.length > 0) {
          setQuestions(questionsData);
          
          // Restore answered state
          const answeredSet = new Set(sessionAnswers
            .filter(a => a.user_answer !== null)
            .map(a => a.question_id));
          setAnsweredQuestions(answeredSet);
          
          // Restore correct answers count
          const correctCount = sessionAnswers.filter(a => a.is_correct === true).length;
          setCorrectAnswers(correctCount);
          
          // Restore hint usage
          const hintMap = new Map<string, 1 | 2 | 3>();
          sessionAnswers.forEach(answer => {
            if (answer.hint_level && (answer.hint_level === 1 || answer.hint_level === 2 || answer.hint_level === 3)) {
              hintMap.set(answer.question_id, answer.hint_level);
            }
          });
          setHintUsage(hintMap);
          
          // Restore solution viewed state
          const solutionSet = new Set(sessionAnswers
            .filter(a => a.solution_viewed === true)
            .map(a => a.question_id));
          setSolutionViewed(solutionSet);
          
          // Restore attempt counts
          const attemptMap = new Map<string, number>();
          sessionAnswers.forEach(answer => {
            if (answer.attempt_count) {
              attemptMap.set(answer.question_id, answer.attempt_count);
            }
          });
          setAttemptCounts(attemptMap);
          
          // Restore first attempt correct state
          const firstAttemptMap = new Map<string, boolean>();
          sessionAnswers.forEach(answer => {
            if (answer.first_attempt_correct !== null && answer.first_attempt_correct !== undefined) {
              firstAttemptMap.set(answer.question_id, answer.first_attempt_correct);
            }
          });
          setFirstAttemptCorrect(firstAttemptMap);
          
          // Load subject and topics
          const [subjectData, topicsData] = await Promise.all([
            getSubject(sessionData.subject_id),
            sessionData.topic_ids && sessionData.topic_ids.length > 1
              ? getTopics(sessionData.subject_id).then(allTopics => 
                  allTopics.filter(t => sessionData.topic_ids!.includes(t.id))
                )
              : getTopic(sessionData.topic_id || sessionData.topic_ids?.[0] || '').then(t => t ? [t] : [])
          ]);
          
          setSubject(subjectData);
          
          if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
            setTopics(topicsData);
            if (topicsData.length > 0) {
              setTopic(topicsData[0]);
            }
          } else {
            if (topicsData.length > 0) {
              setTopic(topicsData[0]);
              setTopics(topicsData);
            }
          }
          
          // Resume from last question if paused
          if (sessionData.status === 'paused' && sessionData.last_question_index !== undefined) {
            setCurrentIndex(sessionData.last_question_index);
          }
          
          return; // Successfully restored
        }
      }
      
      // FALLBACK: If no session_answers, fetch new questions
      // This handles brand new sessions that haven't been started yet
      
      // First, check for pre-selected questions from sessionStorage
      // These are selected using the non-repetition system at session creation
      let preSelectedQuestionIds: string[] | null = null;
      try {
        const practiceConfigStr = sessionStorage.getItem(`practiceConfig_${sessionData.id}`);
        if (practiceConfigStr) {
          const practiceConfig = JSON.parse(practiceConfigStr);
          if (practiceConfig.questionIds && Array.isArray(practiceConfig.questionIds)) {
            preSelectedQuestionIds = practiceConfig.questionIds;
            console.log('[Practice] Found pre-selected questions:', {
              count: practiceConfig.questionIds.length,
              poolReset: practiceConfig.poolReset,
            });
          }
        }
      } catch (e) {
        console.warn('[Practice] Error reading practice config from sessionStorage:', e);
      }
      
      const loadPromises: Promise<any>[] = [
        getSubject(sessionData.subject_id), // Always load subject in parallel
      ];

      let questionsPromise: Promise<Question[]>;
      let topicsPromise: Promise<Topic[]>;

      if (preSelectedQuestionIds && preSelectedQuestionIds.length > 0) {
        // Use pre-selected questions (non-repetition system)
        console.log('[Practice] Loading pre-selected questions:', {
          count: preSelectedQuestionIds.length,
          questionIds: preSelectedQuestionIds.slice(0, 10), // Log first 10 IDs
        });
        questionsPromise = getQuestionsByIds(preSelectedQuestionIds).then(questions => {
          console.log('[Practice] Pre-selected questions loaded:', {
            requested: preSelectedQuestionIds!.length,
            received: questions.length,
            missing: preSelectedQuestionIds!.length - questions.length,
          });
          
          // Warn if we got fewer questions than expected
          if (questions.length < preSelectedQuestionIds!.length) {
            console.error(`[Practice] CRITICAL: Only loaded ${questions.length} out of ${preSelectedQuestionIds!.length} pre-selected questions!`);
            console.error('[Practice] This may indicate questions were deleted, unpublished, or IDs are invalid.');
          }
          
          return questions;
        }).catch(error => {
          console.error('[Practice] Error loading pre-selected questions:', error);
          return [];
        });
        topicsPromise = sessionData.topic_ids && sessionData.topic_ids.length > 0
          ? getTopics(sessionData.subject_id).then(allTopics => 
              allTopics.filter(t => sessionData.topic_ids!.includes(t.id))
            ).catch(() => [])
          : getTopic(sessionData.topic_id || '').then(t => t ? [t] : []).catch(() => []);
        loadPromises.push(questionsPromise, topicsPromise);
      } else if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        // Multi-topic session - load questions and topics in parallel
        console.log('[Practice] Loading questions from multiple topics:', {
          topicIds: sessionData.topic_ids,
          topicIdsCount: sessionData.topic_ids.length,
          totalQuestions: sessionData.total_questions,
        });
        questionsPromise = getRandomQuestionsFromTopics(
          sessionData.topic_ids,
          sessionData.total_questions
        ).then(questions => {
          console.log('[Practice] Questions loaded from multiple topics:', {
            requested: sessionData.total_questions,
            received: questions.length,
            topicIds: sessionData.topic_ids,
          });
          if (questions.length < sessionData.total_questions) {
            console.warn(`[Practice] Fewer questions returned than requested: ${questions.length} < ${sessionData.total_questions}`);
          }
          return questions;
        }).catch(error => {
          console.error('[Practice] Error fetching questions from multiple topics:', error);
          return [];
        });
        topicsPromise = getTopics(sessionData.subject_id).catch(error => {
          console.error('[Practice] Error fetching topics:', error);
          return [];
        });
        loadPromises.push(questionsPromise, topicsPromise);
      } else {
        // Single topic session (backward compatible)
        const topicId = sessionData.topic_id || sessionData.topic_ids?.[0];
        if (topicId) {
          questionsPromise = getRandomQuestions(topicId, sessionData.total_questions).catch(error => {
            console.error('[Practice] Error fetching questions for topic:', { topicId, error });
            return [];
          });
          topicsPromise = getTopic(topicId).then(t => t ? [t] : []).catch(error => {
            console.error('[Practice] Error fetching topic:', { topicId, error });
            return [];
          });
          loadPromises.push(questionsPromise, topicsPromise);
        } else {
          console.error('[Practice] No topic ID found in session:', sessionData);
          questionsPromise = Promise.resolve([]);
          topicsPromise = Promise.resolve([]);
        }
      }

      // Wait for all data in parallel
      const [subjectData, newQuestionsData, topicsResult] = await Promise.all(loadPromises);
      
      setSubject(subjectData);
      
      // Log questions loaded for debugging
      if (newQuestionsData && Array.isArray(newQuestionsData)) {
        console.log('[Practice] Questions loaded successfully:', {
          requested: sessionData.total_questions,
          received: newQuestionsData.length,
          topicIds: sessionData.topic_ids,
          topicIdsCount: sessionData.topic_ids?.length || 0,
        });
      }
      
      if (!newQuestionsData || newQuestionsData.length === 0) {
        // No questions available - this will be handled in the render section
        console.error('[Practice] No questions loaded for session:', {
          sessionId,
          topicIds: sessionData.topic_ids,
          topicId: sessionData.topic_id,
          totalQuestions: sessionData.total_questions,
        });
        setQuestions([]);
        setLoading(false);
        return; // Exit early to show error message
      } else {
        // Ensure we have exactly the requested number of questions (slice if needed)
        let finalQuestions = newQuestionsData;
        if (newQuestionsData.length > sessionData.total_questions) {
          console.warn(`[Practice] Received more questions than requested (${newQuestionsData.length} > ${sessionData.total_questions}). Slicing to requested count.`);
          finalQuestions = newQuestionsData.slice(0, sessionData.total_questions);
        } else if (newQuestionsData.length < sessionData.total_questions) {
          console.warn(`[Practice] Session loaded with fewer questions than requested: ${newQuestionsData.length} < ${sessionData.total_questions}`);
        }
        setQuestions(finalQuestions);
      }

      if (sessionData.topic_ids && sessionData.topic_ids.length > 1) {
        // Multi-topic: filter to selected topics
        const selectedTopics = (topicsResult || []).filter((t: Topic) => 
          sessionData.topic_ids!.includes(t.id)
        );
        setTopics(selectedTopics);
        if (selectedTopics.length > 0) {
          setTopic(selectedTopics[0]);
        }
      } else {
        // Single topic
        const topics = topicsResult || [];
        if (topics.length > 0) {
          setTopic(topics[0]);
          setTopics(topics);
        }
      }
      
      // Resume from last question if paused or in_progress
      // IMPORTANT: Use newQuestionsData.length, not questions.length (which is old state)
      if ((sessionData.status === 'paused' || sessionData.status === 'in_progress') && 
          sessionData.last_question_index !== undefined && 
          sessionData.last_question_index >= 0 &&
          newQuestionsData && newQuestionsData.length > 0) {
        // Ensure the index is within bounds using the newly loaded questions
        const resumeIndex = Math.min(sessionData.last_question_index, newQuestionsData.length - 1);
        setCurrentIndex(Math.max(0, resumeIndex)); // Ensure it's at least 0
      } else if (newQuestionsData && newQuestionsData.length > 0) {
        // For new sessions, start at index 0
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Ensure loading is set to false before redirecting
      setLoading(false);
      // Use replace to avoid back button issues
      router.replace('/home');
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const previousQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isAnswered = answeredQuestions.has(currentQuestion?.id || '');
  const currentHintLevel = hintUsage.get(currentQuestion?.id || '') || null;
  
  // Determine if we should show the passage
  // Show passage if: question has passage AND (it's first question OR different passage from previous)
  const shouldShowPassage = !!(currentQuestion?.passage && (
    !previousQuestion ||
    previousQuestion.passage_id !== currentQuestion.passage_id
  ));

  function getCurrentHintText(): string {
    if (!currentQuestion) return '';
    
    // Use hint1, hint2, hint3 if available, otherwise fall back to legacy hint field
    if (currentHintLevel === 1) {
      return currentQuestion.hint1 || currentQuestion.hint || '';
    }
    if (currentHintLevel === 2) {
      return currentQuestion.hint2 || '';
    }
    if (currentHintLevel === 3) {
      return currentQuestion.hint3 || '';
    }
    return '';
  }

  function hasAnyHint(): boolean {
    if (!currentQuestion) return false;
    return !!(currentQuestion.hint1 || currentQuestion.hint2 || currentQuestion.hint3 || currentQuestion.hint);
  }

  function hasHintLevel(level: 1 | 2 | 3): boolean {
    if (!currentQuestion) return false;
    if (level === 1) return !!(currentQuestion.hint1 || currentQuestion.hint);
    if (level === 2) return !!currentQuestion.hint2;
    if (level === 3) return !!currentQuestion.hint3;
    return false;
  }

  function handleShowHint(level: 1 | 2 | 3) {
    if (!currentQuestion || isAnswered) return;
    
    // Check if the requested hint level is available
    if (!hasHintLevel(level)) return;
    
    // Ensure hints are accessed in order (1, then 2, then 3)
    if (level === 2 && !hasHintLevel(1)) return;
    if (level === 3 && (!hasHintLevel(1) || !hasHintLevel(2))) return;
    
    setHintLevel(level);
      setHintUsage(prev => {
        const next = new Map(prev);
      const currentMaxLevel = prev.get(currentQuestion.id) || 0;
      // Track the maximum hint level used
      if (level > currentMaxLevel) {
        next.set(currentQuestion.id, level);
      }
        return next;
      });
  }

  async function handleAnswerSelect(answer: 'A' | 'B' | 'C' | 'D' | 'E') {
    if (!currentQuestion) return;

    // Check guest question limit before allowing answer
    if (isGuest) {
      if (hasReachedQuestionLimit()) {
        setShowSignupModal(true);
        return; // Block answering
      }
    }

    const questionId = currentQuestion.id;
    const attemptCount = (attemptCounts.get(questionId) || 0) + 1;
    const isFirstAttempt = attemptCount === 1;
    const isCorrect = answer === currentQuestion.correct_answer;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const usedHint = currentHintLevel !== null;
    const viewedSolution = solutionViewed.has(questionId);

    // Track first attempt correctness
    if (isFirstAttempt) {
      setFirstAttemptCorrect(prev => {
        const next = new Map(prev);
        next.set(questionId, isCorrect);
        return next;
      });
    }

    setSelectedAnswer(answer);
    setAttemptCounts(prev => {
      const next = new Map(prev);
      next.set(questionId, attemptCount);
      return next;
    });

    // If incorrect and not answered yet, allow retry
    if (!isCorrect && !isAnswered) {
      // Don't mark as answered yet, allow retry
      return;
    }

    // Mark as answered if correct or if user wants to move on
    if (isCorrect || isAnswered) {
      try {
        // For guests: increment question count before recording
        if (isGuest) {
          const newSystemCount = incrementGuestQuestionCount();
          if (newSystemCount >= 5) {
            // Show signup modal after 5th question
            setShowSignupModal(true);
          }
        }

        // Check if solution was viewed before this attempt
        const solutionViewedBeforeThisAttempt = solutionViewed.has(questionId) && !isAnswered;
        
        // Record answer (skip for guests as they don't have database access)
        if (!isGuest && userId) {
          await createSessionAnswer({
            sessionId: sessionId,
            questionId: currentQuestion.id,
            topicId: currentQuestion.topic_id,
            userAnswer: answer,
            isCorrect,
            timeSpentSeconds: timeSpent,
            hintUsed: usedHint,
            hintLevel: currentHintLevel || undefined,
            solutionViewed: solutionViewed.has(questionId),
            solutionViewedBeforeAttempt: solutionViewedBeforeThisAttempt,
            attemptCount,
            firstAttemptCorrect: firstAttemptCorrect.get(questionId) ?? (isFirstAttempt ? isCorrect : undefined),
          });
        }

        // Update local state
        setAnsweredQuestions(prev => new Set(prev).add(questionId));
        if (isCorrect) {
          setCorrectAnswers(prev => prev + 1);
        }

        // Update session progress (skip for guests)
        if (!isGuest && userId) {
          const newTimeSpentSeconds = (session?.time_spent_seconds || 0) + timeSpent;
          const updatedSession = await updateSession(sessionId, {
            questions_answered: answeredQuestions.size + 1,
            correct_answers: correctAnswers + (isCorrect ? 1 : 0),
            time_spent_seconds: newTimeSpentSeconds,
            last_question_index: currentIndex,
          });
          // Update local session state to keep time_spent_seconds in sync
          if (updatedSession) {
            setSession(updatedSession);
          }
        }

        // Auto-show solution after answering (if not already shown)
        if (!showSolution) {
        setShowSolution(true);
        }
      } catch (error) {
        console.error('Error recording answer:', error);
        alert('Failed to save answer. Please try again.');
      }
    }
  }

  async function handleNext() {
    if (isLastQuestion) {
      // Complete session
      const scorePercentage = (correctAnswers / questions.length) * 100;
      
      // Calculate total time from all answers (most accurate)
      // Get all session answers to sum up time_spent_seconds
      let totalTimeSpent = 0;
      if (!isGuest && userId) {
        try {
          const sessionAnswers = await getSessionAnswers(sessionId);
          totalTimeSpent = sessionAnswers.reduce((sum, answer) => sum + (answer.time_spent_seconds || 0), 0);
        } catch (error) {
          console.warn('Error fetching session answers for time calculation, using session time:', error);
          // Fallback to session time
          if (session) {
            try {
              const latestSession = await getSession(sessionId);
              totalTimeSpent = latestSession?.time_spent_seconds || session.time_spent_seconds || 0;
            } catch (e) {
              totalTimeSpent = session.time_spent_seconds || 0;
            }
          }
        }
      } else if (session) {
        // For guests, use session time
        totalTimeSpent = session.time_spent_seconds || 0;
      }
      
      await completeSessionWithGoals(
        sessionId,
        scorePercentage,
        totalTimeSpent,
        correctAnswers,
        questions.length,
        userId || undefined
      );
      router.push(`/results/${sessionId}`);
    } else {
      // Go to next question
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setHintLevel(null);
      setShowSolution(false);
      setStartTime(Date.now());
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setHintLevel(null);
      setShowSolution(false);
      // Restore hint level for this question if it was used
      const prevQuestionId = questions[currentIndex - 1]?.id;
      if (prevQuestionId) {
        const prevHintLevel = hintUsage.get(prevQuestionId);
        setHintLevel(prevHintLevel || null);
      }
    }
  }

  function handleToggleSolution() {
    if (!currentQuestion) return;
    const newShowSolution = !showSolution;
    setShowSolution(newShowSolution);
    
    // Track when solution is viewed (only on first view)
    if (newShowSolution && !solutionViewed.has(currentQuestion.id)) {
    setSolutionViewed(prev => new Set(prev).add(currentQuestion.id));
      
      // If viewing solution before answering, record it
      if (!isAnswered) {
        // This will be tracked when answer is submitted
      }
    }
  }

  async function handlePauseSession() {
    if (!session) return;

    // For guest sessions, just navigate away (no database update needed)
    if (isGuest || sessionId.startsWith('guest_')) {
      setShowPauseModal(false);
      router.push('/subjects');
      return;
    }

    try {
      setIsPausing(true);
      await updateSession(sessionId, {
        status: 'paused',
        paused_at: new Date().toISOString(),
        last_question_index: currentIndex,
      });
      setShowPauseModal(false);
      router.push('/home');
    } catch (error) {
      console.error('Error pausing session:', error);
      alert('Failed to pause session. Please try again.');
    } finally {
      setIsPausing(false);
    }
  }

  async function handleEndSession() {
    if (!session) return;

    // For guest sessions, just navigate to results (no database update needed)
    if (isGuest || sessionId.startsWith('guest_')) {
      router.push(`/results/${sessionId}`);
      return;
    }

    try {
      setIsPausing(true);
      const scorePercentage = answeredQuestions.size > 0
        ? (correctAnswers / answeredQuestions.size) * 100
        : 0;
      
      // Calculate total time from all answers (most accurate)
      let totalTimeSpent = 0;
      if (!isGuest && userId) {
        try {
          const sessionAnswers = await getSessionAnswers(sessionId);
          totalTimeSpent = sessionAnswers.reduce((sum, answer) => sum + (answer.time_spent_seconds || 0), 0);
        } catch (error) {
          console.warn('Error fetching session answers for time calculation, using session time:', error);
          // Fallback to session time
          if (session) {
            try {
              const latestSession = await getSession(sessionId);
              totalTimeSpent = latestSession?.time_spent_seconds || session.time_spent_seconds || 0;
            } catch (e) {
              totalTimeSpent = session.time_spent_seconds || 0;
            }
          }
        }
      } else if (session) {
        // For guests, use session time
        totalTimeSpent = session.time_spent_seconds || 0;
      }

      await completeSessionWithGoals(
        sessionId,
        scorePercentage,
        totalTimeSpent,
        correctAnswers,
        answeredQuestions.size,
        userId || undefined
      );
      router.push(`/results/${sessionId}`);
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session. Please try again.');
    } finally {
      setIsPausing(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
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
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setShowPauseModal(true)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="Pause & Resume Later"
              >
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{subject?.name}</p>
                  {session?.topic_ids && session.topic_ids.length > 1 ? (
                    <Badge variant="info" size="sm" className="text-[10px] sm:text-xs">
                      {session.topic_ids.length} Topics
                    </Badge>
                  ) : topic ? (
                    <Badge variant="info" size="sm" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                      {topic.name}
                    </Badge>
                  ) : null}
                </div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-900">Practice Mode</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge variant="info" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
                {currentIndex + 1}/{questions.length}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Completion Ring Indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - (currentIndex + 1) / questions.length)}`}
                  className="text-indigo-600 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">
                  {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
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

        {/* Progressive Hint System */}
        {!isAnswered && hasAnyHint() && (
          <div className="space-y-3">
            {/* Hint Level Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((level) => {
                const levelNum = level as 1 | 2 | 3;
                const hasHint = hasHintLevel(levelNum);
                const isUnlocked = currentHintLevel === null 
                  ? levelNum === 1 
                  : currentHintLevel >= levelNum;
                const isActive = currentHintLevel === levelNum;
                const isUsed = currentHintLevel !== null && currentHintLevel >= levelNum;
                const canClick = hasHint && (isUnlocked || (currentHintLevel === null && levelNum === 1));

                if (!hasHint) return null;

                return (
                  <Button
                    key={levelNum}
                    variant={isActive ? "primary" : "outline"}
                    size="sm"
                    leftIcon={<Lightbulb className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />}
                    onClick={() => handleShowHint(levelNum)}
                    disabled={!canClick || isActive}
                    className={`
                      ${isUsed && !isActive ? 'bg-amber-50 border-amber-300' : ''}
                    `}
                  >
                    Hint {levelNum}
                    {isUsed && !isActive && <span className="ml-1">✓</span>}
                  </Button>
                );
              })}
            </div>

            {/* Hint Display */}
            {currentHintLevel && (
              <Card className={`border-2 ${
                currentHintLevel === 1 ? 'bg-yellow-50 border-yellow-200' :
                currentHintLevel === 2 ? 'bg-orange-50 border-orange-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex gap-3">
                  <Lightbulb className={`w-6 h-6 flex-shrink-0 ${
                    currentHintLevel === 1 ? 'text-yellow-600' :
                    currentHintLevel === 2 ? 'text-orange-600' :
                    'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">Hint Level {currentHintLevel}</p>
                      <Badge variant={
                        currentHintLevel === 1 ? 'warning' :
                        currentHintLevel === 2 ? 'secondary' :
                        'error'
                      } size="sm">
                        {currentHintLevel === 1 ? 'Broad Guidance' :
                         currentHintLevel === 2 ? 'More Specific' :
                         'Near Complete'}
                      </Badge>
                    </div>
                    <p className="text-gray-700">{getCurrentHintText()}</p>
                    {currentHintLevel < 3 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Need more help? Click "Hint {currentHintLevel + 1}" for a more detailed hint.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Solution Button - Available anytime in practice mode */}
        {(currentQuestion.explanation || currentQuestion.solution) && (
          <div className="flex items-center gap-3">
          <Button
              variant={showSolution ? "outline" : "tertiary"}
            size="md"
            leftIcon={<BookOpen className="w-5 h-5" />}
              onClick={handleToggleSolution}
          >
              {showSolution ? 'Hide Solution' : 'Show Solution'}
          </Button>
            {solutionViewed.has(currentQuestion.id) && !isAnswered && (
              <Badge variant="warning" size="sm">
                ⚠️ Viewed before answering
              </Badge>
            )}
          </div>
        )}

        {/* Solution Box - Show explanation and/or solution */}
        {showSolution && (currentQuestion.explanation || currentQuestion.solution) && (
          <Card className={
            isAnswered && selectedAnswer === currentQuestion.correct_answer
              ? 'bg-green-50 border-2 border-green-200'
              : solutionViewed.has(currentQuestion.id) && !isAnswered
              ? 'bg-amber-50 border-2 border-amber-200'
              : 'bg-blue-50 border-2 border-blue-200'
          }>
            <div className="flex gap-3">
              <BookOpen className={`w-6 h-6 flex-shrink-0 ${
                isAnswered && selectedAnswer === currentQuestion.correct_answer 
                  ? 'text-green-600' 
                  : solutionViewed.has(currentQuestion.id) && !isAnswered
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">
                  {isAnswered && selectedAnswer === currentQuestion.correct_answer 
                    ? '✅ Correct!' 
                      : solutionViewed.has(currentQuestion.id) && !isAnswered
                      ? '📖 Solution (Viewed Before Answering)'
                    : '📖 Step-by-Step Solution'}
                </p>
                  <button
                    onClick={handleToggleSolution}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hide solution"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Correct Answer Badge */}
                <div className="mb-3">
                  <Badge variant={isAnswered && selectedAnswer === currentQuestion.correct_answer ? "success" : "info"} size="md">
                    Correct Answer: {currentQuestion.correct_answer}
                  </Badge>
                </div>

                {/* Explanation */}
                {currentQuestion.explanation && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Explanation:</p>
                    <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {currentQuestion.explanation}
                </div>
                  </div>
                )}

                {/* Detailed Solution */}
                {currentQuestion.solution && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Detailed Solution:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{currentQuestion.solution}</p>
                  </div>
                )}

                {/* Learning Tip */}
                {solutionViewed.has(currentQuestion.id) && !isAnswered && (
                  <div className="mt-3 p-2 bg-amber-100 rounded-lg border border-amber-300">
                    <p className="text-xs text-amber-800">
                      💡 <strong>Tip:</strong> Try answering the question yourself first to maximize learning. Viewing solutions before attempting reduces the learning benefit.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="md"
            leftIcon={<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-2 sm:px-4 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <Button
            variant="primary"
            size="full"
            rightIcon={<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={handleNext}
            disabled={!isAnswered}
            className="text-xs sm:text-sm"
          >
            {isLastQuestion ? (
              <>
                <span className="hidden sm:inline">Complete Session</span>
                <span className="sm:hidden">Complete</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Next Question</span>
                <span className="sm:hidden">Next</span>
              </>
            )}
          </Button>
        </div>

        {/* Question Palette */}
        <Card>
          <p className="text-sm font-medium text-gray-700 mb-3">Question Navigator</p>
          <QuestionNavigator
            questions={questions.map((q, idx) => {
              const isAnswered = answeredQuestions.has(q.id);
              const answer = attemptCounts.get(q.id) ? 'answered' : 'unanswered';
              let status: 'unanswered' | 'answered' | 'correct' | 'incorrect' | 'current' = 
                idx === currentIndex ? 'current' : answer as any;
              
              // Determine correct/incorrect status if answered
              if (isAnswered) {
                const wasCorrect = firstAttemptCorrect.get(q.id);
                if (wasCorrect !== undefined) {
                  status = wasCorrect ? 'correct' : 'incorrect';
                } else {
                  status = 'answered';
                }
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
            onNavigate={(index) => {
              setCurrentIndex(index);
              setSelectedAnswer(null);
              setHintLevel(null);
              setShowSolution(false);
              // Restore hint level for this question if it was used
              const questionId = questions[index]?.id;
              if (questionId) {
                const prevHintLevel = hintUsage.get(questionId);
                setHintLevel(prevHintLevel || null);
                const prevSolutionViewed = solutionViewed.has(questionId);
              const prevQuestion = questions[index];
              // Restore solution view state if it was previously viewed
              if (prevSolutionViewed && (prevQuestion?.explanation || prevQuestion?.solution)) {
                  setShowSolution(true);
              } else {
                setShowSolution(false);
                }
              }
              setStartTime(Date.now());
            }}
            variant="bottom"
          />
        </Card>

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

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pause Session?</h3>
            <p className="text-gray-600 mb-6">
              Your progress will be saved. You can resume from question {currentIndex + 1} later.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="full"
                onClick={() => setShowPauseModal(false)}
                disabled={isPausing}
              >
                Continue Practice
              </Button>
              <Button
                variant="primary"
                size="full"
                onClick={handlePauseSession}
                disabled={isPausing}
                leftIcon={<Pause className="w-5 h-5" />}
              >
                {isPausing ? 'Pausing...' : 'Pause & Resume Later'}
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                size="full"
                onClick={handleEndSession}
                disabled={isPausing}
                leftIcon={<LogOut className="w-5 h-5" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                End Session & View Results
              </Button>
            </div>
          </Card>
        </div>
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
