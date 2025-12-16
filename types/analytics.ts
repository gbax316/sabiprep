// SABIPREP - Analytics Types

import type { SessionMode } from './learning';
import type { Difficulty, ExamType } from './questions';

/**
 * User analytics overview
 */
export interface UserAnalytics {
  userId: string;
  period: AnalyticsPeriod;
  overview: AnalyticsOverview;
  weeklyActivity: WeeklyActivity;
  subjectPerformance: SubjectPerformance[];
  topicPerformance: TopicAnalytics[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  trends: PerformanceTrend;
}

/**
 * Analytics time period
 */
export type AnalyticsPeriod = 'week' | 'month' | 'year' | 'all';

/**
 * Analytics overview stats
 */
export interface AnalyticsOverview {
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  totalStudyTime: number; // in minutes
  totalSessions: number;
  averageSessionDuration: number; // in minutes
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  rank?: number;
}

/**
 * Weekly activity data
 */
export interface WeeklyActivity {
  days: DayActivity[];
  totalQuestions: number;
  totalTime: number;
  averageDaily: number;
}

/**
 * Single day activity
 */
export interface DayActivity {
  date: string;
  dayName: string;
  questionsAnswered: number;
  studyTime: number; // in minutes
  accuracy: number;
  sessionsCompleted: number;
}

/**
 * Subject performance analytics
 */
export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
  subjectColor: string;
  totalQuestions: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  progress: number; // 0-100
  timeSpent: number; // in minutes
  lastActivityAt?: string;
}

/**
 * Topic analytics
 */
export interface TopicAnalytics {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracy: number;
  difficulty: Difficulty;
  masteryLevel: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  lastActivityAt?: string;
}

/**
 * Performance recommendation
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
  priority: 'high' | 'medium' | 'low';
  topicId?: string;
  subjectId?: string;
}

/**
 * Recommendation types
 */
export type RecommendationType =
  | 'weak_topic'
  | 'practice_more'
  | 'try_harder'
  | 'maintain_streak'
  | 'new_subject'
  | 'review_mistakes'
  | 'speed_improvement';

/**
 * Performance trend data
 */
export interface PerformanceTrend {
  accuracyTrend: TrendData[];
  questionsTrend: TrendData[];
  timeTrend: TrendData[];
  overallDirection: 'up' | 'down' | 'stable';
  percentageChange: number;
}

/**
 * Trend data point
 */
export interface TrendData {
  date: string;
  value: number;
}

/**
 * Session analytics
 */
export interface SessionAnalytics {
  sessionId: string;
  mode: SessionMode;
  subjectName: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;
  averageTimePerQuestion: number;
  difficultyBreakdown: DifficultyBreakdown;
  questionAnalysis: QuestionAnalysis[];
}

/**
 * Difficulty breakdown
 */
export interface DifficultyBreakdown {
  easy: { attempted: number; correct: number; accuracy: number };
  medium: { attempted: number; correct: number; accuracy: number };
  hard: { attempted: number; correct: number; accuracy: number };
}

/**
 * Individual question analysis
 */
export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  difficulty: Difficulty;
  topicName: string;
}

/**
 * Exam readiness score
 */
export interface ExamReadiness {
  examType: ExamType;
  overallScore: number; // 0-100
  subjectScores: {
    subjectId: string;
    subjectName: string;
    score: number;
    questionsAttempted: number;
  }[];
  estimatedGrade: string;
  areasToImprove: string[];
  strengths: string[];
}

/**
 * Comparison data (for leaderboard)
 */
export interface ComparisonData {
  userRank: number;
  totalUsers: number;
  percentile: number;
  averageAccuracy: number;
  userAccuracy: number;
  topPerformers: {
    rank: number;
    name: string;
    accuracy: number;
    questionsAnswered: number;
  }[];
}

/**
 * Study goal
 */
export interface StudyGoal {
  id: string;
  userId: string;
  type: GoalType;
  target: number;
  current: number;
  progress: number; // 0-100
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  completed: boolean;
}

/**
 * Goal types
 */
export type GoalType =
  | 'questions_answered'
  | 'accuracy_target'
  | 'study_time'
  | 'streak_days'
  | 'topics_completed';

/**
 * Chart data format
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}
