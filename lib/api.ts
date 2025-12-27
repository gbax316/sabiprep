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
  UserSubjectPreference,
  DailyChallenge,
  UserDailyChallenge,
  MasteryBadge,
  UserMasteryBadge,
} from '@/types/database';

import {
  getGuestAttemptedQuestions,
  recordGuestAttemptedQuestions,
  resetGuestAttemptedQuestions,
  isGuestPoolExhausted,
} from './guest-question-tracking';

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
 * - Supports exclusion list for question non-repetition
 * @param topicId - The topic ID to get questions from
 * @param count - Number of questions to return
 * @param excludeQuestionIds - Question IDs to exclude (already attempted)
 */
export async function getRandomQuestions(
  topicId: string,
  count: number = 20,
  excludeQuestionIds: string[] = []
): Promise<Question[]> {
  // Check cache first
  const cacheKey = `topic:${topicId}:all`;
  const cached = getCached(questionCache, cacheKey);
  
  let allQuestions: Question[] = [];
  
  if (cached) {
    allQuestions = cached;
  } else {
    // Fetch all published questions for topic (remove limit for accurate pool)
    // We need all questions to properly support exclusion
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'published')
      .eq('topic_id', topicId);
    
    if (error) throw error;
    allQuestions = data || [];
    
    // Cache the full pool
    if (allQuestions.length > 0) {
      setCached(questionCache, cacheKey, allQuestions);
    }
  }

  if (allQuestions.length === 0) return [];

  // Filter out excluded questions (already attempted)
  const excludeSet = new Set(excludeQuestionIds);
  const availableQuestions = excludeSet.size > 0 
    ? allQuestions.filter(q => !excludeSet.has(q.id))
    : allQuestions;

  if (availableQuestions.length === 0) return [];

  // If we have fewer questions than requested, return all available
  if (availableQuestions.length <= count) {
    return availableQuestions.sort(() => Math.random() - 0.5);
  }

  // Intelligent distribution strategy
  const easyCount = Math.max(1, Math.round(count * 0.3));
  const mediumCount = Math.max(1, Math.round(count * 0.5));
  const hardCount = Math.max(0, count - easyCount - mediumCount);

  // Group available questions by difficulty and exam_type
  const byDifficulty: Record<string, Question[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
    Unknown: [],
  };

  const byExamType: Record<string, Question[]> = {};

  availableQuestions.forEach(q => {
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
 * - Supports exclusion list for question non-repetition
 * @param topicIds - Array of topic IDs to get questions from
 * @param totalCount - Total number of questions to return
 * @param excludeQuestionIds - Question IDs to exclude (already attempted)
 */
export async function getRandomQuestionsFromTopics(
  topicIds: string[],
  totalCount: number = 20,
  excludeQuestionIds: string[] = []
): Promise<Question[]> {
  if (topicIds.length === 0) return [];
  if (topicIds.length === 1) return getRandomQuestions(topicIds[0], totalCount, excludeQuestionIds);

  // Calculate questions per topic with buffer to ensure we have enough after filtering
  // Request 3-4x per topic to account for topics with fewer questions, filtering, and diversity selection
  const baseQuestionsPerTopic = Math.ceil(totalCount / topicIds.length);
  // For small counts, ensure minimum of 3 per topic; for larger counts, use multiplier approach
  // Request 3x the base amount to ensure we have enough after diversity filtering
  const questionsPerTopic = Math.max(
    baseQuestionsPerTopic * 3,  // Request 3x base for buffer
    totalCount < 10 ? 3 : 5     // Minimum per topic (3 for small counts, 5 for larger)
  );

  console.log(`[getRandomQuestionsFromTopics] Requesting ${questionsPerTopic} questions per topic (${topicIds.length} topics, target: ${totalCount} total, excluding ${excludeQuestionIds.length} questions)`);

  // Fetch questions from all topics in parallel with intelligent distribution
  // Pass the exclusion list to each topic query
  const fetchPromises = topicIds.map(topicId => 
    getRandomQuestions(topicId, questionsPerTopic, excludeQuestionIds)
  );

  const results = await Promise.all(fetchPromises);
  let allQuestions: Question[] = results.flat();

  // Log how many questions we got from each topic
  results.forEach((questions, index) => {
    if (questions.length < questionsPerTopic) {
      console.warn(`[getRandomQuestionsFromTopics] Topic ${topicIds[index]} returned ${questions.length} questions (requested ${questionsPerTopic})`);
    }
  });

  // Warn if we don't have enough questions
  if (allQuestions.length < totalCount) {
    console.warn(
      `[getRandomQuestionsFromTopics] Insufficient questions: requested ${totalCount}, got ${allQuestions.length} (${totalCount - allQuestions.length} missing)`
    );
    // Return what we have (will be less than requested)
    return allQuestions.sort(() => Math.random() - 0.5);
  }

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
  // Slice to ensure we return exactly totalCount (or less if we don't have enough)
  const finalQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, totalCount);
  
  if (finalQuestions.length < totalCount) {
    console.warn(
      `[getRandomQuestionsFromTopics] Final result has ${finalQuestions.length} questions (requested ${totalCount})`
    );
  } else {
    console.log(`[getRandomQuestionsFromTopics] Successfully returned ${finalQuestions.length} questions (requested ${totalCount})`);
  }
  
  return finalQuestions;
}

/**
 * Get intelligent questions from multiple topics with specific distribution
 * @param distribution Map of topicId -> question count
 * @param excludeQuestionIds Question IDs to exclude (already attempted)
 * Each topic's questions are intelligently distributed by difficulty
 */
export async function getQuestionsWithDistribution(
  distribution: Record<string, number>,
  excludeQuestionIds: string[] = []
): Promise<Question[]> {
  const topicIds = Object.keys(distribution);
  const totalRequested = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  
  // Fetch questions from all topics in parallel with intelligent distribution
  // Pass the exclusion list to each topic query
  const fetchPromises = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(async ([topicId, count]) => {
      try {
        const questions = await getRandomQuestions(topicId, count, excludeQuestionIds);
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
  const questionIds = new Set<string>();
  let totalReceived = 0;

  // Collect all questions from parallel fetches (avoid duplicates)
  results.forEach((result) => {
    result.questions.forEach(q => {
      if (!questionIds.has(q.id)) {
        allQuestions.push(q);
        questionIds.add(q.id);
      }
    });
    totalReceived += result.received;
    
    // Warn if we didn't get enough questions from a topic
    if (result.received < result.requested) {
      console.warn(
        `Topic ${result.topicId}: requested ${result.requested}, got ${result.received}`
      );
    }
  });

  // If we got fewer questions than requested, try to compensate from other topics
  if (allQuestions.length < totalRequested && topicIds.length > 1) {
    const shortfall = totalRequested - allQuestions.length;
    console.log(`Attempting to compensate for ${shortfall} missing questions from other topics`);
    
    // Try to get more questions from topics that have questions available
    // Prioritize topics that originally requested more questions (more likely to have extras)
    const sortedTopics = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1]) // Sort by requested count descending
      .map(([topicId]) => topicId);
    
    for (const topicId of sortedTopics) {
      if (allQuestions.length >= totalRequested) break;
      
      const needed = totalRequested - allQuestions.length;
      if (needed <= 0) break;
      
      try {
        // Try to get a few extra questions (request a bit more to account for potential duplicates)
        // Pass the exclusion list plus already selected questions to avoid duplicates
        const allExcluded = [...excludeQuestionIds, ...Array.from(questionIds)];
        const extraQuestions = await getRandomQuestions(topicId, needed + 2, allExcluded);
        
        // Add only new questions that we don't already have
        let added = 0;
        for (const q of extraQuestions) {
          if (!questionIds.has(q.id) && allQuestions.length < totalRequested) {
            allQuestions.push(q);
            questionIds.add(q.id);
            added++;
          }
        }
        
        if (added > 0) {
          console.log(`Added ${added} extra questions from topic ${topicId}`);
        }
      } catch (error) {
        console.error(`Error fetching extra questions from topic ${topicId}:`, error);
      }
    }
  }

  // Log summary
  if (allQuestions.length < totalRequested) {
    console.warn(
      `Question distribution: requested ${totalRequested}, received ${allQuestions.length} (${totalRequested - allQuestions.length} missing)`
    );
  } else if (allQuestions.length > totalRequested) {
    console.warn(
      `[getQuestionsWithDistribution] Received more questions than requested: ${allQuestions.length} > ${totalRequested}. Slicing to exact count.`
    );
  }

  // Final shuffle to mix topics and difficulties
  // IMPORTANT: Slice to ensure we return exactly the requested count
  const finalQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, totalRequested);
  
  console.log(`[getQuestionsWithDistribution] Returning ${finalQuestions.length} questions (requested ${totalRequested})`);
  
  return finalQuestions;
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
  timeLimit?: number; // Time limit in SECONDS (e.g., 1200 for 20 minutes)
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
      topic_id: params.topicId || topicIds[0] || undefined, // Always set first topic as fallback
      topic_ids: topicIds.length > 0 ? topicIds : undefined, // Always store all topics
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
    
    console.log('[API] Created guest session:', {
      sessionId,
      topicId: guestSession.topic_id,
      topicIds: guestSession.topic_ids,
      totalQuestions: guestSession.total_questions,
      timeLimitSeconds: guestSession.time_limit_seconds,
    });
    
    // Store guest session in sessionStorage
    sessionStorage.setItem(`guest_session_${sessionId}`, JSON.stringify(guestSession));
    
    return guestSession;
  }
  
  // Authenticated user session: create in database
  const sessionPayload = {
    user_id: params.userId,
    subject_id: params.subjectId,
    topic_id: params.topicId || topicIds[0] || null, // Always set first topic as fallback
    topic_ids: topicIds.length > 0 ? topicIds : null, // Always store all topics
    mode: params.mode,
    total_questions: params.totalQuestions,
    time_limit_seconds: params.timeLimit,
    status: 'in_progress',
    last_question_index: 0,
  };
  
  console.log('[API] Creating session:', sessionPayload);
  
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionPayload)
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
 * Prioritizes incomplete sessions (in_progress, paused) over completed ones
 */
export async function getUserSessions(
  userId: string,
  limit: number = 10
): Promise<LearningSession[]> {
  // Fetch incomplete sessions first (in_progress and paused)
  const { data: incompleteSessions, error: incompleteError } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['in_progress', 'paused'])
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (incompleteError) throw incompleteError;
  
  // Calculate remaining slots for completed sessions
  const remainingLimit = limit - (incompleteSessions?.length || 0);
  
  let completedSessions: LearningSession[] = [];
  if (remainingLimit > 0) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'in', '("in_progress","paused")')
      .order('created_at', { ascending: false })
      .limit(remainingLimit);
    
    if (error) throw error;
    completedSessions = data || [];
  }
  
  // Combine: incomplete sessions first, then completed
  const allSessions = [...(incompleteSessions || []), ...completedSessions];

  // Parse topic_ids from JSONB for all sessions
  return allSessions.map(session => {
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
 * Cleanup invalid sessions (sessions with no questions available)
 */
export async function cleanupInvalidSessions(userId: string): Promise<void> {
  const sessions = await getUserSessions(userId, 100);
  
  for (const session of sessions) {
    if (session.status === 'in_progress' || session.status === 'paused') {
      try {
        const validation = await canResumeSession(session.id);
        if (!validation.canResume) {
          await updateSession(session.id, { status: 'abandoned' });
        }
      } catch (error) {
        // Don't fail if cleanup fails for one session
        console.error(`Error cleaning up session ${session.id}:`, error);
      }
    }
  }
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
  userId?: string,
  isDailyChallenge: boolean = false
): Promise<LearningSession> {
  // Complete the session first
  const session = await completeSession(
    sessionId,
    scorePercentage,
    timeSpentSeconds,
    correctAnswers,
    totalQuestions
  );

  // Update goals and award XP if userId is provided
  if (userId && correctAnswers !== undefined && totalQuestions !== undefined) {
    try {
      const studyTimeMinutes = timeSpentSeconds ? Math.floor(timeSpentSeconds / 60) : 0;
      
      // Award XP and update stats using incrementUserStats
      await incrementUserStats(
        userId,
        totalQuestions,
        correctAnswers,
        studyTimeMinutes,
        isDailyChallenge
      );

      // Update weekly study time goal
      if (studyTimeMinutes > 0) {
        await updateGoalProgress(userId, 'weekly_study_time', studyTimeMinutes);
      }

      // Update questions answered goals
      await updateGoalProgress(userId, 'weekly_questions', totalQuestions);
      await updateGoalProgress(userId, 'daily_questions', totalQuestions);

      // Check for goal achievements
      await checkGoalAchievements(userId);
    } catch (error) {
      // Don't fail if goal update fails
      console.error('Error updating goals and XP:', error);
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
  try {
    // Use upsert to handle answer updates (if user changes their answer)
    const { data, error } = await supabase
      .from('session_answers')
      .upsert({
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
      }, {
        onConflict: 'session_id,question_id', // Update if answer already exists
      })
      .select()
      .single();

    if (error) {
      console.error('Error in createSessionAnswer:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating session answer:', error);
    throw error;
  }
}

/**
 * Get all answers for a session
 */
export async function getSessionAnswers(sessionId: string): Promise<SessionAnswer[]> {
  // Check if it's a guest session
  if (sessionId.startsWith('guest_') && typeof window !== 'undefined') {
    const guestAnswersStr = sessionStorage.getItem(`guest_answers_${sessionId}`);
    if (guestAnswersStr) {
      try {
        return JSON.parse(guestAnswersStr) as SessionAnswer[];
      } catch (e) {
        console.error('Error parsing guest answers:', e);
        return [];
      }
    }
    return [];
  }
  
  // Database session
  const { data, error } = await supabase
    .from('session_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at');

  if (error) throw error;
  return data || [];
}

/**
 * Validate if a session can be resumed
 * Returns true if session has questions available (either from answers or topic)
 */
export async function canResumeSession(sessionId: string): Promise<{
  canResume: boolean;
  hasAnswers: boolean;
  questionCount: number;
  reason?: string;
}> {
  // Check if session exists
  const session = await getSession(sessionId);
  if (!session) {
    return { canResume: false, hasAnswers: false, questionCount: 0, reason: 'Session not found' };
  }

  // Check if session has answers (original questions)
  const answers = await getSessionAnswers(sessionId);
  
  if (answers.length > 0) {
    return { canResume: true, hasAnswers: true, questionCount: answers.length };
  }

  // If no answers, check if topic/subject has questions available
  const topicId = session.topic_id || session.topic_ids?.[0];
  if (topicId) {
    try {
      const questions = await getRandomQuestions(topicId, 1); // Just check if any exist
      
      if (questions.length > 0) {
        return { canResume: true, hasAnswers: false, questionCount: 0 };
      }
    } catch (error) {
      console.error('Error checking questions availability:', error);
      return { canResume: false, hasAnswers: false, questionCount: 0, reason: 'Error checking questions' };
    }
  }

  return { canResume: false, hasAnswers: false, questionCount: 0, reason: 'No questions available' };
}

/**
 * Get questions by their IDs (optimized for results page)
 */
export async function getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  if (questionIds.length === 0) return [];
  
  // Check if any question IDs are from guest sessions - guest questions might be stored differently
  // For now, we'll try to fetch from database (guest questions should still be in the database)
  // If it fails, we'll return empty array
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds);

    if (error) {
      // For guest sessions, this might fail - return empty array instead of throwing
      if (typeof window !== 'undefined') {
        console.warn('Error fetching questions (might be guest session):', error);
        return [];
      }
      throw error;
    }
    
    // Preserve the order of questionIds
    const questionMap = new Map((data || []).map(q => [q.id, q]));
    return questionIds.map(id => questionMap.get(id)).filter(Boolean) as Question[];
  } catch (error) {
    // Handle network errors gracefully for guest sessions
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Network error fetching questions (might be guest session):', error);
      return [];
    }
    throw error;
  }
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
    xpPoints: user.xp_points || 0,
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
 * Also awards XP automatically
 */
export async function incrementUserStats(
  userId: string,
  questionsAnswered: number,
  correctAnswers: number,
  studyTimeMinutes: number,
  isDailyChallenge: boolean = false
): Promise<{ user: User; xpEarned: number }> {
  const user = await getUserProfile(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Award XP using the database function
  const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
    user_uuid: userId,
    correct_answers_count: correctAnswers,
    is_daily_challenge: isDailyChallenge,
  });

  if (xpError) {
    console.error('Error awarding XP:', xpError);
    // Continue even if XP fails
  }

  const xpEarned = xpData || 0;

  // Update user stats
  const updatedUser = await updateUserProfile(userId, {
    total_questions_answered: user.total_questions_answered + questionsAnswered,
    total_correct_answers: user.total_correct_answers + correctAnswers,
    total_study_time_minutes: user.total_study_time_minutes + studyTimeMinutes,
  });

  // Check and award mastery badges (global)
  try {
    await supabase.rpc('check_and_award_mastery_badges', {
      user_uuid: userId,
      subject_uuid: null, // Global badges
    });
  } catch (error) {
    console.error('Error checking mastery badges:', error);
    // Continue even if badge check fails
  }

  return { user: updatedUser, xpEarned };
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
    // Skip if no userId provided
    if (!userId) {
      return 0;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Silently return 0 for unauthenticated users - this is expected for guest mode
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
      
      // Common expected errors - silently return 0
      const isExpectedError = 
        errorCode === 'PGRST116' || // RLS policy error
        errorCode === '42P01' || // Table doesn't exist
        errorMessage?.includes('permission') || 
        errorMessage?.includes('policy') ||
        errorMessage?.includes('does not exist');
      
      if (isExpectedError) {
        // Silently handle expected errors
        return 0;
      }
      
      // Only log unexpected errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Notification count fetch failed:', errorMessage);
      }
      
      return 0;
    }
    
    return count || 0;
  } catch {
    // Silently catch any unexpected errors and return 0
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

// ============================================
// USER SUBJECT PREFERENCES
// ============================================

/**
 * Get user's preferred subject IDs
 */
export async function getUserSubjectPreferences(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_subject_preferences')
    .select('subject_id')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data) return [];

  return data.map(pref => pref.subject_id);
}

/**
 * Set user's subject preferences (replaces all existing preferences)
 */
export async function setUserSubjectPreferences(
  userId: string,
  subjectIds: string[]
): Promise<void> {
  // Delete all existing preferences
  const { error: deleteError } = await supabase
    .from('user_subject_preferences')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  // If no subjects selected, we're done
  if (subjectIds.length === 0) return;

  // Insert new preferences
  const preferences = subjectIds.map(subjectId => ({
    user_id: userId,
    subject_id: subjectId,
  }));

  const { error: insertError } = await supabase
    .from('user_subject_preferences')
    .insert(preferences);

  if (insertError) throw insertError;
}

/**
 * Get full Subject objects for user's preferred subjects
 */
export async function getPreferredSubjects(userId: string): Promise<Subject[]> {
  const preferredIds = await getUserSubjectPreferences(userId);
  
  if (preferredIds.length === 0) return [];

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .in('id', preferredIds)
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  if (!data) return [];

  // Get actual question counts for each subject
  const { data: questionCounts, error: countsError } = await supabase
    .from('questions')
    .select('subject_id')
    .eq('status', 'published')
    .in('subject_id', preferredIds);

  if (countsError) {
    console.error('Error fetching question counts:', countsError);
    return data;
  }

  // Calculate counts per subject
  const countMap: Record<string, number> = {};
  if (questionCounts) {
    questionCounts.forEach(q => {
      countMap[q.subject_id] = (countMap[q.subject_id] || 0) + 1;
    });
  }

  // Update subjects with actual counts
  return data.map(subject => ({
    ...subject,
    total_questions: countMap[subject.id] || 0,
  }));
}

// ============================================
// XP SYSTEM
// ============================================

/**
 * Award XP to a user (called automatically via incrementUserStats)
 */
export async function awardXP(
  userId: string,
  correctAnswersCount: number,
  isDailyChallenge: boolean = false
): Promise<number> {
  const { data, error } = await supabase.rpc('award_xp', {
    user_uuid: userId,
    correct_answers_count: correctAnswersCount,
    is_daily_challenge: isDailyChallenge,
  });

  if (error) throw error;
  return data || 0;
}

/**
 * Get user's current XP
 */
export async function getUserXP(userId: string): Promise<number> {
  const user = await getUserProfile(userId);
  return user?.xp_points || 0;
}

// ============================================
// DAILY CHALLENGES
// ============================================

/**
 * Generate daily challenges for today (if not already generated)
 */
export async function generateDailyChallenges(challengeDate?: string): Promise<number> {
  const date = challengeDate || new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase.rpc('generate_daily_challenges', {
      challenge_date: date,
    });

    if (error) {
      // If function doesn't exist, use fallback
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('generate_daily_challenges function does not exist. Using fallback.');
        return await generateDailyChallengesFallback(date);
      }
      throw error;
    }
    return data || 0;
  } catch (error) {
    console.warn('Error calling generate_daily_challenges RPC, using fallback:', error);
    return await generateDailyChallengesFallback(challengeDate);
  }
}

/**
 * Fallback function to manually generate daily challenges
 * Used when the RPC function doesn't exist or fails
 */
async function generateDailyChallengesFallback(challengeDate?: string): Promise<number> {
  const date = challengeDate || new Date().toISOString().split('T')[0];
  let challengeCount = 0;

  try {
    // Get all active subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, status')
      .eq('status', 'active');

    if (subjectsError || !subjects) {
      console.error('Error fetching subjects for fallback:', subjectsError);
      return 0;
    }

    for (const subject of subjects) {
      // Check if challenge already exists
      const { data: existing } = await supabase
        .from('daily_challenges')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('challenge_date', date)
        .maybeSingle();

      if (existing) continue; // Already exists

      // First, get topics for this subject
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subject.id);

      if (topicsError || !topics || topics.length === 0) {
        continue; // No topics
      }

      const topicIds = topics.map(t => t.id);

      // Get random questions for this subject (up to 20)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, topic_id')
        .eq('status', 'published')
        .in('topic_id', topicIds)
        .limit(100); // Get pool to randomize from

      if (questionsError || !questions || questions.length < 10) {
        continue; // Not enough questions
      }

      // Randomly select up to 20 questions
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, Math.min(20, shuffled.length));
      const questionIds = selectedQuestions.map(q => q.id);

      // Insert the challenge
      const { error: insertError } = await supabase
        .from('daily_challenges')
        .insert({
          subject_id: subject.id,
          challenge_date: date,
          question_ids: questionIds,
          time_limit_seconds: 1200, // 20 minutes
          question_count: questionIds.length,
        });

      if (!insertError) {
        challengeCount++;
      }
    }

    return challengeCount;
  } catch (error) {
    console.error('Error in generateDailyChallengesFallback:', error);
    return 0;
  }
}

/**
 * Force generate a daily challenge for a specific subject
 */
export async function forceGenerateDailyChallenge(
  subjectId: string,
  challengeDate?: string,
  questionCount: number = 20
): Promise<DailyChallenge | null> {
  const date = challengeDate || new Date().toISOString().split('T')[0];

  try {
    // Try RPC first
    const { data: challengeId, error: rpcError } = await supabase.rpc('force_generate_daily_challenge', {
      p_subject_id: subjectId,
      p_challenge_date: date,
      p_question_count: questionCount,
    });

    if (!rpcError && challengeId) {
      // Fetch the created challenge
      const { data } = await supabase
        .from('daily_challenges')
        .select('*, subject:subjects(*)')
        .eq('id', challengeId)
        .single();
      return data || null;
    }
  } catch (error) {
    console.warn('RPC force_generate_daily_challenge failed, using fallback:', error);
  }

  // Fallback: manually create
  try {
    // Delete existing challenge for this date
    await supabase
      .from('daily_challenges')
      .delete()
      .eq('subject_id', subjectId)
      .eq('challenge_date', date);

    // First, get topics for this subject
    const { data: topics } = await supabase
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId);

    if (!topics || topics.length === 0) {
      console.warn('No topics available for subject:', subjectId);
      return null;
    }

    const topicIds = topics.map(t => t.id);

    // Get questions for this subject
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'published')
      .in('topic_id', topicIds)
      .limit(100);

    if (!questions || questions.length === 0) {
      console.warn('No questions available for subject:', subjectId);
      return null;
    }

    // Randomly select questions
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    const questionIds = selected.map(q => q.id);

    // Insert new challenge
    const { data: newChallenge, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        subject_id: subjectId,
        challenge_date: date,
        question_ids: questionIds,
        time_limit_seconds: questionCount * 60, // 1 min per question
        question_count: questionIds.length,
      })
      .select('*, subject:subjects(*)')
      .single();

    if (insertError) {
      console.error('Error creating challenge:', insertError);
      return null;
    }

    return newChallenge;
  } catch (error) {
    console.error('Error in forceGenerateDailyChallenge fallback:', error);
    return null;
  }
}

/**
 * Get daily challenge for a subject on a specific date
 */
export async function getDailyChallenge(
  subjectId: string,
  challengeDate?: string
): Promise<DailyChallenge | null> {
  const date = challengeDate || new Date().toISOString().split('T')[0];
  
  // Ensure challenges are generated for today
  await generateDailyChallenges(date);

  const { data, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('challenge_date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

/**
 * Get all daily challenges for today
 */
export async function getTodayDailyChallenges(): Promise<DailyChallenge[]> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Ensure challenges are generated (this might fail if migration hasn't been run, so we catch it)
    try {
      await generateDailyChallenges(today);
    } catch (genError) {
      console.warn('Could not generate daily challenges (migration may not be run):', genError);
      // Continue even if generation fails
    }

    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*, subject:subjects(*)')
      .eq('challenge_date', today);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Daily challenges table does not exist. Please run the migration.');
        return [];
      }
      throw error;
    }
    
    // Sort by subject name manually since order might not work with join
    const sorted = (data || []).sort((a, b) => {
      const subjectA = (a as any).subject?.name || '';
      const subjectB = (b as any).subject?.name || '';
      return subjectA.localeCompare(subjectB);
    });
    
    return sorted;
  } catch (error) {
    console.error('Error in getTodayDailyChallenges:', error);
    // Return empty array on error so the page can still render
    return [];
  }
}

/**
 * Get user's daily challenge completion status
 */
export async function getUserDailyChallenge(
  userId: string,
  dailyChallengeId: string
): Promise<UserDailyChallenge | null> {
  const { data, error } = await supabase
    .from('user_daily_challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('daily_challenge_id', dailyChallengeId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Get all daily challenge completions for a user
 */
export async function getUserDailyChallengeCompletions(
  userId: string,
  limit: number = 30
): Promise<UserDailyChallenge[]> {
  try {
    const { data, error } = await supabase
      .from('user_daily_challenges')
      .select('*, daily_challenge:daily_challenges(*, subject:subjects(*))')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('User daily challenges table does not exist. Please run the migration.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getUserDailyChallengeCompletions:', error);
    return [];
  }
}

/**
 * Complete a daily challenge
 */
export async function completeDailyChallenge(
  userId: string,
  dailyChallengeId: string,
  sessionId: string,
  correctAnswers: number,
  totalQuestions: number,
  timeSpentSeconds: number
): Promise<UserDailyChallenge> {
  const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Award XP (daily challenges get special handling)
  const xpEarned = await awardXP(userId, correctAnswers, true);

  // Record completion
  const { data, error } = await supabase
    .from('user_daily_challenges')
    .insert({
      user_id: userId,
      daily_challenge_id: dailyChallengeId,
      session_id: sessionId,
      score_percentage: scorePercentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent_seconds: timeSpentSeconds,
      xp_earned: xpEarned,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// MASTERY BADGES
// ============================================

/**
 * Get all mastery badges
 */
export async function getMasteryBadges(): Promise<MasteryBadge[]> {
  const { data, error } = await supabase
    .from('mastery_badges')
    .select('*')
    .order('level', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get user's mastery badges
 */
export async function getUserMasteryBadges(
  userId: string,
  subjectId?: string
): Promise<UserMasteryBadge[]> {
  try {
    let query = supabase
      .from('user_mastery_badges')
      .select('*, mastery_badge:mastery_badges(*), subject:subjects(*)')
      .eq('user_id', userId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    } else {
      query = query.is('subject_id', null); // Global badges only
    }

    const { data, error } = await query.order('earned_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Mastery badges tables do not exist. Please run the migration.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getUserMasteryBadges:', error);
    return [];
  }
}

/**
 * Get user's highest mastery badge level (global)
 */
export async function getUserHighestMasteryLevel(userId: string): Promise<number> {
  const badges = await getUserMasteryBadges(userId);
  if (badges.length === 0) return 0;
  
  const levels = badges.map(b => b.mastery_badge?.level || 0);
  return Math.max(...levels);
}

/**
 * Get user's mastery level for a specific subject
 */
export async function getUserSubjectMasteryLevel(
  userId: string,
  subjectId: string
): Promise<number> {
  const badges = await getUserMasteryBadges(userId, subjectId);
  if (badges.length === 0) return 0;
  
  const levels = badges.map(b => b.mastery_badge?.level || 0);
  return Math.max(...levels);
}

/**
 * Check and award mastery badges (called automatically, but can be called manually)
 */
export async function checkAndAwardMasteryBadges(
  userId: string,
  subjectId?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('check_and_award_mastery_badges', {
    user_uuid: userId,
    subject_uuid: subjectId || null,
  });

  if (error) throw error;
  return data || 0;
}

// ============================================
// USER ATTEMPTED QUESTIONS TRACKING
// Prevents question repetition until all questions are exhausted
// ============================================

/**
 * Get all question IDs that a user has attempted for a specific subject
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @returns Array of question IDs that have been attempted
 */
export async function getUserAttemptedQuestions(
  userId: string,
  subjectId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_attempted_questions')
      .select('question_id')
      .eq('user_id', userId)
      .eq('subject_id', subjectId);

    if (error) {
      // If table doesn't exist, return empty array (migration not run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('user_attempted_questions table does not exist. Please run the migration.');
        return [];
      }
      throw error;
    }

    return (data || []).map(row => row.question_id);
  } catch (error) {
    console.error('Error getting user attempted questions:', error);
    return [];
  }
}

/**
 * Record questions as attempted for a user
 * Uses bulk upsert to efficiently handle multiple questions
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @param questionIds - Array of question IDs to mark as attempted
 */
export async function recordAttemptedQuestions(
  userId: string,
  subjectId: string,
  questionIds: string[]
): Promise<void> {
  if (!questionIds || questionIds.length === 0) return;

  try {
    // Use the database function for efficient bulk upsert
    const { error } = await supabase.rpc('record_attempted_questions', {
      p_user_id: userId,
      p_subject_id: subjectId,
      p_question_ids: questionIds,
    });

    if (error) {
      // If function doesn't exist, fall back to regular upsert
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('record_attempted_questions function not found, using fallback');
        await recordAttemptedQuestionsFallback(userId, subjectId, questionIds);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error recording attempted questions:', error);
    // Try fallback method
    try {
      await recordAttemptedQuestionsFallback(userId, subjectId, questionIds);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  }
}

/**
 * Fallback method for recording attempted questions (used if RPC function not available)
 */
async function recordAttemptedQuestionsFallback(
  userId: string,
  subjectId: string,
  questionIds: string[]
): Promise<void> {
  const records = questionIds.map(questionId => ({
    user_id: userId,
    subject_id: subjectId,
    question_id: questionId,
  }));

  const { error } = await supabase
    .from('user_attempted_questions')
    .upsert(records, {
      onConflict: 'user_id,subject_id,question_id',
      ignoreDuplicates: false,
    });

  if (error) {
    // If table doesn't exist, silently fail (migration not run)
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('user_attempted_questions table does not exist. Please run the migration.');
      return;
    }
    throw error;
  }
}

/**
 * Reset attempted questions for a user in a subject
 * Called when all questions have been exhausted to start fresh
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @returns Number of records deleted
 */
export async function resetUserAttemptedQuestions(
  userId: string,
  subjectId: string
): Promise<number> {
  try {
    // Try using the database function first
    const { data, error } = await supabase.rpc('reset_user_attempted_questions', {
      p_user_id: userId,
      p_subject_id: subjectId,
    });

    if (error) {
      // If function doesn't exist, fall back to regular delete
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('reset_user_attempted_questions function not found, using fallback');
        return await resetAttemptedQuestionsFallback(userId, subjectId);
      }
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Error resetting attempted questions:', error);
    return await resetAttemptedQuestionsFallback(userId, subjectId);
  }
}

/**
 * Fallback method for resetting attempted questions
 */
async function resetAttemptedQuestionsFallback(
  userId: string,
  subjectId: string
): Promise<number> {
  const { error, count } = await supabase
    .from('user_attempted_questions')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('subject_id', subjectId);

  if (error) {
    // If table doesn't exist, return 0 (migration not run)
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('user_attempted_questions table does not exist. Please run the migration.');
      return 0;
    }
    throw error;
  }

  return count || 0;
}

/**
 * Get the count of attempted questions for a user in a subject
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @returns Number of questions attempted
 */
export async function getUserAttemptedCount(
  userId: string,
  subjectId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_attempted_questions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('subject_id', subjectId);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return 0;
      }
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting attempted count:', error);
    return 0;
  }
}

/**
 * Get total question count for a subject (published questions only)
 * @param subjectId - The subject ID
 * @returns Total number of published questions
 */
export async function getSubjectQuestionCount(
  subjectId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId)
      .eq('status', 'published');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting subject question count:', error);
    return 0;
  }
}

/**
 * Get remaining unattempted question count for a user in a subject
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @returns Number of questions remaining
 */
export async function getUserRemainingQuestions(
  userId: string,
  subjectId: string
): Promise<number> {
  const [total, attempted] = await Promise.all([
    getSubjectQuestionCount(subjectId),
    getUserAttemptedCount(userId, subjectId),
  ]);

  return Math.max(0, total - attempted);
}

/**
 * Check if user's question pool is exhausted for a subject
 * @param userId - The user ID
 * @param subjectId - The subject ID
 * @returns True if all questions have been attempted
 */
export async function isUserPoolExhausted(
  userId: string,
  subjectId: string
): Promise<boolean> {
  const remaining = await getUserRemainingQuestions(userId, subjectId);
  return remaining === 0;
}

// ============================================
// SMART QUESTION SELECTION ORCHESTRATOR
// Main function for selecting questions with non-repetition
// ============================================

/**
 * Result of question selection with metadata
 */
export interface QuestionSelectionResult {
  questions: Question[];
  poolReset: boolean;       // True if pool was exhausted and reset
  remainingInPool: number;  // Questions remaining after this selection
  totalInPool: number;      // Total questions in the pool
  attemptedBefore: number;  // Questions attempted before this selection
}

/**
 * Smart question selector that prevents repetition
 * 
 * This is the main orchestrator function that:
 * 1. Gets previously attempted question IDs
 * 2. Checks if pool reset is needed (all questions exhausted)
 * 3. Selects unattempted questions with balanced distribution
 * 4. Records newly selected questions as attempted
 * 
 * @param userId - User ID (null for guests)
 * @param subjectId - Subject ID for tracking
 * @param topicIds - Topics to select questions from
 * @param count - Number of questions to select
 * @param distribution - Optional specific distribution by topic
 * @returns Questions with selection metadata
 */
export async function selectQuestionsForSession(
  userId: string | null,
  subjectId: string,
  topicIds: string[],
  count: number,
  distribution?: Record<string, number>
): Promise<QuestionSelectionResult> {
  // Step 1: Get total questions available in pool
  const totalInPool = await getSubjectQuestionCount(subjectId);
  
  if (totalInPool === 0) {
    console.warn(`[selectQuestionsForSession] No questions available for subject ${subjectId}`);
    return {
      questions: [],
      poolReset: false,
      remainingInPool: 0,
      totalInPool: 0,
      attemptedBefore: 0,
    };
  }

  // Step 2: Get attempted question IDs
  let attemptedQuestionIds: string[] = [];
  let poolReset = false;

  if (userId) {
    // Authenticated user - fetch from database
    attemptedQuestionIds = await getUserAttemptedQuestions(userId, subjectId);
  } else {
    // Guest user - fetch from localStorage
    attemptedQuestionIds = getGuestAttemptedQuestions(subjectId);
  }

  const attemptedBefore = attemptedQuestionIds.length;
  const remainingBefore = totalInPool - attemptedBefore;

  console.log(`[selectQuestionsForSession] User has attempted ${attemptedBefore}/${totalInPool} questions. Remaining: ${remainingBefore}. Requesting: ${count}`);

  // Step 3: Check if pool reset is needed
  // Reset if: no questions remaining OR remaining < requested count
  if (remainingBefore === 0 || (remainingBefore < count && remainingBefore < totalInPool * 0.1)) {
    console.log(`[selectQuestionsForSession] Pool exhausted or nearly exhausted. Resetting...`);
    
    if (userId) {
      await resetUserAttemptedQuestions(userId, subjectId);
    } else {
      resetGuestAttemptedQuestions(subjectId);
    }
    
    attemptedQuestionIds = [];
    poolReset = true;
  }

  // Step 4: Select questions excluding attempted ones
  let questions: Question[] = [];
  
  if (distribution && Object.keys(distribution).length > 0) {
    // Use distribution-based selection
    questions = await getQuestionsWithDistribution(distribution, attemptedQuestionIds);
  } else if (topicIds.length > 0) {
    // Use topic-based selection
    questions = await getRandomQuestionsFromTopics(topicIds, count, attemptedQuestionIds);
  } else {
    console.warn(`[selectQuestionsForSession] No topics specified for selection`);
  }

  // Ensure we return exactly the requested count (slice if needed)
  const finalQuestions = questions.slice(0, count);
  
  if (finalQuestions.length !== count && questions.length > count) {
    console.warn(`[selectQuestionsForSession] Returning ${finalQuestions.length} questions (requested ${count}, got ${questions.length}). Sliced to exact count.`);
  }

  // Step 5: Record newly selected questions as attempted (only final count)
  if (finalQuestions.length > 0) {
    const newQuestionIds = finalQuestions.map(q => q.id);
    
    if (userId) {
      // Record for authenticated user (don't await to avoid blocking)
      recordAttemptedQuestions(userId, subjectId, newQuestionIds).catch(error => {
        console.error('Error recording attempted questions:', error);
      });
    } else {
      // Record for guest user (synchronous localStorage)
      recordGuestAttemptedQuestions(subjectId, newQuestionIds);
    }
  }

  // Calculate remaining after selection
  const remainingAfter = poolReset 
    ? totalInPool - finalQuestions.length 
    : remainingBefore - finalQuestions.length;
  
  console.log(`[selectQuestionsForSession] Selected ${finalQuestions.length} questions (requested ${count}). Remaining in pool: ${Math.max(0, remainingAfter)}`);

  return {
    questions: finalQuestions,
    poolReset,
    remainingInPool: Math.max(0, remainingAfter),
    totalInPool,
    attemptedBefore,
  };
}

/**
 * Quick question selection for quick practice mode
 * Simplified version that selects from preferred subjects
 * 
 * @param userId - User ID (null for guests)
 * @param subjectId - Subject to practice
 * @param count - Number of questions
 * @returns Questions with selection metadata
 */
export async function selectQuestionsForQuickPractice(
  userId: string | null,
  subjectId: string,
  count: number
): Promise<QuestionSelectionResult> {
  // Get all topics for the subject
  const topics = await getTopics(subjectId);
  const topicIds = topics.map(t => t.id);
  
  if (topicIds.length === 0) {
    console.warn(`[selectQuestionsForQuickPractice] No topics found for subject ${subjectId}`);
    return {
      questions: [],
      poolReset: false,
      remainingInPool: 0,
      totalInPool: 0,
      attemptedBefore: 0,
    };
  }

  return selectQuestionsForSession(userId, subjectId, topicIds, count);
}
