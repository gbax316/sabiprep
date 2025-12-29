'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: SupabaseUser | null;
  userId: string | null;
  isGuest: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  enableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for existing guest session
    if (typeof window !== 'undefined') {
      const guestSessionStr = sessionStorage.getItem('sabiprep_guest_session');
      if (guestSessionStr) {
        try {
          const guestSession = JSON.parse(guestSessionStr);
          setIsGuest(true);
          setGuestId(guestSession.guestId);
        } catch (e) {
          // Invalid guest session, clear it
          sessionStorage.removeItem('sabiprep_guest_session');
        }
      }
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User is authenticated, clear guest mode
        setIsGuest(false);
        setGuestId(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sabiprep_guest_session');
        }
      }
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // User authenticated, clear guest mode
        setIsGuest(false);
        setGuestId(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sabiprep_guest_session');
        }
      }
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Clear guest mode on sign in
    if (isGuest) {
      setIsGuest(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sabiprep_guest_session');
        localStorage.removeItem('sabiprep_guest_trial');
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    router.push('/home');
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Clear guest data on signup
    if (isGuest) {
      setIsGuest(false);
      setGuestId(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('sabiprep_guest_session');
        localStorage.removeItem('sabiprep_guest_trial');
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    
    // Handle returnUrl if present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      router.push(returnUrl || '/home');
    } else {
      router.push('/home');
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Clear guest mode on sign out
    setIsGuest(false);
    setGuestId(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sabiprep_guest_session');
    }
    router.push('/login');
  };

  const enableGuestMode = () => {
    if (typeof window === 'undefined') return;
    
    // Generate guest ID (UUID-like)
    const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store guest session
    const guestSession = {
      guestId: newGuestId,
      sessionStart: Date.now(),
      questionCount: 0,
    };
    sessionStorage.setItem('sabiprep_guest_session', JSON.stringify(guestSession));
    
    setIsGuest(true);
    setGuestId(newGuestId);
  };

  const value = {
    user,
    userId: isGuest ? guestId : (user?.id ?? null),
    isGuest,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    enableGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
