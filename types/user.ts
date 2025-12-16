// SABIPREP - User Types

import type { Grade } from './auth';
import type { User, UserStats, UserProgress, Achievement } from './database';

/**
 * User profile for display
 */
export interface UserProfile extends User {
  fullName: string;
  avatarUrl?: string;
  grade: Grade;
  initials: string;
  joinedAt: string;
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
