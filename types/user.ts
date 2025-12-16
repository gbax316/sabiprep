// SABIPREP - User Types

import type { Grade } from './auth';

/**
 * User profile data
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  grade: Grade;
  joinedAt: string;
  lastActiveAt: string;
  streakDays: number;
  totalQuestionsAnswered: number;
  averageAccuracy: number;
  currentRank?: number;
  premiumStatus: PremiumStatus;
  premiumExpiresAt?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/**
 * User profile for display
 */
export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string;
  grade: Grade;
  initials: string;
  joinedAt: string;
}

/**
 * User statistics
 */
export interface UserStats {
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  totalStudyTime: number; // in minutes
  streakDays: number;
  longestStreak: number;
  currentRank?: number;
  totalBadges: number;
  totalPoints: number;
}

/**
 * User progress for a specific topic
 */
export interface UserProgress {
  id: string;
  userId: string;
  topicId: string;
  subjectId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  lastAttemptedAt: string;
  masteryLevel: MasteryLevel;
  createdAt: string;
  updatedAt: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  notifications: NotificationPreferences;
  theme: Theme;
  language: Language;
  dailyGoal: number; // questions per day
  reminderTime?: string; // HH:mm format
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  dailyReminder: boolean;
  streakReminder: boolean;
  newContent: boolean;
  achievements: boolean;
  promotions: boolean;
}

/**
 * Premium subscription status
 */
export type PremiumStatus = 'free' | 'trial' | 'premium' | 'expired';

/**
 * Mastery level for topics
 */
export type MasteryLevel = 'beginner' | 'learning' | 'proficient' | 'mastered';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Language options
 */
export type Language = 'en' | 'yo' | 'ig' | 'ha';

/**
 * User streak data
 */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  streakHistory: StreakDay[];
}

/**
 * Individual streak day
 */
export interface StreakDay {
  date: string;
  questionsAnswered: number;
  completed: boolean;
}

/**
 * User achievement/badge
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  target: number;
  category: AchievementCategory;
}

/**
 * Achievement categories
 */
export type AchievementCategory = 
  | 'streak'
  | 'accuracy'
  | 'questions'
  | 'subjects'
  | 'speed'
  | 'special';

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  score: number;
  accuracy: number;
  questionsAnswered: number;
}

/**
 * User activity log entry
 */
export interface ActivityLogEntry {
  id: string;
  userId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Activity types
 */
export type ActivityType =
  | 'session_completed'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'level_up'
  | 'subject_started'
  | 'topic_mastered';
