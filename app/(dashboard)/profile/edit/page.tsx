'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User as UserIcon, Mail, Calendar, GraduationCap } from 'lucide-react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import type { User } from '@/types/database';

export default function EditProfilePage() {
  const { userId, isGuest, user: authUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState<'SS1' | 'SS2' | 'SS3' | 'Graduate' | ''>('');

  useEffect(() => {
    if (isGuest) {
      router.push('/profile');
      return;
    }
    if (userId) {
      loadProfile();
    }
  }, [userId, isGuest, router]);

  async function loadProfile() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      
      const userData = await getUserProfile(userId);
      if (userData) {
        setUser(userData);
        setFullName(userData.full_name || '');
        setEmail(userData.email || authUser?.email || '');
        setGrade(userData.grade || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!userId || !user) return;

    // Validation
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updates: Partial<User> = {
        full_name: fullName.trim(),
        grade: grade || undefined,
      };

      await updateUserProfile(userId, updates);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Edit Profile</h1>
              <p className="text-sm text-slate-400">Update your personal information</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400"
          >
            Profile updated successfully! Redirecting...
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Profile Form */}
        <MagicCard className="p-6 space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <UserIcon className="w-4 h-4 text-cyan-400" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Mail className="w-4 h-4 text-cyan-400" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500">
              Email cannot be changed. Contact support if you need to update your email.
            </p>
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              Grade Level
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as typeof grade)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            >
              <option value="">Select grade level</option>
              <option value="SS1">SS1</option>
              <option value="SS2">SS2</option>
              <option value="SS3">SS3</option>
              <option value="Graduate">Graduate</option>
            </select>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <MagicButton
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={saving || !fullName.trim()}
              leftIcon={<Save className="w-5 h-5" />}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </MagicButton>
          </div>
        </MagicCard>
      </div>

      <BottomNav />
    </div>
  );
}

