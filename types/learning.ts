// SABIPREP - Learning Session Types

import type { Answer, OptionKey } from './questions';
import type { Question } from './database';
import type { LearningSession } from './database';

/**
 * Learning session modes
 */
export type SessionMode = 'practice' | 'test' | 'timed';

/**
 * Session status
 */
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

/**
 * Session configuration
 */
export interface SessionConfig {
  topicId: string;
  subjectId: string;
  mode: SessionMode;
  questionCount: number;
  timeLimit?: number; // in seconds (for timed mode)
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

/**
 * Active session state (for UI)
 */
export interface ActiveSessionState {
  session: LearningSession;
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  selectedAnswer: OptionKey | null;
  showHint: boolean;
  showSolution: boolean;
  isAnswered: boolean;
  isCorrect: boolean | null;
  timeRemaining?: number; // for timed mode
  isPaused: boolean;
}

/**
 * Session result
 */
export interface SessionResult {
  sessionId: string;
  mode: SessionMode;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  timeSpent: number;
  score: number;
  topicBreakdown: TopicPerformance[];
  recommendations: string[];
  achievements?: UnlockedAchievement[];
  streakUpdated: boolean;
  newStreak?: number;
}

/**
 * Topic performance in results
 */
export interface TopicPerformance {
  topicId: string;
  topicName: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
}

/**
 * Unlocked achievement notification
 */
export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Question state during session
 */
export interface QuestionState {
  questionId: string;
  status: 'unanswered' | 'answered' | 'skipped';
  selectedAnswer: OptionKey | null;
  isCorrect: boolean | null;
  timeSpent: number;
  hintsUsed: boolean;
}

/**
 * Timer state for timed mode
 */
export interface TimerState {
  totalTime: number;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
}

/**
 * Practice mode specific state
 */
export interface PracticeModeState {
  hintsAvailable: boolean;
  solutionsAvailable: boolean;
  canGoBack: boolean;
  canSkip: boolean;
}

/**
 * Test mode specific state
 */
export interface TestModeState {
  canNavigate: boolean;
  canReview: boolean;
  showAnswersAtEnd: boolean;
}

/**
 * Timed mode specific state
 */
export interface TimedModeState {
  timePerQuestion: number;
  autoAdvance: boolean;
  showTimer: boolean;
  bonusPoints: boolean;
}

/**
 * Session history entry
 */
export interface SessionHistoryEntry {
  id: string;
  mode: SessionMode;
  subjectName: string;
  topicName: string;
  accuracy: number;
  questionsAnswered: number;
  timeSpent: number;
  completedAt: string;
}

/**
 * Continue learning data
 */
export interface ContinueLearning {
  sessionId?: string;
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  topicId: string;
  topicName: string;
  progress: number;
  lastActivityAt: string;
}
