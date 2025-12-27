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
 * Review status type
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'failed';

/**
 * Review type
 */
export type ReviewType = 'single' | 'batch';

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
  xp_points: number;
  daily_xp_claimed_at?: string;
  daily_xp_streak_bonus_claimed: boolean;
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
 * Database UserSubjectPreference type (matches user_subject_preferences table)
 */
export interface UserSubjectPreference {
  id: string;
  user_id: string;
  subject_id: string;
  created_at: string;
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
  xpPoints: number;
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

/**
 * Database QuestionReview type (matches question_reviews table)
 */
export interface QuestionReview {
  id: string;
  question_id: string;
  reviewed_by: string;
  review_type: ReviewType;
  status: ReviewStatus;
  proposed_hint1?: string;
  proposed_hint2?: string;
  proposed_hint3?: string;
  proposed_solution?: string;
  proposed_explanation?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  model_used?: string;
  tokens_used?: number;
  review_duration_ms?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Daily Challenge (matches daily_challenges table)
 */
export interface DailyChallenge {
  id: string;
  subject_id: string;
  challenge_date: string; // DATE format: YYYY-MM-DD
  question_ids: string[]; // Array of question UUIDs
  time_limit_seconds: number;
  question_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * User Daily Challenge completion (matches user_daily_challenges table)
 */
export interface UserDailyChallenge {
  id: string;
  user_id: string;
  daily_challenge_id: string;
  session_id?: string;
  score_percentage?: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds?: number;
  completed_at: string;
  xp_earned: number;
}

/**
 * Mastery Badge (matches mastery_badges table)
 */
export interface MasteryBadge {
  id: string;
  name: string;
  level: number; // 1-12
  xp_requirement: number; // For global badges
  correct_answers_requirement: number; // For per-subject badges
  icon?: string;
  description?: string;
  color?: string;
  created_at: string;
}

/**
 * User Mastery Badge (matches user_mastery_badges table)
 */
export interface UserMasteryBadge {
  id: string;
  user_id: string;
  mastery_badge_id: string;
  subject_id?: string; // NULL for global badges
  earned_at: string;
  mastery_badge?: MasteryBadge; // Joined data
  subject?: Subject; // Joined data (if per-subject)
}

/**
 * User Attempted Question (matches user_attempted_questions table)
 * Tracks which questions a user has attempted per subject for non-repetition
 */
export interface UserAttemptedQuestion {
  id: string;
  user_id: string;
  subject_id: string;
  question_id: string;
  first_attempted_at: string;
  last_attempted_at?: string;
  attempt_count: number;
  created_at: string;
}
