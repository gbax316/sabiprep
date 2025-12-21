'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, BookOpen, Save } from 'lucide-react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/lib/auth-context';
import { getSubjects, getUserSubjectPreferences, setUserSubjectPreferences } from '@/lib/api';
import type { Subject } from '@/types/database';

export default function ProfileSettingsPage() {
  const { userId, isGuest } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) {
      router.push('/profile');
      return;
    }
    if (userId) {
      loadData();
    }
  }, [userId, isGuest, router]);

  async function loadData() {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const [allSubjects, preferences] = await Promise.all([
        getSubjects(),
        getUserSubjectPreferences(userId),
      ]);

      setSubjects(allSubjects);
      setSelectedSubjectIds(new Set(preferences));
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubjectToggle(subjectId: string) {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedSubjectIds(new Set(subjects.map(s => s.id)));
  }

  function handleDeselectAll() {
    setSelectedSubjectIds(new Set());
  }

  async function handleSave() {
    if (!userId) return;

    try {
      setSaving(true);
      setError(null);

      await setUserSubjectPreferences(userId, Array.from(selectedSubjectIds));
      
      // Show success feedback
      alert('Preferences saved successfully!');
      
      // Navigate back to profile
      router.push('/profile');
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
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
            <p className="text-slate-400">Loading preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  const allSelected = subjects.length > 0 && selectedSubjectIds.size === subjects.length;
  const someSelected = selectedSubjectIds.size > 0 && selectedSubjectIds.size < subjects.length;

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
              <h1 className="text-xl font-bold text-white">Subject Preferences</h1>
              <p className="text-sm text-slate-400">Choose the subjects you want to learn</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

        {/* Info Card */}
        <MagicCard className="p-4 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/30">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">How Preferences Work</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Selected subjects will appear in the "Explore Subjects" section on your home page. 
                If you don't select any, all subjects will be shown. You can change these preferences anytime.
              </p>
            </div>
          </div>
        </MagicCard>

        {/* Select All / Deselect All */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MagicBadge variant="info" size="sm">
              {selectedSubjectIds.size} of {subjects.length} selected
            </MagicBadge>
          </div>
          <div className="flex gap-2">
            <MagicButton
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={allSelected}
            >
              Select All
            </MagicButton>
            <MagicButton
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedSubjectIds.size === 0}
            >
              Deselect All
            </MagicButton>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, index) => {
            const isSelected = selectedSubjectIds.has(subject.id);
            
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  onClick={() => handleSubjectToggle(subject.id)}
                  className="cursor-pointer"
                >
                  <MagicCard
                    hover
                    className={`
                      p-4 transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-violet-500/50 shadow-lg shadow-violet-500/20' 
                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }
                    `}
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                        ${isSelected 
                          ? 'bg-gradient-to-br from-violet-500 to-cyan-500' 
                          : 'bg-slate-800'
                        }
                      `}>
                        {subject.icon || '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 line-clamp-2">
                          {subject.name}
                        </h3>
                        {subject.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {subject.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <MagicBadge variant="default" size="sm" className="text-[10px]">
                            {subject.total_questions} questions
                          </MagicBadge>
                        </div>
                      </div>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isSelected 
                        ? 'bg-violet-500 border-violet-500' 
                        : 'border-slate-600'
                      }
                    `}>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </MagicCard>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 z-10">
          <MagicButton
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </MagicButton>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

