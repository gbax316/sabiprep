'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  BookOpen,
  TrendingUp,
  User,
  Trophy,
  Settings,
  HelpCircle,
  LogOut,
  Brain,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  Star,
  Bell,
  Shield,
  Info,
  Timer,
  BookOpenCheck,
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

// Main navigation sections with all pages
const navigationSections: NavSection[] = [
  {
    title: 'Learning',
    items: [
      { href: '/home', label: 'Dashboard', icon: Home, description: 'Your learning hub' },
      { href: '/subjects', label: 'All Subjects', icon: BookOpen, description: 'Browse & select subjects' },
      {
        href: '/quick-practice',
        label: 'Quick Practice',
        icon: Brain,
        description: 'Random questions, instant start',
        badge: 'Popular',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      },
      {
        href: '/practice',
        label: 'Practice Mode',
        icon: BookOpenCheck,
        description: 'Learn at your pace with hints'
      },
      {
        href: '/test',
        label: 'Test Mode',
        icon: FileText,
        description: 'Simulate real exam conditions'
      },
      {
        href: '/timed',
        label: 'Timed Mode',
        icon: Timer,
        description: 'Race against the clock'
      },
    ],
  },
  {
    title: 'Progress',
    items: [
      { href: '/analytics', label: 'Analytics', icon: TrendingUp, description: 'Track your performance' },
      {
        href: '/daily-challenge',
        label: 'Daily Challenge',
        icon: Sparkles,
        description: 'Earn bonus XP today',
        badge: 'New',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      },
      { href: '/achievements', label: 'Achievements', icon: Trophy, description: 'Badges & milestones' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/profile', label: 'Profile', icon: User, description: 'Manage your account' },
      { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences & notifications' },
      { href: '/notifications', label: 'Notifications', icon: Bell, description: 'Alerts & updates' },
      { href: '/help', label: 'Help Center', icon: HelpCircle, description: 'FAQs & tutorials' },
    ],
  },
];

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => {
    if (pathname) {
      onClose();
    }
  }, [pathname, onClose]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50',
              'flex flex-col',
              'bg-gradient-to-b from-slate-900 to-black',
              'border-l border-white/10',
              'shadow-2xl'
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white">SabiPrep</h2>
                  <p className="text-xs text-slate-400">Master Your Exams</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            {/* User info card */}
            {user && (
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/50">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <span className="text-white text-[8px]">✓</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'}
                    </p>
                    <p className="text-sm text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full font-medium">
                        Free Plan
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable navigation */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {/* Main navigation sections */}
              {navigationSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {/* Section header */}
                  <p className="px-6 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {section.title}
                  </p>

                  {/* Section items */}
                  <ul className="space-y-1 px-3">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <motion.li
                          key={item.href}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                        >
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group',
                              active
                                ? 'bg-white/5 text-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                              active
                                ? 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/30'
                                : 'bg-white/5 group-hover:bg-white/10'
                            )}>
                              <Icon className={cn(
                                'w-5 h-5',
                                active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{item.label}</p>
                                {item.badge && (
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                                    item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-slate-500 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className={cn(
                              'w-4 h-4 flex-shrink-0 transition-all',
                              active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'
                            )} />
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Footer with sign out */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-red-500/10 border border-red-500/30 text-red-400
                           hover:bg-red-500/20 hover:border-red-500/50
                           transition-all font-medium
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                SabiPrep v1.0 • Made for Nigerian Students 🇳🇬
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default NavigationDrawer;
