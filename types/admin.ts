// SABIPREP - Admin Portal Types
// Types specific to admin functionality

import type { 
  User, 
  UserRole, 
  UserStatus, 
  Question, 
  QuestionStatus,
  AdminAuditLog,
  ImportReport 
} from './database';

// ============================================
// ADMIN USER TYPES
// ============================================

/**
 * Admin user type (extended user for admin operations)
 */
export interface AdminUser extends User {
  // Additional computed fields for admin context
  canManageUsers?: boolean;
  canManageContent?: boolean;
  canViewAuditLogs?: boolean;
}

/**
 * Admin session user (minimal data for session context)
 */
export interface AdminSessionUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

// ============================================
// DASHBOARD TYPES
// ============================================

/**
 * Admin dashboard statistics
 */
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number; // Active in last 7 days
    newThisMonth: number;
    byRole: Record<UserRole, number>;
  };
  content: {
    totalSubjects: number;
    totalTopics: number;
    totalQuestions: number;
    publishedQuestions: number;
    draftQuestions: number;
  };
  activity: {
    totalSessions: number;
    totalAnswered: number;
    averageAccuracy: number;
    sessionsToday: number;
  };
}

/**
 * System alert type
 */
export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: string;
  createdAt: string;
}

/**
 * Activity feed entry
 */
export interface ActivityFeedEntry {
  id: string;
  type: 'user_signup' | 'question_added' | 'import_completed' | 'admin_action';
  message: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

// ============================================
// USER MANAGEMENT TYPES
// ============================================

/**
 * User list query parameters
 */
export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: 'created_at' | 'full_name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User list response
 */
export interface UserListResponse {
  users: User[];
  pagination: PaginationInfo;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  full_name?: string;
  grade?: string;
  status?: UserStatus;
}

/**
 * Update role request
 */
export interface UpdateRoleRequest {
  role: UserRole;
}

// ============================================
// QUESTION MANAGEMENT TYPES
// ============================================

/**
 * Question with relations (for admin views)
 */
export interface QuestionWithRelations extends Question {
  subject?: { name: string; slug: string };
  topic?: { name: string; slug: string };
  creator?: { full_name: string };
}

/**
 * Question list query parameters
 */
export interface QuestionListParams {
  page?: number;
  limit?: number;
  subject_id?: string;
  topic_id?: string;
  status?: QuestionStatus;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  exam_type?: string;
  search?: string;
  sortBy?: 'created_at' | 'exam_year' | 'difficulty';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Question list response
 */
export interface QuestionListResponse {
  questions: QuestionWithRelations[];
  pagination: PaginationInfo;
}

/**
 * Create question request
 */
export interface CreateQuestionRequest {
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string;
  hint?: string;
  solution?: string;
  further_study_links?: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  exam_type: string;
  exam_year?: number;
  status?: QuestionStatus;
}

/**
 * Bulk action request
 */
export interface BulkActionRequest {
  question_ids: string[];
}

/**
 * Bulk action response
 */
export interface BulkActionResponse {
  success: boolean;
  affected: number;
  errors?: Array<{ id: string; error: string }>;
}

// ============================================
// IMPORT TYPES
// ============================================

/**
 * Import validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  preview: Array<Record<string, string>>; // First 5 rows
}

/**
 * Import questions request options
 */
export interface ImportQuestionsOptions {
  skipDuplicates?: boolean;
  defaultStatus?: QuestionStatus;
  dryRun?: boolean;
}

/**
 * Import response
 */
export interface ImportResponse {
  reportId: string;
  status: 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows?: number;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

/**
 * Audit action types
 */
export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'BULK_PUBLISH' 
  | 'BULK_ARCHIVE' 
  | 'BULK_DELETE'
  | 'IMPORT_START' 
  | 'IMPORT_COMPLETE' 
  | 'IMPORT_FAILED'
  | 'ROLE_CHANGE' 
  | 'STATUS_CHANGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'question_review_created'
  | 'question_review_approved'
  | 'question_review_rejected'
  | 'question_review_failed'
  | 'question_review_batch_created';

/**
 * Audit entity types
 */
export type AuditEntityType = 'user' | 'question' | 'subject' | 'topic' | 'import';

/**
 * Audit log entry (for creating new logs)
 */
export interface AuditLogEntry {
  admin_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Audit log with admin details (for display)
 */
export interface AuditLogWithAdmin extends AdminAuditLog {
  admin?: { full_name: string; email: string };
}

/**
 * Audit log list parameters
 */
export interface AuditLogListParams {
  page?: number;
  limit?: number;
  admin_id?: string;
  action?: string;
  entity_type?: AuditEntityType;
  startDate?: string;
  endDate?: string;
}

// ============================================
// COMMON TYPES
// ============================================

/**
 * Pagination info
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// ============================================
// AUTH TYPES
// ============================================

/**
 * Admin login request
 */
export interface AdminLoginRequest {
  email: string;
  password: string;
}

/**
 * Admin login response
 */
export interface AdminLoginResponse {
  success: boolean;
  user?: AdminSessionUser;
  error?: string;
}

/**
 * Admin verify response
 */
export interface AdminVerifyResponse {
  authenticated: boolean;
  user?: AdminSessionUser;
}
