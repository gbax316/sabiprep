/**
 * Guest Question Tracking Utility
 * 
 * Tracks attempted questions for guest users using localStorage.
 * Questions are tracked per subject to prevent repetition until
 * all questions in the subject's pool have been attempted.
 */

const STORAGE_PREFIX = 'sabiprep_attempted_';

/**
 * Get the localStorage key for a subject's attempted questions
 */
function getStorageKey(subjectId: string): string {
  return `${STORAGE_PREFIX}${subjectId}`;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get attempted question IDs for a guest user in a specific subject
 * @param subjectId - The subject ID to get attempted questions for
 * @returns Array of question IDs that have been attempted
 */
export function getGuestAttemptedQuestions(subjectId: string): string[] {
  if (!isLocalStorageAvailable()) return [];
  
  try {
    const stored = localStorage.getItem(getStorageKey(subjectId));
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    // Filter out any invalid entries
    return parsed.filter((id: unknown) => typeof id === 'string' && id.length > 0);
  } catch (error) {
    console.warn('Error reading guest attempted questions:', error);
    return [];
  }
}

/**
 * Record attempted questions for a guest user
 * @param subjectId - The subject ID
 * @param questionIds - Array of question IDs to mark as attempted
 */
export function recordGuestAttemptedQuestions(
  subjectId: string,
  questionIds: string[]
): void {
  if (!isLocalStorageAvailable()) return;
  if (!questionIds || questionIds.length === 0) return;
  
  try {
    const existing = getGuestAttemptedQuestions(subjectId);
    const existingSet = new Set(existing);
    
    // Add new question IDs
    questionIds.forEach(id => {
      if (id && typeof id === 'string') {
        existingSet.add(id);
      }
    });
    
    // Save back to localStorage
    localStorage.setItem(
      getStorageKey(subjectId),
      JSON.stringify(Array.from(existingSet))
    );
  } catch (error) {
    console.warn('Error recording guest attempted questions:', error);
  }
}

/**
 * Reset guest tracking for a specific subject
 * Called when all questions in the pool have been exhausted
 * @param subjectId - The subject ID to reset tracking for
 */
export function resetGuestAttemptedQuestions(subjectId: string): void {
  if (!isLocalStorageAvailable()) return;
  
  try {
    localStorage.removeItem(getStorageKey(subjectId));
  } catch (error) {
    console.warn('Error resetting guest attempted questions:', error);
  }
}

/**
 * Check if the guest's question pool is exhausted for a subject
 * @param subjectId - The subject ID to check
 * @param totalQuestions - Total number of questions available in the subject
 * @returns True if all questions have been attempted
 */
export function isGuestPoolExhausted(
  subjectId: string,
  totalQuestions: number
): boolean {
  if (totalQuestions <= 0) return true;
  
  const attempted = getGuestAttemptedQuestions(subjectId);
  return attempted.length >= totalQuestions;
}

/**
 * Get the count of attempted questions for a guest in a subject
 * @param subjectId - The subject ID
 * @returns Number of questions attempted
 */
export function getGuestAttemptedCount(subjectId: string): number {
  return getGuestAttemptedQuestions(subjectId).length;
}

/**
 * Get remaining unattempted question count for a guest
 * @param subjectId - The subject ID
 * @param totalQuestions - Total questions available in the subject
 * @returns Number of questions remaining
 */
export function getGuestRemainingCount(
  subjectId: string,
  totalQuestions: number
): number {
  const attempted = getGuestAttemptedQuestions(subjectId).length;
  return Math.max(0, totalQuestions - attempted);
}

/**
 * Clear all guest question tracking data
 * Useful for testing or when user signs up
 */
export function clearAllGuestTracking(): void {
  if (!isLocalStorageAvailable()) return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error clearing guest tracking:', error);
  }
}

/**
 * Get stats about guest question tracking
 * @returns Object with tracking statistics
 */
export function getGuestTrackingStats(): {
  subjectsWithTracking: number;
  totalQuestionsTracked: number;
  subjects: { subjectId: string; count: number }[];
} {
  if (!isLocalStorageAvailable()) {
    return { subjectsWithTracking: 0, totalQuestionsTracked: 0, subjects: [] };
  }
  
  try {
    const subjects: { subjectId: string; count: number }[] = [];
    let totalQuestionsTracked = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const subjectId = key.replace(STORAGE_PREFIX, '');
        const count = getGuestAttemptedQuestions(subjectId).length;
        subjects.push({ subjectId, count });
        totalQuestionsTracked += count;
      }
    }
    
    return {
      subjectsWithTracking: subjects.length,
      totalQuestionsTracked,
      subjects,
    };
  } catch (error) {
    console.warn('Error getting guest tracking stats:', error);
    return { subjectsWithTracking: 0, totalQuestionsTracked: 0, subjects: [] };
  }
}

