// SABIPREP - API Layer
// Central API functions for interacting with Supabase

import { supabase } from './supabaseClient';
import type {
  Subject,
  Topic,
  Question,
  LearningSession,
  SessionAnswer,
  UserProgress,
  User,
  UserStats,
  Achievement,
  UserAchievement,
  AnalyticsData,
} from '@/types/database';

// ============================================
// SUBJECTS
// ============================================

/**
 * Get all subjects
 */
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get a single subject by ID or slug
 */
export async function getSubject(idOrSlug: string): Promise<Subject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// TOPICS
// ============================================

/**
 * Get topics for a subject
 */
export async function getTopics(subjectId: string): Promise<Topic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get a single topic by ID
 */
export async function getTopic(topicId: string): Promise<Topic | null> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('id', topicId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// QUESTIONS
// ============================================

export interface QuestionFilters {
  subjectId?: string;
  topicId?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  examType?: 'JAMB' | 'WAEC' | 'NECO';
  examYear?: number;
  limit?: number;
}

/**
 * Get questions with optional filters
 */
export async function getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
  let query = supabase.from('questions').select('*');

  if (filters.subjectId) {
    query = query.eq('subject_id', filters.subjectId);
  }
  if (filters.topicId) {
    query = query.eq('topic_id', filters.topicId);
  }
  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters.examType) {
    query = query.eq('exam_type', filters.examType);
  }
  if (filters.examYear) {
    query = query.eq('exam_year', filters.examYear);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order('created_at');

  if (error) throw error;
  return data || [];
}

/**
 * Get a single question by ID
 */
export async function getQuestion(questionId: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get random questions for a topic
 */
export async function getRandomQuestions(
  topicId: string,
  count: number = 20
): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('topic_id', topicId)
    .limit(count);

  if (error) throw error;
  
  // Shuffle the questions
  return (data || []).sort(() => Math.random() - 0.5);
}

// ============================================
// SESSIONS
// ============================================

export interface CreateSessionParams {
  userId: string;
  subjectId: string;
  topicId: string;
  mode: 'practice' | 'test' | 'timed';
  totalQuestions: number;
  timeLimit?: number;
}

/**
 * Create a new learning session
 */
export async function createSession(params: CreateSessionParams): Promise<LearningSession> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      subject_id: params.subjectId,
      topic_id: params.topicId,
      mode: params.mode,
      total_questions: params.totalQuestions,
      time_limit_seconds: params.timeLimit,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<LearningSession | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's recent sessions
 */
export async function getUserSessions(
  userId: string,
  limit: number = 10
): Promise<LearningSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Update session progress
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<LearningSession>
): Promise<LearningSession> {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  scorePercentage: number
): Promise<LearningSession> {
  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score_percentage: scorePercentage,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SESSION ANSWERS
// ============================================

export interface CreateAnswerParams {
  sessionId: string;
  questionId: string;
  userAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintUsed?: boolean;
  solutionViewed?: boolean;
}

/**
 * Record a user's answer to a question
 */
export async function createSessionAnswer(
  params: CreateAnswerParams
): Promise<SessionAnswer> {
  const { data, error } = await supabase
    .from('session_answers')
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all answers for a session
 */
export async function getSessionAnswers(sessionId: string): Promise<SessionAnswer[]> {
  const { data, error } = await supabase
    .from('session_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at');

  if (error) throw error;
  return data || [];
}

// ============================================
// USER PROGRESS
// ============================================

/**
 * Get user's progress for a specific topic
 */
export async function getUserTopicProgress(
  userId: string,
  topicId: string
): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Get all user progress
 */
export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Update user progress for a topic
 */
export async function updateUserProgress(
  userId: string,
  subjectId: string,
  topicId: string,
  questionsAttempted: number,
  questionsCorrect: number
): Promise<UserProgress> {
  const accuracy = (questionsCorrect / questionsAttempted) * 100;

  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      subject_id: subjectId,
      topic_id: topicId,
      questions_attempted: questionsAttempted,
      questions_correct: questionsCorrect,
      accuracy_percentage: accuracy,
      last_practiced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// USER STATS
// ============================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const user = await getUserProfile(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const stats: UserStats = {
    questionsAnswered: user.total_questions_answered,
    correctAnswers: user.total_correct_answers,
    accuracy: user.total_questions_answered > 0
      ? (user.total_correct_answers / user.total_questions_answered) * 100
      : 0,
    studyTimeMinutes: user.total_study_time_minutes,
    currentStreak: user.streak_count,
    lastActiveDate: user.last_active_date ? new Date(user.last_active_date) : undefined,
  };

  return stats;
}

/**
 * Update user streak
 */
export async function updateUserStreak(userId: string): Promise<void> {
  const { error } = await supabase.rpc('update_user_streak', {
    user_uuid: userId,
  });

  if (error) throw error;
}

/**
 * Increment user stats after completing a session
 */
export async function incrementUserStats(
  userId: string,
  questionsAnswered: number,
  correctAnswers: number,
  studyTimeMinutes: number
): Promise<User> {
  const user = await getUserProfile(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  return updateUserProfile(userId, {
    total_questions_answered: user.total_questions_answered + questionsAnswered,
    total_correct_answers: user.total_correct_answers + correctAnswers,
    total_study_time_minutes: user.total_study_time_minutes + studyTimeMinutes,
  });
}

// ============================================
// ACHIEVEMENTS
// ============================================

/**
 * Get all available achievements
 */
export async function getAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('requirement_value');

  if (error) throw error;
  return data || [];
}

/**
 * Get user's earned achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Award an achievement to a user
 */
export async function awardAchievement(
  userId: string,
  achievementId: string
): Promise<UserAchievement> {
  const { data, error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check and award achievements based on user stats
 */
export async function checkAndAwardAchievements(userId: string): Promise<void> {
  const [stats, achievements, userAchievements] = await Promise.all([
    getUserStats(userId),
    getAchievements(),
    getUserAchievements(userId),
  ]);

  const earnedAchievementIds = new Set(
    userAchievements.map((ua) => ua.achievement_id)
  );

  for (const achievement of achievements) {
    // Skip if already earned
    if (earnedAchievementIds.has(achievement.id)) continue;

    let shouldAward = false;

    switch (achievement.requirement_type) {
      case 'questions_answered':
        shouldAward = stats.questionsAnswered >= achievement.requirement_value;
        break;
      case 'streak':
        shouldAward = stats.currentStreak >= achievement.requirement_value;
        break;
      case 'accuracy':
        shouldAward = stats.accuracy >= achievement.requirement_value &&
                     stats.questionsAnswered >= 20;
        break;
    }

    if (shouldAward) {
      await awardAchievement(userId, achievement.id);
    }
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get user analytics data
 */
export async function getAnalytics(userId: string): Promise<AnalyticsData> {
  const [stats, recentSessions, progress] = await Promise.all([
    getUserStats(userId),
    getUserSessions(userId, 10),
    getUserProgress(userId),
  ]);

  // Calculate weekly activity
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const weeklyActivity = last7Days.map((date) => {
    const sessionsOnDate = recentSessions.filter((s) =>
      s.started_at.startsWith(date)
    );
    return {
      date,
      questionsAnswered: sessionsOnDate.reduce(
        (sum, s) => sum + s.questions_answered,
        0
      ),
    };
  });

  // Calculate subject performance
  const subjectPerformance = progress.reduce((acc, p) => {
    const existing = acc.find((item) => item.subjectId === p.subject_id);
    if (existing) {
      existing.questionsAttempted += p.questions_attempted;
      existing.questionsCorrect += p.questions_correct;
      existing.accuracy = existing.questionsAttempted > 0
        ? (existing.questionsCorrect / existing.questionsAttempted) * 100
        : 0;
    } else {
      acc.push({
        subjectId: p.subject_id,
        questionsAttempted: p.questions_attempted,
        questionsCorrect: p.questions_correct,
        accuracy: p.accuracy_percentage,
      });
    }
    return acc;
  }, [] as AnalyticsData['subjectPerformance']);

  // Identify strengths and weaknesses
  const sortedByAccuracy = [...progress].sort(
    (a, b) => b.accuracy_percentage - a.accuracy_percentage
  );

  return {
    totalStats: stats,
    weeklyActivity,
    subjectPerformance,
    strengths: sortedByAccuracy.slice(0, 3).map((p) => p.topic_id),
    weaknesses: sortedByAccuracy.slice(-3).reverse().map((p) => p.topic_id),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate session score
 */
export function calculateSessionScore(
  totalQuestions: number,
  correctAnswers: number
): number {
  return (correctAnswers / totalQuestions) * 100;
}

/**
 * Format time in minutes and seconds
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get difficulty color
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':
      return 'text-green-600 bg-green-50';
    case 'Medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'Hard':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Get grade label with emoji
 */
export function getGradeLabel(percentage: number): { label: string; emoji: string } {
  if (percentage >= 90) return { label: 'Excellent', emoji: '🌟' };
  if (percentage >= 80) return { label: 'Very Good', emoji: '⭐' };
  if (percentage >= 70) return { label: 'Good', emoji: '👍' };
  if (percentage >= 60) return { label: 'Fair', emoji: '👌' };
  if (percentage >= 50) return { label: 'Pass', emoji: '✅' };
  return { label: 'Needs Improvement', emoji: '📚' };
}
