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
   * Initialize auth state
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const adminData = await fetchAdminUser(session.user.id);
          setAdminUser(adminData);
        }
      } catch (err) {
        console.error('Error initializing admin auth:', err);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const adminData = await fetchAdminUser(session.user.id);
          setAdminUser(adminData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAdminUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
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
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAdminUser(null);
      router.push('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
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
