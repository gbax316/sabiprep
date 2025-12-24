'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserRole } from '@/types/database';
import type { AdminSessionUser } from '@/types/admin';
import { useRouter } from 'next/navigation';

/**
 * Admin auth context type
 */
interface AdminAuthContextType {
  // User data
  user: SupabaseUser | null;
  adminUser: AdminSessionUser | null;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Role checks
  isAdmin: boolean;
  isTutor: boolean;
  canAccessAdmin: boolean;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  // Data refresh
  refreshAdminUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

/**
 * Admin Auth Provider Component
 * Provides admin-specific authentication context for the admin portal
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  /**
   * Fetch admin user data from the database
   */
  const fetchAdminUser = useCallback(async (userId: string): Promise<AdminSessionUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching admin user:', error);
        return null;
      }

      // Check if user has admin or tutor role
      if (!['admin', 'tutor'].includes(data.role)) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as UserRole,
      };
    } catch (err) {
      console.error('Error in fetchAdminUser:', err);
      return null;
    }
  }, []);

  /**
   * Refresh admin user data
   */
  const refreshAdminUser = useCallback(async () => {
    if (user?.id) {
      const adminData = await fetchAdminUser(user.id);
      setAdminUser(adminData);
    }
  }, [user?.id, fetchAdminUser]);

  /**
   * Initialize auth state with timeout
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Add timeout to prevent infinite loading (max 5 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), 5000);
        });

        const authPromise = (async () => {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (mounted) {
            if (session?.user) {
              setUser(session.user);
              // Fetch admin user with timeout
              const adminDataPromise = fetchAdminUser(session.user.id);
              const adminTimeoutPromise = new Promise<AdminSessionUser | null>((_, reject) => {
                setTimeout(() => reject(new Error('Admin user fetch timeout')), 3000);
              });
              
              try {
                const adminData = await Promise.race([adminDataPromise, adminTimeoutPromise]);
                setAdminUser(adminData);
              } catch (adminErr) {
                console.warn('Error or timeout fetching admin user:', adminErr);
                setAdminUser(null);
              }
            } else {
              // No session, ensure state is cleared
              setUser(null);
              setAdminUser(null);
            }
            setIsLoading(false);
            setIsInitialized(true);
          }
        })();

        await Promise.race([authPromise, timeoutPromise]);
      } catch (err) {
        console.error('Error initializing admin auth:', err);
        if (mounted) {
          // Even on timeout/error, set initialized to false to allow login page to show
          setUser(null);
          setAdminUser(null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user);
            // Fetch admin user with timeout
            const adminDataPromise = fetchAdminUser(session.user.id);
            const adminTimeoutPromise = new Promise<AdminSessionUser | null>((_, reject) => {
              setTimeout(() => reject(new Error('Admin user fetch timeout')), 3000);
            });
            
            try {
              const adminData = await Promise.race([adminDataPromise, adminTimeoutPromise]);
              if (mounted) {
                setAdminUser(adminData);
              }
            } catch (adminErr) {
              console.warn('Error or timeout fetching admin user:', adminErr);
              if (mounted) {
                setAdminUser(null);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            if (mounted) {
              setUser(null);
              setAdminUser(null);
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // Token refreshed - don't change loading state, just update user if needed
            if (mounted && session?.user) {
              setUser(session.user);
            }
            // Don't change isLoading or isInitialized on token refresh
            return;
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
        } finally {
          // Only update loading states if mounted and for sign in/out events
          if (mounted && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
            setIsLoading(false);
            // Only set initialized if not already set (to prevent race conditions)
            setIsInitialized(prev => prev || true);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAdminUser]);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setIsLoading(false);
        return { success: false, error: authError.message };
      }

      if (!data.user) {
        setIsLoading(false);
        return { success: false, error: 'Login failed. Please try again.' };
      }

      // Fetch user data to check role
      const adminData = await fetchAdminUser(data.user.id);
      
      if (!adminData) {
        // User exists but is not admin/tutor - sign them out
        await supabase.auth.signOut();
        setIsLoading(false);
        return { 
          success: false, 
          error: 'Access denied. You do not have admin privileges.' 
        };
      }

      setUser(data.user);
      setAdminUser(adminData);
      setIsLoading(false);
      
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      console.error('Sign in error:', err);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      // Clear state first
      setUser(null);
      setAdminUser(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Navigate to login (use replace to prevent back button issues)
      router.replace('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
      // Still navigate even if sign out fails
      router.replace('/admin/login');
    }
  };

  // Computed role checks
  const isAdmin = adminUser?.role === 'admin';
  const isTutor = adminUser?.role === 'tutor';
  const canAccessAdmin = isAdmin || isTutor;

  const value: AdminAuthContextType = {
    user,
    adminUser,
    isLoading,
    isInitialized,
    isAdmin,
    isTutor,
    canAccessAdmin,
    signIn,
    signOut,
    refreshAdminUser,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook to use admin auth context
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  
  return context;
}

/**
 * Higher-order component to require admin access
 */
export function withAdminAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: 'admin' | 'tutor'
) {
  return function AdminProtectedComponent(props: P) {
    const { canAccessAdmin, isAdmin, isInitialized, isLoading } = useAdminAuth();
    const router = useRouter();

    useEffect(() => {
      if (isInitialized && !isLoading) {
        if (!canAccessAdmin) {
          router.replace('/admin/login');
        } else if (requiredRole === 'admin' && !isAdmin) {
          router.replace('/admin/dashboard');
        }
      }
    }, [isInitialized, isLoading, canAccessAdmin, isAdmin, router]);

    if (!isInitialized || isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    if (!canAccessAdmin) {
      return null;
    }

    if (requiredRole === 'admin' && !isAdmin) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
