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
  Notification,
  NotificationType,
  UserRole,
  UserGoal,
  UserGoalType,
} from '@/types/database';

// ============================================
// SUBJECTS
// ============================================

/**
 * Get all subjects (with caching for performance)
 */
export async function getSubjects(): Promise<Subject[]> {
  // Check cache first
  const cacheKey = 'all_subjects';
  const cached = getCached(subjectsCache, cacheKey, STATIC_CACHE_TTL);
  if (cached) return cached;

  // Fetch subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (subjectsError) throw subjectsError;
  if (!subjects || subjects.length === 0) return [];

  // Get actual question counts for each subject (in parallel with subjects fetch)
  const { data: questionCounts, error: countsError } = await supabase
    .from('questions')
    .select('subject_id')
    .eq('status', 'published');

  if (countsError) {
    console.error('Error fetching question counts:', countsError);
    // Fallback to cached total_questions if count query fails
    const result = subjects;
    setCached(subjectsCache, cacheKey, result, 10);
    return result;
  }

  // Calculate counts per subject
  const countMap: Record<string, number> = {};
  if (questionCounts) {
    questionCounts.forEach(q => {
      countMap[q.subject_id] = (countMap[q.subject_id] || 0) + 1;
    });
  }

  // Update subjects with actual counts
  const result = subjects.map(subject => ({
    ...subject,
    total_questions: countMap[subject.id] || 0,
  }));

  // Cache the result
  setCached(subjectsCache, cacheKey, result, 10);
  return result;
}

/**
 * Get a single subject by ID or slug
 */
export async function getSubject(idOrSlug: string): Promise<Subject | null> {
  const { data: subject, error } = await supabase
    .from('subjects')
    .select('*')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .single();

  if (error) throw error;
  if (!subject) return null;

  // Get actual question count
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subject.id)
    .eq('status', 'published');

  if (countError) {
    console.error('Error fetching question count:', countError);
    return subject; // Return with cached value if count fails
  }

  return {
    ...subject,
    total_questions: count || 0,
  };
}

// ============================================
// TOPICS
// ============================================

/**
 * Get topics for a subject (with caching for performance)
 */
export async function getTopics(subjectId: string): Promise<Topic[]> {
  // Check cache first
  const cacheKey = `topics:${subjectId}`;
  const cached = getCached(topicsCache, cacheKey, STATIC_CACHE_TTL);
  if (cached) return cached;

  // Fetch topics
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .eq('status', 'active')
    .eq('subject_id', subjectId)
    .order('name');

  if (topicsError) throw topicsError;
  if (!topics || topics.length === 0) return [];

  // Get actual question counts for each topic
  const { data: questionCounts, error: countsError } = await supabase
    .from('questions')
    .select('topic_id')
    .eq('status', 'published')
    .eq('subject_id', subjectId);

  if (countsError) {
    console.error('Error fetching question counts:', countsError);
    const result = topics; // Fallback to cached values if count query fails
    setCached(topicsCache, cacheKey, result, 50);
    return result;
  }

  // Calculate counts per topic
  const countMap: Record<string, number> = {};
  if (questionCounts) {
    questionCounts.forEach(q => {
      countMap[q.topic_id] = (countMap[q.topic_id] || 0) + 1;
    });
  }

  // Update topics with actual counts
  const result = topics.map(topic => ({
    ...topic,
    total_questions: countMap[topic.id] || 0,
  }));

  // Cache the result
  setCached(topicsCache, cacheKey, result, 50);
  return result;
}

/**
 * Get a single topic by ID
 */
/**
 * Get topics by their IDs (batch query for performance)
 */
export async function getTopicsByIds(topicIds: string[]): Promise<Topic[]> {
  if (topicIds.length === 0) return [];

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .in('id', topicIds)
    .eq('status', 'active');

  if (error) throw error;
  if (!topics || topics.length === 0) return [];

  // Get question counts for all topics in parallel
  const { data: questionCounts, error: countsError } = await supabase
    .from('questions')
    .select('topic_id')
    .in('topic_id', topicIds)
    .eq('status', 'published');

  if (countsError) {
    console.error('Error fetching question counts:', countsError);
    return topics; // Fallback to cached values
  }

  // Calculate counts per topic
  const countMap: Record<string, number> = {};
  if (questionCounts) {
    questionCounts.forEach(q => {
      countMap[q.topic_id] = (countMap[q.topic_id] || 0) + 1;
    });
  }

  // Update topics with actual counts
  return topics.map(topic => ({
    ...topic,
    total_questions: countMap[topic.id] || 0,
  }));
}

export async function getTopic(topicId: string): Promise<Topic | null> {
  const { data: topic, error } = await supabase
    .from('topics')
    .select('*')
    .eq('id', topicId)
    .single();

  if (error) throw error;
  if (!topic) return null;

  // Get actual question count
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('status', 'published');

  if (countError) {
    console.error('Error fetching question count:', countError);
    return topic; // Return with cached value if count fails
  }

  return {
    ...topic,
    total_questions: count || 0,
  };
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
  let query = supabase.from('questions').select('*').eq('status', 'published');

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

// Simple in-memory cache for frequently accessed data
const questionCache = new Map<string, { data: Question[]; timestamp: number }>();
const subjectsCache = new Map<string, { data: Subject[]; timestamp: number }>();
const topicsCache = new Map<string, { data: Topic[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STATIC_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for subjects/topics (change less frequently)

function getCached<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, ttl: number = CACHE_TTL): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCached<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T, maxSize: number = 50) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean up old cache entries
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    cache.clear();
    entries.slice(0, maxSize).forEach(([k, v]) => cache.set(k, v));
  }
}

/**
 * Get intelligent random questions for a topic with balanced distribution
 * - Difficulty: 30% Easy, 50% Medium, 20% Hard
 * - Exam Type: Balanced distribution across available exam types
 * - Uses single optimized query with caching
 */
export async function getRandomQuestions(
  topicId: string,
  count: number = 20
): Promise<Question[]> {
  // Check cache first
  const cacheKey = `topic:${topicId}:all`;
  const cached = getCached(questionCache, cacheKey);
  
  let allQuestions: Question[] = [];
  
  if (cached) {
    allQuestions = cached;
  } else {
    // Single optimized query - fetch all published questions for topic
    // Use a larger pool for better distribution (2x instead of 3x)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'published')
      .eq('topic_id', topicId)
      .limit(count * 2); // Fetch 2x for better randomization pool
    
    if (error) throw error;
    allQuestions = data || [];
    
    // Cache the full pool
    if (allQuestions.length > 0) {
      setCached(questionCache, cacheKey, allQuestions);
    }
  }

  if (allQuestions.length === 0) return [];

  // If we have fewer questions than requested, return all
  if (allQuestions.length <= count) {
    return allQuestions.sort(() => Math.random() - 0.5);
  }

  // Intelligent distribution strategy
  const easyCount = Math.max(1, Math.round(count * 0.3));
  const mediumCount = Math.max(1, Math.round(count * 0.5));
  const hardCount = Math.max(0, count - easyCount - mediumCount);

  // Group questions by difficulty and exam_type
  const byDifficulty: Record<string, Question[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
    Unknown: [],
  };

  const byExamType: Record<string, Question[]> = {};

  allQuestions.forEach(q => {
    const difficulty = q.difficulty || 'Unknown';
    byDifficulty[difficulty] = byDifficulty[difficulty] || [];
    byDifficulty[difficulty].push(q);

    const examType = q.exam_type || 'General';
    byExamType[examType] = byExamType[examType] || [];
    byExamType[examType].push(q);
  });

  // Select questions with balanced difficulty distribution
  const selected: Question[] = [];
  const usedIds = new Set<string>();

  // Helper to get random question from array
  const getRandom = (arr: Question[]): Question | null => {
    const available = arr.filter(q => !usedIds.has(q.id));
    if (available.length === 0) return null;
    const random = available[Math.floor(Math.random() * available.length)];
    usedIds.add(random.id);
    return random;
  };

  // Select by difficulty
  const easyQuestions = (byDifficulty.Easy || []).sort(() => Math.random() - 0.5);
  const mediumQuestions = (byDifficulty.Medium || []).sort(() => Math.random() - 0.5);
  const hardQuestions = (byDifficulty.Hard || []).sort(() => Math.random() - 0.5);
  const unknownQuestions = (byDifficulty.Unknown || []).sort(() => Math.random() - 0.5);

  // Add easy questions
  for (let i = 0; i < easyCount && selected.length < count; i++) {
    const q = getRandom(easyQuestions);
    if (q) selected.push(q);
  }

  // Add medium questions
  for (let i = 0; i < mediumCount && selected.length < count; i++) {
    const q = getRandom(mediumQuestions);
    if (q) selected.push(q);
  }

  // Add hard questions
  for (let i = 0; i < hardCount && selected.length < count; i++) {
    const q = getRandom(hardQuestions);
    if (q) selected.push(q);
  }

  // Fill remaining with any available (prioritize unknown difficulty if needed)
  while (selected.length < count) {
    const q = getRandom([...unknownQuestions, ...easyQuestions, ...mediumQuestions, ...hardQuestions]);
    if (!q) break;
    selected.push(q);
  }

  // Ensure exam type diversity if we have multiple exam types
  const examTypes = Object.keys(byExamType);
  if (examTypes.length > 1 && selected.length > 5) {
    // Redistribute to ensure exam type diversity
    const examTypeCount = Math.ceil(selected.length / examTypes.length);
    const redistributed: Question[] = [];
    const redistributedIds = new Set<string>();

    examTypes.forEach(examType => {
      const typeQuestions = byExamType[examType].filter(q => 
        selected.some(s => s.id === q.id) && !redistributedIds.has(q.id)
      );
      const toAdd = Math.min(examTypeCount, typeQuestions.length);
      typeQuestions.slice(0, toAdd).forEach(q => {
        redistributed.push(q);
        redistributedIds.add(q.id);
      });
    });

    // Fill remaining from original selection
    selected.forEach(q => {
      if (!redistributedIds.has(q.id) && redistributed.length < count) {
        redistributed.push(q);
      }
    });

    return redistributed.sort(() => Math.random() - 0.5).slice(0, count);
  }

  // Final shuffle to mix everything
  return selected.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Get intelligent random questions from multiple topics with balanced distribution
 * - Distributes questions evenly across topics
 * - Each topic's questions are distributed by difficulty (30% Easy, 50% Medium, 20% Hard)
 * - Ensures exam type diversity across all topics
 * - Uses parallel fetching and caching for performance
 */
export async function getRandomQuestionsFromTopics(
  topicIds: string[],
  totalCount: number = 20
): Promise<Question[]> {
  if (topicIds.length === 0) return [];
  if (topicIds.length === 1) return getRandomQuestions(topicIds[0], totalCount);

  // Calculate questions per topic (balanced distribution)
  const questionsPerTopic = Math.ceil(totalCount / topicIds.length);

  // Fetch questions from all topics in parallel with intelligent distribution
  const fetchPromises = topicIds.map(topicId => 
    getRandomQuestions(topicId, questionsPerTopic)
  );

  const results = await Promise.all(fetchPromises);
  let allQuestions: Question[] = results.flat();

  // If we got more than needed, intelligently select to ensure diversity
  if (allQuestions.length > totalCount) {
    // Group by exam type for diversity
    const byExamType: Record<string, Question[]> = {};
    allQuestions.forEach(q => {
      const examType = q.exam_type || 'General';
      byExamType[examType] = byExamType[examType] || [];
      byExamType[examType].push(q);
    });

    const examTypes = Object.keys(byExamType);
    if (examTypes.length > 1) {
      // Ensure exam type diversity
      const selected: Question[] = [];
      const usedIds = new Set<string>();
      const perType = Math.ceil(totalCount / examTypes.length);

      examTypes.forEach(examType => {
        const typeQuestions = byExamType[examType]
          .filter(q => !usedIds.has(q.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, perType);
        typeQuestions.forEach(q => {
          selected.push(q);
          usedIds.add(q.id);
        });
      });

      // Fill remaining from any available
      allQuestions.forEach(q => {
        if (!usedIds.has(q.id) && selected.length < totalCount) {
          selected.push(q);
          usedIds.add(q.id);
        }
      });

      allQuestions = selected;
    }
  }

  // Final shuffle to mix topics, difficulties, and exam types
  return allQuestions.sort(() => Math.random() - 0.5).slice(0, totalCount);
}

/**
 * Get intelligent questions from multiple topics with specific distribution
 * @param distribution Map of topicId -> question count
 * Each topic's questions are intelligently distributed by difficulty
 */
export async function getQuestionsWithDistribution(
  distribution: Record<string, number>
): Promise<Question[]> {
  // Fetch questions from all topics in parallel with intelligent distribution
  const fetchPromises = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(async ([topicId, count]) => {
      try {
        const questions = await getRandomQuestions(topicId, count);
        return { 
          topicId, 
          questions, 
          requested: count,
          received: questions.length 
        };
      } catch (error) {
        console.error(`Error fetching questions for topic ${topicId}:`, error);
        return { topicId, questions: [], requested: count, received: 0 };
      }
    });

  const results = await Promise.all(fetchPromises);
  const allQuestions: Question[] = [];
  let totalRequested = 0;
  let totalReceived = 0;

  // Collect all questions from parallel fetches
  results.forEach((result) => {
    allQuestions.push(...result.questions);
    totalRequested += result.requested;
    totalReceived += result.received;
    
    // Warn if we didn't get enough questions from a topic
    if (result.received < result.requested) {
      console.warn(
        `Topic ${result.topicId}: requested ${result.requested}, got ${result.received}`
      );
    }
  });

  // Log summary
  if (totalReceived < totalRequested) {
    console.warn(
      `Question distribution: requested ${totalRequested}, received ${totalReceived} (${totalRequested - totalReceived} missing)`
    );
  }

  // Final shuffle to mix topics and difficulties
  return allQuestions.sort(() => Math.random() - 0.5);
}

// ============================================
// SESSIONS
// ============================================

export interface CreateSessionParams {
  userId: string;
  subjectId: string;
  topicId?: string; // For single topic (backward compatibility)
  topicIds?: string[]; // For multi-topic sessions
  mode: 'practice' | 'test' | 'timed';
  totalQuestions: number;
  timeLimit?: number;
  isGuest?: boolean; // If true, create in-memory guest session
}

/**
 * Create a new learning session
 * Supports both authenticated users (database) and guests (in-memory)
 */
export async function createSession(params: CreateSessionParams): Promise<LearningSession> {
  // Support both single topic (backward compatible) and multi-topic
  const topicIds = params.topicIds || (params.topicId ? [params.topicId] : []);
  
  // Guest session: create in-memory session stored in sessionStorage
  if (params.isGuest) {
    if (typeof window === 'undefined') {
      throw new Error('Guest sessions can only be created on the client');
    }
    
    // Get guest ID from sessionStorage if userId is empty
    const guestId = params.userId || (() => {
      const guestSessionStr = sessionStorage.getItem('sabiprep_guest_session');
      if (guestSessionStr) {
        try {
          const session = JSON.parse(guestSessionStr);
          return session.guestId;
        } catch (e) {
          console.error('Error parsing guest session:', e);
        }
      }
      // Fallback: generate new guest ID
      return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    })();
    
    // Generate session ID (UUID-like)
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const guestSession: LearningSession = {
      id: sessionId,
      user_id: guestId,
      subject_id: params.subjectId,
      topic_id: params.topicId || (topicIds.length === 1 ? topicIds[0] : undefined),
      topic_ids: topicIds.length > 1 ? topicIds : (topicIds.length === 1 ? topicIds : undefined),
      mode: params.mode,
      total_questions: params.totalQuestions,
      questions_answered: 0,
      correct_answers: 0,
      time_spent_seconds: 0,
      time_limit_seconds: params.timeLimit || undefined,
      status: 'in_progress',
      last_question_index: 0,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: undefined,
    };
    
    // Store guest session in sessionStorage
    sessionStorage.setItem(`guest_session_${sessionId}`, JSON.stringify(guestSession));
    
    return guestSession;
  }
  
  // Authenticated user session: create in database
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      subject_id: params.subjectId,
      topic_id: params.topicId || (topicIds.length === 1 ? topicIds[0] : null), // Keep for backward compatibility
      topic_ids: topicIds.length > 1 ? topicIds : null, // Store as JSONB for multi-topic
      mode: params.mode,
      total_questions: params.totalQuestions,
      time_limit_seconds: params.timeLimit,
      status: 'in_progress',
      last_question_index: 0,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create session');

  // Ensure topic_ids is parsed correctly from JSONB
  if (data.topic_ids && typeof data.topic_ids === 'string') {
    try {
      data.topic_ids = JSON.parse(data.topic_ids);
    } catch (e) {
      console.error('Error parsing topic_ids:', e);
      data.topic_ids = null;
    }
  }

  // Ensure topic_ids is an array or null
  if (data.topic_ids && !Array.isArray(data.topic_ids)) {
    data.topic_ids = null;
  }

  // For backward compatibility: if topic_id exists but topic_ids doesn't, populate topic_ids
  if (!data.topic_ids && data.topic_id) {
    data.topic_ids = [data.topic_id];
  }

  return data;
}

/**
 * Get a session by ID
 * Supports both database sessions and guest sessions (from sessionStorage)
 */
export async function getSession(sessionId: string): Promise<LearningSession | null> {
  // Check if it's a guest session
  if (sessionId.startsWith('guest_') && typeof window !== 'undefined') {
    const guestSessionStr = sessionStorage.getItem(`guest_session_${sessionId}`);
    if (guestSessionStr) {
      try {
        const guestSession = JSON.parse(guestSessionStr) as LearningSession;
        // Ensure topic_ids is an array
        if (guestSession.topic_ids && !Array.isArray(guestSession.topic_ids)) {
          guestSession.topic_ids = [guestSession.topic_ids];
        }
        return guestSession;
      } catch (e) {
        console.error('Error parsing guest session:', e);
        return null;
      }
    }
    return null;
  }
  
  // Database session
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  if (!data) return null;

  // Ensure topic_ids is parsed correctly from JSONB
  // Supabase should auto-parse JSONB, but ensure it's an array
  if (data.topic_ids && typeof data.topic_ids === 'string') {
    try {
      data.topic_ids = JSON.parse(data.topic_ids);
    } catch (e) {
      console.error('Error parsing topic_ids:', e);
      data.topic_ids = null;
    }
  }

  // Ensure topic_ids is an array or null
  if (data.topic_ids && !Array.isArray(data.topic_ids)) {
    data.topic_ids = null;
  }

  // For backward compatibility: if topic_id exists but topic_ids doesn't, populate topic_ids
  if (!data.topic_ids && data.topic_id) {
    data.topic_ids = [data.topic_id];
  }

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
  if (!data) return [];

  // Parse topic_ids from JSONB for all sessions
  return data.map(session => {
    if (session.topic_ids && typeof session.topic_ids === 'string') {
      try {
        session.topic_ids = JSON.parse(session.topic_ids);
      } catch (e) {
        console.error('Error parsing topic_ids:', e);
        session.topic_ids = null;
      }
    }
    if (session.topic_ids && !Array.isArray(session.topic_ids)) {
      session.topic_ids = null;
    }
    // For backward compatibility: if topic_id exists but topic_ids doesn't, populate topic_ids
    if (!session.topic_ids && session.topic_id) {
      session.topic_ids = [session.topic_id];
    }
    return session;
  });
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
  if (!data) throw new Error('Failed to update session');

  // Ensure topic_ids is parsed correctly from JSONB
  if (data.topic_ids && typeof data.topic_ids === 'string') {
    try {
      data.topic_ids = JSON.parse(data.topic_ids);
    } catch (e) {
      console.error('Error parsing topic_ids:', e);
      data.topic_ids = null;
    }
  }

  // Ensure topic_ids is an array or null
  if (data.topic_ids && !Array.isArray(data.topic_ids)) {
    data.topic_ids = null;
  }

  // For backward compatibility: if topic_id exists but topic_ids doesn't, populate topic_ids
  if (!data.topic_ids && data.topic_id) {
    data.topic_ids = [data.topic_id];
  }

  return data;
}

/**
 * Complete a session
 */
export async function completeSession(
  sessionId: string,
  scorePercentage: number,
  timeSpentSeconds?: number,
  correctAnswers?: number,
  totalQuestions?: number
): Promise<LearningSession> {
  const updateData: any = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    score_percentage: scorePercentage,
  };
  
  // Update time if provided
  if (timeSpentSeconds !== undefined) {
    updateData.time_spent_seconds = timeSpentSeconds;
  }
  
  // Update correct answers if provided
  if (correctAnswers !== undefined) {
    updateData.correct_answers = correctAnswers;
  }
  
  // Update questions answered if provided
  if (totalQuestions !== undefined) {
    updateData.questions_answered = totalQuestions;
  }
  
  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to complete session');

  // Ensure topic_ids is parsed correctly from JSONB
  if (data.topic_ids && typeof data.topic_ids === 'string') {
    try {
      data.topic_ids = JSON.parse(data.topic_ids);
    } catch (e) {
      console.error('Error parsing topic_ids:', e);
      data.topic_ids = null;
    }
  }

  // Ensure topic_ids is an array or null
  if (data.topic_ids && !Array.isArray(data.topic_ids)) {
    data.topic_ids = null;
  }

  // For backward compatibility: if topic_id exists but topic_ids doesn't, populate topic_ids
  if (!data.topic_ids && data.topic_id) {
    data.topic_ids = [data.topic_id];
  }

  return data;
}

/**
 * Complete a session and update goals
 */
export async function completeSessionWithGoals(
  sessionId: string,
  scorePercentage: number,
  timeSpentSeconds?: number,
  correctAnswers?: number,
  totalQuestions?: number,
  userId?: string
): Promise<LearningSession> {
  // Complete the session first
  const session = await completeSession(
    sessionId,
    scorePercentage,
    timeSpentSeconds,
    correctAnswers,
    totalQuestions
  );

  // Update goals if userId is provided
  if (userId) {
    try {
      // Update weekly study time goal
      if (timeSpentSeconds && timeSpentSeconds > 0) {
        const studyTimeMinutes = Math.floor(timeSpentSeconds / 60);
        await updateGoalProgress(userId, 'weekly_study_time', studyTimeMinutes);
      }

      // Update questions answered goals
      if (totalQuestions && totalQuestions > 0) {
        await updateGoalProgress(userId, 'weekly_questions', totalQuestions);
        await updateGoalProgress(userId, 'daily_questions', totalQuestions);
      }

      // Check for goal achievements
      await checkGoalAchievements(userId);
    } catch (error) {
      // Don't fail if goal update fails
      console.error('Error updating goals:', error);
    }
  }

  return session;
}

// ============================================
// SESSION ANSWERS
// ============================================

export interface CreateAnswerParams {
  sessionId: string;
  questionId: string;
  topicId?: string; // For topic-specific analytics
  userAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintUsed?: boolean;
  hintLevel?: 1 | 2 | 3; // Progressive hint level used
  solutionViewed?: boolean;
  solutionViewedBeforeAttempt?: boolean;
  attemptCount?: number;
  firstAttemptCorrect?: boolean;
}

/**
 * Record a user's answer to a question
 */
export async function createSessionAnswer(
  params: CreateAnswerParams
): Promise<SessionAnswer> {
  const { data, error } = await supabase
    .from('session_answers')
    .insert({
      session_id: params.sessionId,
      question_id: params.questionId,
      topic_id: params.topicId,
      user_answer: params.userAnswer,
      is_correct: params.isCorrect,
      time_spent_seconds: params.timeSpentSeconds,
      hint_used: params.hintUsed ?? false,
      hint_level: params.hintLevel,
      solution_viewed: params.solutionViewed ?? false,
      solution_viewed_before_attempt: params.solutionViewedBeforeAttempt ?? false,
      attempt_count: params.attemptCount ?? 1,
      first_attempt_correct: params.firstAttemptCorrect,
    })
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

/**
 * Get questions by their IDs (optimized for results page)
 */
export async function getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  if (questionIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds);

  if (error) throw error;
  
  // Preserve the order of questionIds
  const questionMap = new Map((data || []).map(q => [q.id, q]));
  return questionIds.map(id => questionMap.get(id)).filter(Boolean) as Question[];
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

  // Check for streak milestones and create notifications
  try {
    const user = await getUserProfile(userId);
    if (user && user.streak_count > 0) {
      const { notifyStreakMilestone } = await import('./notifications');
      await notifyStreakMilestone(userId, user.streak_count);
    }
  } catch (notifError) {
    // Don't fail if notification creation fails
    console.error('Error creating streak notification:', notifError);
  }
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

  // Create notification for achievement unlock
  try {
    const { data: achievement } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single();
    
    if (achievement) {
      // Import notification function dynamically to avoid circular dependency
      const { notifyAchievementUnlocked } = await import('./notifications');
      await notifyAchievementUnlocked(userId, {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description || '',
      });
    }
  } catch (notifError) {
    // Don't fail if notification creation fails
    console.error('Error creating achievement notification:', notifError);
  }

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
 * Get user analytics data with period filtering
 */
export async function getAnalytics(
  userId: string,
  period: '7D' | '30D' | '90D' | 'All' = '7D'
): Promise<AnalyticsData> {
  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case '7D':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30D':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90D':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'All':
      startDate = new Date(0); // Beginning of time
      break;
  }

  const [stats, allSessions, progress] = await Promise.all([
    getUserStats(userId),
    getUserSessions(userId, period === 'All' ? 1000 : 500), // Get more sessions for longer periods
    getUserProgress(userId),
  ]);

  // Filter sessions by period
  const recentSessions = allSessions.filter((s) => {
    const sessionDate = s.started_at ? new Date(s.started_at) : null;
    return sessionDate && sessionDate >= startDate;
  });

  // Calculate activity for the period
  const daysInPeriod = period === '7D' ? 7 : period === '30D' ? 30 : period === '90D' ? 90 : 90; // Default to 90 for All
  const activityDates = Array.from({ length: daysInPeriod }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (daysInPeriod - 1 - i));
    return date.toISOString().split('T')[0];
  });

  const weeklyActivity = activityDates.map((date) => {
    const sessionsOnDate = recentSessions.filter((s) =>
      s.started_at && s.started_at.startsWith(date)
    );
    return {
      date,
      questionsAnswered: sessionsOnDate.reduce(
        (sum, s) => sum + (s.questions_answered || 0),
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

  // Identify strengths and weaknesses (top 5 each)
  const sortedByAccuracy = [...progress].sort(
    (a, b) => (b.accuracy_percentage || 0) - (a.accuracy_percentage || 0)
  );

  // Filter out topics with no accuracy data
  const validProgress = sortedByAccuracy.filter(p => p.accuracy_percentage !== null && p.accuracy_percentage !== undefined);

  return {
    totalStats: stats,
    weeklyActivity,
    subjectPerformance,
    strengths: validProgress.slice(0, 5).map((p) => p.topic_id),
    weaknesses: validProgress.slice(-5).reverse().map((p) => p.topic_id),
  };
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Get user notifications
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session found when fetching notifications for userId:', userId);
      return [];
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      // Safely extract error properties
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      const errorDetails = error?.details || null;
      const errorHint = error?.hint || null;
      
      // Log detailed error information
      console.error('Error fetching notifications:', {
        message: errorMessage,
        details: errorDetails,
        hint: errorHint,
        code: errorCode,
        userId,
        hasSession: !!session,
        rawError: error,
      });
      
      // If it's a permissions/RLS error, return empty array instead of throwing
      if (errorCode === 'PGRST116' || errorMessage?.includes('permission') || errorMessage?.includes('policy')) {
        console.warn('RLS policy blocked notification access, returning empty array');
        return [];
      }
      
      // For other errors, return empty array instead of throwing to prevent UI crashes
      console.warn('Non-permission error in getNotifications, returning empty array');
      return [];
    }
    
    return (data || []).map((n: any) => ({
      ...n,
      read_at: n.read_at || null,
    }));
  } catch (error) {
    // Catch any unexpected errors and return empty array
    console.error('Unexpected error in getNotifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session found when fetching unread count for userId:', userId);
      return 0;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      // Safely extract error properties
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.code || 'UNKNOWN';
      const errorDetails = error?.details || null;
      const errorHint = error?.hint || null;
      
      console.error('Error fetching unread notification count:', {
        message: errorMessage,
        details: errorDetails,
        hint: errorHint,
        code: errorCode,
        userId,
        rawError: error,
      });
      
      // If it's a permissions/RLS error, return 0 instead of throwing
      if (errorCode === 'PGRST116' || errorMessage?.includes('permission') || errorMessage?.includes('policy')) {
        console.warn('RLS policy blocked unread count access, returning 0');
        return 0;
      }
      
      // For other errors, return 0 instead of throwing to prevent UI crashes
      console.warn('Non-permission error in getUnreadNotificationCount, returning 0');
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    // Catch any unexpected errors and return 0
    console.error('Unexpected error in getUnreadNotificationCount:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', {
    notification_uuid: notificationId,
  });

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_all_notifications_read', {
    user_uuid: userId,
  });

  if (error) throw error;
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<Notification> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      data: data || null,
    })
    .select()
    .single();

  if (error) throw error;
  if (!notification) throw new Error('Failed to create notification');
  return notification;
}

/**
 * Create notifications for specific user roles
 */
export async function createNotificationForRole(
  role: UserRole,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Get all users with the specified role
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', role)
    .eq('status', 'active');

  if (error) throw error;
  if (!users || users.length === 0) return;

  // Create notifications for all users
  const notifications = users.map(user => ({
    user_id: user.id,
    type,
    title,
    message,
    data: data || null,
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) throw insertError;
}

// ============================================
// USER GOALS
// ============================================

/**
 * Get user goals
 */
export async function getUserGoals(userId: string): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific user goal by type
 */
export async function getUserGoal(
  userId: string,
  goalType: UserGoalType
): Promise<UserGoal | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_type', goalType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Set or update a user goal
 */
export async function setUserGoal(
  userId: string,
  goalType: UserGoalType,
  targetValue: number
): Promise<UserGoal> {
  // Check if goal exists
  const existing = await getUserGoal(userId, goalType);

  if (existing) {
    // Update existing goal
    const { data, error } = await supabase
      .from('user_goals')
      .update({
        target_value: targetValue,
        current_value: 0, // Reset progress when changing target
        achieved: false,
        achieved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update goal');
    return data;
  } else {
    // Create new goal
    const periodEnd = goalType === 'weekly_study_time' || goalType === 'weekly_questions'
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : goalType === 'daily_questions'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: userId,
        goal_type: goalType,
        target_value: targetValue,
        current_value: 0,
        period_start: new Date().toISOString(),
        period_end: periodEnd,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create goal');
    return data;
  }
}

/**
 * Update goal progress (called automatically when user activity occurs)
 */
export async function updateGoalProgress(
  userId: string,
  goalType: UserGoalType,
  incrementValue: number = 1
): Promise<void> {
  const { error } = await supabase.rpc('update_goal_progress', {
    user_uuid: userId,
    goal_type_param: goalType,
    increment_value: incrementValue,
  });

  if (error) throw error;
}

/**
 * Check if goals are achieved and create notifications
 */
export async function checkGoalAchievements(userId: string): Promise<void> {
  const goals = await getUserGoals(userId);
  const newlyAchieved = goals.filter(g => g.achieved && g.achieved_at && 
    new Date(g.achieved_at).getTime() > Date.now() - 60000); // Achieved in last minute

  for (const goal of newlyAchieved) {
    try {
      const { notifyGoalAchieved } = await import('./notifications');
      let goalType: 'weekly_study_time' | 'questions_answered' | 'accuracy';
      let value = goal.current_value;

      switch (goal.goal_type) {
        case 'weekly_study_time':
          goalType = 'weekly_study_time';
          break;
        case 'daily_questions':
        case 'weekly_questions':
          goalType = 'questions_answered';
          break;
        case 'accuracy_target':
          goalType = 'accuracy';
          break;
        default:
          continue;
      }

      await notifyGoalAchieved(userId, goalType, value);
    } catch (error) {
      console.error('Error creating goal achievement notification:', error);
    }
  }
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
