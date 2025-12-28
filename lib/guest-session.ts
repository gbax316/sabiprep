/**
 * Guest Session Manager
 * 
 * Handles guest session tracking and question limit enforcement.
 * Uses sessionStorage for session data and localStorage for system-wide tracking.
 */

const GUEST_SESSION_KEY = 'sabiprep_guest_session';
const GUEST_TRIAL_KEY = 'sabiprep_guest_trial';
const QUESTION_LIMIT = 10;

export interface GuestSession {
  guestId: string;
  sessionStart: number;
  questionCount: number;
}

export interface GuestTrial {
  totalQuestionsAnswered: number;
  firstTrialDate: number;
}

/**
 * Get current guest session from sessionStorage
 */
export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionStr = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!sessionStr) return null;
    
    return JSON.parse(sessionStr) as GuestSession;
  } catch (e) {
    console.error('Error reading guest session:', e);
    return null;
  }
}

/**
 * Create or update guest session
 */
export function createGuestSession(guestId: string): GuestSession {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create guest session on server');
  }
  
  const session: GuestSession = {
    guestId,
    sessionStart: Date.now(),
    questionCount: 0,
  };
  
  sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Get system-wide trial data from localStorage
 */
export function getGuestTrial(): GuestTrial {
  if (typeof window === 'undefined') {
    return { totalQuestionsAnswered: 0, firstTrialDate: Date.now() };
  }
  
  try {
    const trialStr = localStorage.getItem(GUEST_TRIAL_KEY);
    if (!trialStr) {
      // Initialize trial data
      const trial: GuestTrial = {
        totalQuestionsAnswered: 0,
        firstTrialDate: Date.now(),
      };
      localStorage.setItem(GUEST_TRIAL_KEY, JSON.stringify(trial));
      return trial;
    }
    
    return JSON.parse(trialStr) as GuestTrial;
  } catch (e) {
    console.error('Error reading guest trial:', e);
    return { totalQuestionsAnswered: 0, firstTrialDate: Date.now() };
  }
}

/**
 * Get current session question count
 */
export function getGuestQuestionCount(): number {
  const session = getGuestSession();
  return session?.questionCount ?? 0;
}

/**
 * Get system-wide question count
 */
export function getSystemWideQuestionCount(): number {
  const trial = getGuestTrial();
  return trial.totalQuestionsAnswered;
}

/**
 * Check if question limit has been reached
 */
export function hasReachedQuestionLimit(): boolean {
  const systemCount = getSystemWideQuestionCount();
  return systemCount >= QUESTION_LIMIT;
}

/**
 * Increment question count (both per-session and system-wide)
 * Returns the new system-wide count
 */
export function incrementGuestQuestionCount(): number {
  if (typeof window === 'undefined') {
    throw new Error('Cannot increment question count on server');
  }
  
  // Update session count
  const session = getGuestSession();
  if (session) {
    session.questionCount += 1;
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
  }
  
  // Update system-wide count
  const trial = getGuestTrial();
  trial.totalQuestionsAnswered += 1;
  
  // Set first trial date if not set
  if (!trial.firstTrialDate) {
    trial.firstTrialDate = Date.now();
  }
  
  localStorage.setItem(GUEST_TRIAL_KEY, JSON.stringify(trial));
  
  return trial.totalQuestionsAnswered;
}

/**
 * Reset guest session (clear sessionStorage)
 */
export function resetGuestSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(GUEST_SESSION_KEY);
}

/**
 * Reset guest trial (clear localStorage)
 */
export function resetGuestTrial(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_TRIAL_KEY);
}

/**
 * Reset all guest data (both session and trial)
 */
export function resetAllGuestData(): void {
  resetGuestSession();
  resetGuestTrial();
}

/**
 * Get question limit constant
 */
export function getQuestionLimit(): number {
  return QUESTION_LIMIT;
}
