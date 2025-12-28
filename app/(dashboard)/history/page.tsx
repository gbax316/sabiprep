'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { useAuth } from '@/lib/auth-context';
import { getUserSessions, getSubjects } from '@/lib/api';
import type { LearningSession, Subject } from '@/types/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Timer,
  FileText,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  Medal,
  X,
} from 'lucide-react';

type ModeFilter = 'all' | 'practice' | 'test' | 'timed';
type PeriodGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

interface GroupedSessions {
  period: PeriodGroup;
  sessions: LearningSession[];
}

export default function HistoryPage() {
  const { userId, isGuest, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!userId && !isGuest) {
        router.push('/login');
      } else if (userId || isGuest) {
        loadHistory();
      }
    }
  }, [userId, isGuest, authLoading, router]);

  async function loadHistory() {
    try {
      setLoading(true);
      
      if (userId) {
        // Load all completed sessions (large limit to get full history)
        const [sessionsData, subjectsData] = await Promise.all([
          getUserSessions(userId, 500),
          getSubjects(),
        ]);

        // Filter to only completed sessions and sort by completed_at descending
        const completedSessions = sessionsData
          .filter(s => s.status === 'completed' && s.completed_at)
          .sort((a, b) => {
            const dateA = new Date(a.completed_at || 0).getTime();
            const dateB = new Date(b.completed_at || 0).getTime();
            return dateB - dateA;
          });

        setSessions(completedSessions);
        setSubjects(subjectsData);
      } else {
        // Guest mode - no history available
        setSessions([]);
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter and group sessions
  const filteredAndGroupedSessions = useMemo(() => {
    let filtered = [...sessions];

    // Apply mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(s => s.mode === modeFilter);
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.subject_id === subjectFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const subject = subjects.find(sub => sub.id === s.subject_id);
        return subject?.name.toLowerCase().includes(query);
      });
    }

    // Group by date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: GroupedSessions[] = [
      { period: 'Today', sessions: [] },
      { period: 'Yesterday', sessions: [] },
      { period: 'This Week', sessions: [] },
      { period: 'Older', sessions: [] },
    ];

    filtered.forEach(session => {
      if (!session.completed_at) return;
      
      const completedDate = new Date(session.completed_at);
      completedDate.setHours(0, 0, 0, 0);

      if (completedDate.getTime() === today.getTime()) {
        groups[0].sessions.push(session);
      } else if (completedDate.getTime() === yesterday.getTime()) {
        groups[1].sessions.push(session);
      } else if (completedDate >= weekAgo) {
        groups[2].sessions.push(session);
      } else {
        groups[3].sessions.push(session);
      }
    });

    // Remove empty groups
    return groups.filter(g => g.sessions.length > 0);
  }, [sessions, modeFilter, subjectFilter, searchQuery, subjects]);

  const getDateLabel = (session: LearningSession): string => {
    if (!session.completed_at) return 'Recently';
    
    const date = new Date(session.completed_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <Header title="Session History" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading history...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-slate-950 pb-24">
        <Header title="Session History" showBack />
        <div className="container-app py-8">
          <MagicCard className="p-8 text-center">
            <p className="text-slate-400 mb-4">History is only available for registered users.</p>
            <Link href="/signup">
              <MagicButton variant="primary">Sign Up to View History</MagicButton>
            </Link>
          </MagicCard>
        </div>
        <BottomNav />
      </div>
    );
  }

  const modeColors = {
    practice: 'from-cyan-500 to-blue-500',
    test: 'from-amber-500 to-yellow-500',
    timed: 'from-rose-500 to-pink-500',
  };

  const modeBorderColors = {
    practice: 'border-cyan-500/40 hover:border-cyan-400/60',
    test: 'border-amber-500/40 hover:border-amber-400/60',
    timed: 'border-rose-500/40 hover:border-rose-400/60',
  };

  const modeBgColors = {
    practice: 'from-cyan-500/10 to-blue-500/10',
    test: 'from-amber-500/10 to-yellow-500/10',
    timed: 'from-rose-500/10 to-pink-500/10',
  };

  const modeIcons = {
    practice: BookOpen,
    test: FileText,
    timed: Timer,
  };

  const modeLabels = {
    practice: 'Practice',
    test: 'Test',
    timed: 'Timed',
  };

  const totalSessions = filteredAndGroupedSessions.reduce((sum, group) => sum + group.sessions.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header title="Session History" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Search and Filter Bar */}
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-2 border-slate-700 rounded-xl text-slate-300 hover:border-cyan-500/50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {(modeFilter !== 'all' || subjectFilter !== 'all') && (
                <MagicBadge variant="primary" size="sm" className="ml-1">
                  Active
                </MagicBadge>
              )}
            </button>

            {totalSessions > 0 && (
              <p className="text-sm text-slate-400">
                {totalSessions} session{totalSessions !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <MagicCard className="p-4 space-y-4">
                  {/* Mode Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mode</label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'practice', 'test', 'timed'] as ModeFilter[]).map((mode) => {
                        const ModeIcon = mode === 'all' ? null : modeIcons[mode];
                        return (
                          <button
                            key={mode}
                            onClick={() => setModeFilter(mode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                              modeFilter === mode
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            {ModeIcon && <ModeIcon className="w-4 h-4" />}
                            <span className="text-sm font-medium capitalize">{mode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subject Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSubjectFilter('all')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          subjectFilter === 'all'
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-sm font-medium">All Subjects</span>
                      </button>
                      {subjects.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => setSubjectFilter(subject.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                            subjectFilter === subject.id
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-sm">{subject.icon || '📚'}</span>
                          <span className="text-sm font-medium">{subject.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </MagicCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sessions List */}
        {filteredAndGroupedSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <MagicCard className="p-8">
              <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No sessions found</h3>
              <p className="text-slate-400 mb-6">
                {sessions.length === 0
                  ? "You haven't completed any sessions yet. Start practicing to see your history here!"
                  : 'Try adjusting your filters or search query.'}
              </p>
              {sessions.length === 0 && (
                <Link href="/learn">
                  <MagicButton variant="primary">Start Learning</MagicButton>
                </Link>
              )}
            </MagicCard>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {filteredAndGroupedSessions.map((group, groupIndex) => (
              <motion.div
                key={group.period}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  {group.period}
                </h2>
                <div className="space-y-2.5">
                  {group.sessions.map((session, index) => {
                    const subject = subjects.find(s => s.id === session.subject_id);
                    if (!subject) return null;

                    const ModeIcon = modeIcons[session.mode] || BookOpen;
                    const score = session.score_percentage !== undefined && session.score_percentage !== null
                      ? session.score_percentage
                      : (session.questions_answered > 0 && session.correct_answers !== undefined
                        ? Math.round((session.correct_answers / session.questions_answered) * 100)
                        : 0);

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.1 + index * 0.05 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Link href={`/results/${session.id}`}>
                          <MagicCard
                            hover
                            className={`p-4 bg-gradient-to-r ${modeBgColors[session.mode]} border-2 ${modeBorderColors[session.mode]} rounded-xl transition-all shadow-lg hover:shadow-xl`}
                          >
                            <div className="flex items-center gap-4">
                              <motion.div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${modeColors[session.mode]} flex items-center justify-center flex-shrink-0 shadow-lg`}
                                whileHover={{ rotate: [0, -5, 5, 0] }}
                                transition={{ duration: 0.5 }}
                              >
                                <ModeIcon className="w-6 h-6 text-white" />
                              </motion.div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50">
                                    {modeLabels[session.mode]}
                                  </span>
                                  <span className="text-xs text-slate-500">{getDateLabel(session)}</span>
                                </div>
                                <h3 className="font-bold text-base text-white truncate mb-1">
                                  {subject.name}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    <span>{session.correct_answers}/{session.questions_answered}</span>
                                  </div>
                                  <span className="text-slate-600">•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-400" />
                                    <span>{formatTime(session.time_spent_seconds || 0)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <MagicBadge
                                  variant={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'}
                                  size="sm"
                                  className={`text-sm font-bold ${
                                    score >= 70
                                      ? 'bg-emerald-500/30 border-emerald-400/50'
                                      : score >= 50
                                      ? 'bg-amber-500/30 border-amber-400/50'
                                      : 'bg-red-500/30 border-red-400/50'
                                  }`}
                                >
                                  {score >= 70 && <Medal className="w-3 h-3 mr-1" />}
                                  {score}%
                                </MagicBadge>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              </div>
                            </div>
                          </MagicCard>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

