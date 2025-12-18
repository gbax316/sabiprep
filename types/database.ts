// SABIPREP - Database Types
// Types that match the actual Supabase database schema (snake_case)

/**
 * User role type
 */
export type UserRole = 'student' | 'tutor' | 'admin';

/**
 * User status type
 */
export type UserStatus = 'active' | 'suspended' | 'deleted';

/**
 * Question status type
 */
export type QuestionStatus = 'draft' | 'published' | 'archived';

/**
 * Content status type (for subjects and topics)
 */
export type ContentStatus = 'active' | 'inactive';

/**
 * Import status type
 */
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Database User type (matches users table)
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
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
  status: ContentStatus;
  display_order: number;
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
  status: ContentStatus;
  display_order: number;
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
  passage?: string;
  passage_id?: string | null;
  question_image_url?: string;
  image_alt_text?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string;
  hint?: string; // Legacy field - kept for backward compatibility
  hint1?: string; // First level hint - broad guidance
  hint2?: string; // Second level hint - more specific
  hint3?: string; // Third level hint - near complete guidance
  solution?: string;
  further_study_links?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  exam_type?: string;
  exam_year?: number;
  status: QuestionStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database LearningSession type (matches sessions table)
 * Renamed from Session to avoid conflict with auth Session type
 */
export interface LearningSession {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id?: string;
  topic_ids?: string[]; // For multi-topic sessions
  mode: 'practice' | 'test' | 'timed';
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  score_percentage?: number;
  time_spent_seconds: number;
  time_limit_seconds?: number;
  status: 'in_progress' | 'paused' | 'completed' | 'abandoned';
  paused_at?: string;
  last_question_index?: number;
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
  topic_id?: string; // For topic-specific analytics
  user_answer?: 'A' | 'B' | 'C' | 'D' | 'E';
  is_correct?: boolean;
  time_spent_seconds: number;
  hint_used: boolean;
  hint_level?: 1 | 2 | 3; // Progressive hint level used
  solution_viewed: boolean;
  solution_viewed_before_attempt?: boolean;
  attempt_count?: number;
  first_attempt_correct?: boolean;
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
 * Database AdminAuditLog type (matches admin_audit_logs table)
 */
export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: 'user' | 'question' | 'subject' | 'topic' | 'import';
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Database ImportReport type (matches import_reports table)
 */
export interface ImportReport {
  id: string;
  admin_id: string;
  filename: string;
  file_size_bytes?: number;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: ImportStatus;
  error_details?: ImportError[];
  import_type: 'questions' | 'users' | 'subjects' | 'topics';
  started_at: string;
  completed_at?: string;
  created_at: string;
}

/**
 * Import error detail
 */
export interface ImportError {
  row: number;
  column?: string;
  message: string;
  value?: string;
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

/**
 * Notification type
 */
export type NotificationType = 
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'session_completed'
  | 'goal_achieved'
  | 'daily_reminder'
  | 'new_content'
  | 'student_progress'
  | 'student_achievement'
  | 'new_signup'
  | 'import_completed'
  | 'system_alert'
  | 'content_review';

/**
 * Database Notification type (matches notifications table)
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>; // JSONB data (session_id, achievement_id, etc.)
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User goal type
 */
export type UserGoalType = 
  | 'weekly_study_time'
  | 'daily_questions'
  | 'weekly_questions'
  | 'accuracy_target'
  | 'streak_target';

/**
 * Database UserGoal type (matches user_goals table)
 */
export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: UserGoalType;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end?: string;
  achieved: boolean;
  achieved_at?: string;
  created_at: string;
  updated_at: string;
}
