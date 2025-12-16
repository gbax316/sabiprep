// SABIPREP - Type Definitions
// This file exports all types for the application

export * from './database';

export type { LoginCredentials, SignupData, AuthState, AuthResponse, Session, AuthError, PasswordResetRequest, PasswordUpdateData, Grade, OAuthProvider, OnboardingStep, OnboardingState } from '@/types/auth';
export type { UserProfile, UserPreferences, NotificationPreferences, PremiumStatus, MasteryLevel, Theme, Language, StreakData, StreakDay, AchievementCategory, LeaderboardEntry, ActivityLogEntry, ActivityType } from '@/types/user';
export type { QuestionOption, OptionKey, Answer, Difficulty, ExamType, SubjectIcon, SubjectColor, QuestionFilters, QuestionSet, DailyChallenge } from '@/types/questions';
export type { SessionMode, SessionStatus, SessionConfig, ActiveSessionState, SessionResult, TopicPerformance, UnlockedAchievement, QuestionState, TimerState, PracticeModeState, TestModeState, TimedModeState, SessionHistoryEntry, ContinueLearning } from '@/types/learning';
export type { UserAnalytics, AnalyticsPeriod, AnalyticsOverview, WeeklyActivity, DayActivity, SubjectPerformance, TopicAnalytics, Recommendation, RecommendationType, PerformanceTrend, TrendData, SessionAnalytics, DifficultyBreakdown, QuestionAnalysis, ExamReadiness, ComparisonData, StudyGoal, GoalType, ChartData } from '@/types/analytics';
