// SABIPREP - Question Types

import type { Question } from './database';

/**
 * Subject (e.g., Mathematics, English)
 */
export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: SubjectIcon;
  color: SubjectColor;
  totalQuestions: number;
  totalTopics: number;
  exams: ExamType[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Topic within a subject
 */
export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  totalQuestions: number;
  difficulty: Difficulty;
  exams: ExamType[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Topic with user progress
 */
export interface TopicWithProgress extends Topic {
  progress: number; // 0-100
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  lastAttemptedAt?: string;
}

/**
 * Question option
 */
export interface QuestionOption {
  key: OptionKey;
  text: string;
  image?: string;
}

/**
 * Option keys (A, B, C, D)
 */
export type OptionKey = 'A' | 'B' | 'C' | 'D';

/**
 * User's answer to a question
 */
export interface Answer {
  questionId: string;
  selectedAnswer: OptionKey | null;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  hintsUsed: boolean;
  answeredAt: string;
}

/**
 * Difficulty levels
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Exam types
 */
export type ExamType = 'WAEC' | 'JAMB' | 'NECO' | 'GCE';

/**
 * Subject icons (Lucide icon names)
 */
export type SubjectIcon = 
  | 'Calculator'
  | 'FileText'
  | 'Atom'
  | 'Flask'
  | 'Leaf'
  | 'Globe'
  | 'BookOpen'
  | 'Palette'
  | 'Music'
  | 'Dumbbell';

/**
 * Subject colors (Tailwind color names)
 */
export type SubjectColor = 
  | 'blue'
  | 'purple'
  | 'emerald'
  | 'orange'
  | 'pink'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'indigo'
  | 'teal';

/**
 * Question filter options
 */
export interface QuestionFilters {
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  exams?: ExamType[];
  year?: number;
  unanswered?: boolean;
  incorrect?: boolean;
}

/**
 * Question set for a session
 */
export interface QuestionSet {
  questions: Question[];
  totalCount: number;
  filters: QuestionFilters;
}

/**
 * Daily challenge
 */
export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  subjectId: string;
  topicId?: string;
  questionCount: number;
  timeLimit: number; // in minutes
  reward: number; // points
  completed: boolean;
  score?: number;
}
