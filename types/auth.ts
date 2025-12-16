// SABIPREP - Authentication Types

/**
 * Login credentials for email/password authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup data for new user registration
 */
export interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  grade?: Grade;
  acceptedTerms: boolean;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authenticated user from Supabase
 */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastSignInAt: string;
}

/**
 * Authentication response from Supabase
 */
export interface AuthResponse {
  user: AuthUser | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Session data
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

/**
 * Authentication error
 */
export interface AuthError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password update data
 */
export interface PasswordUpdateData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Student grade levels
 */
export type Grade = 'SS1' | 'SS2' | 'SS3' | 'Graduate';

/**
 * OAuth providers
 */
export type OAuthProvider = 'google' | 'facebook' | 'apple';

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  illustration?: string;
}

/**
 * Onboarding state
 */
export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
}
