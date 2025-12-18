// SABIPREP - Notification Logic
// Helper functions to create notifications based on user role and events

import { createNotification, createNotificationForRole } from './api';
import type { NotificationType, UserRole, LearningSession, UserAchievement } from '@/types/database';

/**
 * Notification logic for Students
 */

/**
 * Create notification when achievement is unlocked
 */
export async function notifyAchievementUnlocked(
  userId: string,
  achievement: { id: string; name: string; description: string }
): Promise<void> {
  await createNotification(
    userId,
    'achievement_unlocked',
    '🎉 Achievement Unlocked!',
    `You've unlocked "${achievement.name}"! ${achievement.description}`,
    { achievement_id: achievement.id }
  );
}

/**
 * Create notification for streak milestones
 */
export async function notifyStreakMilestone(
  userId: string,
  streakCount: number
): Promise<void> {
  const milestones = [7, 14, 30, 50, 100];
  if (milestones.includes(streakCount)) {
    await createNotification(
      userId,
      'streak_milestone',
      `🔥 ${streakCount}-Day Streak!`,
      `Amazing! You've maintained a ${streakCount}-day learning streak. Keep it up!`,
      { streak_count: streakCount }
    );
  }
}

/**
 * Create notification when session is completed with good score
 */
export async function notifySessionCompleted(
  userId: string,
  session: LearningSession
): Promise<void> {
  const score = session.score_percentage || 0;
  
  if (score >= 80) {
    await createNotification(
      userId,
      'session_completed',
      '🌟 Excellent Work!',
      `You scored ${Math.round(score)}% on your ${session.mode} session. Outstanding performance!`,
      { session_id: session.id, score_percentage: score }
    );
  } else if (score >= 60) {
    await createNotification(
      userId,
      'session_completed',
      '👍 Good Job!',
      `You scored ${Math.round(score)}% on your ${session.mode} session. Keep practicing!`,
      { session_id: session.id, score_percentage: score }
    );
  }
}

/**
 * Create notification when study goal is achieved
 */
export async function notifyGoalAchieved(
  userId: string,
  goalType: 'weekly_study_time' | 'questions_answered' | 'accuracy',
  achievedValue: number
): Promise<void> {
  const messages = {
    weekly_study_time: `🎯 Weekly Goal Achieved! You've studied ${Math.floor(achievedValue / 60)} hours this week!`,
    questions_answered: `🎯 Goal Achieved! You've answered ${achievedValue} questions!`,
    accuracy: `🎯 Accuracy Goal Achieved! You've reached ${achievedValue}% accuracy!`,
  };

  await createNotification(
    userId,
    'goal_achieved',
    'Goal Achieved!',
    messages[goalType],
    { goal_type: goalType, achieved_value: achievedValue }
  );
}

/**
 * Notification logic for Tutors
 */

/**
 * Create notification when student achieves something
 */
export async function notifyTutorStudentAchievement(
  tutorId: string,
  studentName: string,
  achievement: { name: string }
): Promise<void> {
  await createNotification(
    tutorId,
    'student_achievement',
    'Student Achievement',
    `${studentName} unlocked "${achievement.name}"`,
    { student_name: studentName, achievement_name: achievement.name }
  );
}

/**
 * Create notification when student makes significant progress
 */
export async function notifyTutorStudentProgress(
  tutorId: string,
  studentName: string,
  progress: { streak: number; questionsAnswered: number; accuracy: number }
): Promise<void> {
  await createNotification(
    tutorId,
    'student_progress',
    'Student Progress Update',
    `${studentName} has a ${progress.streak}-day streak and ${progress.questionsAnswered} questions answered with ${Math.round(progress.accuracy)}% accuracy`,
    { student_name: studentName, ...progress }
  );
}

/**
 * Notification logic for Admins
 */

/**
 * Create notification when new user signs up
 */
export async function notifyAdminNewSignup(
  adminId: string,
  user: { name: string; email: string; role: UserRole }
): Promise<void> {
  await createNotification(
    adminId,
    'new_signup',
    'New User Signup',
    `${user.name} (${user.email}) signed up as ${user.role}`,
    { user_name: user.name, user_email: user.email, user_role: user.role }
  );
}

/**
 * Create notification when import is completed
 */
export async function notifyAdminImportCompleted(
  adminId: string,
  importReport: { filename: string; successful_rows: number; failed_rows: number }
): Promise<void> {
  await createNotification(
    adminId,
    'import_completed',
    'Import Completed',
    `Import "${importReport.filename}" completed: ${importReport.successful_rows} successful, ${importReport.failed_rows} failed`,
    { filename: importReport.filename, successful_rows: importReport.successful_rows, failed_rows: importReport.failed_rows }
  );
}

/**
 * Create system alert for admins
 */
export async function notifyAdminSystemAlert(
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await createNotificationForRole(
    'admin',
    'system_alert',
    title,
    message,
    data
  );
}

/**
 * Create notification for content review needed
 */
export async function notifyAdminContentReview(
  adminId: string,
  contentType: 'question' | 'subject' | 'topic',
  contentId: string,
  reason: string
): Promise<void> {
  await createNotification(
    adminId,
    'content_review',
    'Content Review Needed',
    `${contentType} ${contentId} needs review: ${reason}`,
    { content_type: contentType, content_id: contentId, reason }
  );
}

/**
 * Daily reminder notification (can be scheduled)
 */
export async function notifyDailyReminder(userId: string): Promise<void> {
  await createNotification(
    userId,
    'daily_reminder',
    '📚 Time to Practice!',
    "Don't forget to practice today! Even 10 minutes can make a difference.",
    {}
  );
}

/**
 * New content available notification
 */
export async function notifyNewContent(
  userId: string,
  contentType: 'subject' | 'topic' | 'questions',
  contentName: string
): Promise<void> {
  await createNotification(
    userId,
    'new_content',
    '✨ New Content Available',
    `New ${contentType}: ${contentName} is now available!`,
    { content_type: contentType, content_name: contentName }
  );
}
