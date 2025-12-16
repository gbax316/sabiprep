// SABIPREP - Database Types
// Types that match the actual Supabase database schema (snake_case)

/**
 * Database User type (matches users table)
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  grade?: 'SS1' | 'SS2' | 'SS3' | 'Graduate';
  avatar_url?: string;
  streak_count: number;
  last_active_date?: string;
  total_questions_answered: number;
  total_correct_answers: number;
  total_study_time_minutes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database Subject type (matches subjects table)
 */
export interface Subject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  exam_types?: string[];
  total_questions: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database Topic type (matches topics table)
 */
export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  total_questions: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database Question type (matches questions table)
 */
export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  question_image_url?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  hint?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  exam_type?: string;
  exam_year?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database Session type (matches sessions table)
 */
export interface Session {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id?: string;
  mode: 'practice' | 'test' | 'timed';
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  score_percentage?: number;
  time_spent_seconds: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database SessionAnswer type (matches session_answers table)
 */
export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_answer?: 'A' | 'B' | 'C' | 'D';
  is_correct?: boolean;
  time_spent_seconds: number;
  hint_used: boolean;
  solution_viewed: boolean;
  answered_at: string;
  created_at: string;
}

/**
 * Database UserProgress type (matches user_progress table)
 */
export interface UserProgress {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  questions_attempted: number;
  questions_correct: number;
  accuracy_percentage: number;
  last_practiced_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database Achievement type (matches achievements table)
 */
export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
}

/**
 * Database UserAchievement type (matches user_achievements table)
 */
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

/**
 * User statistics (calculated from user data)
 */
export interface UserStats {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  studyTimeMinutes: number;
  currentStreak: number;
  lastActiveDate?: Date;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  totalStats: UserStats;
  weeklyActivity: {
    date: string;
    questionsAnswered: number;
  }[];
  subjectPerformance: {
    subjectId: string;
    questionsAttempted: number;
    questionsCorrect: number;
    accuracy: number;
  }[];
  strengths: string[]; // topic IDs
  weaknesses: string[]; // topic IDs
}
