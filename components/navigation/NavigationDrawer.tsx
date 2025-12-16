'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Home,
  BookOpen,
  BarChart3,
  User,
  Trophy,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Clock,
  Target,
  FileText,
  Sparkles,
  Star,
  Bell,
  Shield,
  Info,
  Timer,
  Play,
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
    title: 'Main',
    items: [
      { href: '/home', label: 'Dashboard', icon: Home, description: 'Your learning hub' },
      { href: '/subjects', label: 'All Subjects', icon: BookOpen, description: 'Browse & select subjects' },
      { href: '/analytics', label: 'Progress & Stats', icon: BarChart3, description: 'Track your performance' },
    ],
  },
  {
    title: 'Learning Modes',
    collapsible: true,
    items: [
      { 
        href: '/quick-practice', 
        label: 'Quick Practice', 
        icon: Zap, 
        description: 'Random questions, instant start',
        badge: 'Popular',
        badgeColor: 'bg-amber-100 text-amber-700',
      },
      { 
        href: '/subjects', 
        label: 'Practice Mode', 
        icon: BookOpenCheck, 
        description: 'Learn at your pace with hints' 
      },
      { 
        href: '/subjects', 
        label: 'Test Mode', 
        icon: FileText, 
        description: 'Simulate real exam conditions' 
      },
      { 
        href: '/subjects', 
        label: 'Timed Mode', 
        icon: Timer, 
        description: 'Race against the clock' 
      },
    ],
  },
  {
    title: 'Challenges & Rewards',
    collapsible: true,
    items: [
      { 
        href: '/daily-challenge', 
        label: 'Daily Challenge', 
        icon: Sparkles, 
        description: 'Earn bonus XP today',
        badge: 'New',
        badgeColor: 'bg-emerald-100 text-emerald-700',
      },
      { href: '/achievements', label: 'Achievements', icon: Trophy, description: 'Badges & milestones' },
      { href: '/leaderboard', label: 'Leaderboard', icon: Star, description: 'See top performers' },
    ],
  },
];

const accountItems: NavItem[] = [
  { href: '/profile', label: 'Profile', icon: User, description: 'Manage your account' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences & notifications' },
  { href: '/notifications', label: 'Notifications', icon: Bell, description: 'Alerts & updates' },
];

const supportItems: NavItem[] = [
  { href: '/help', label: 'Help Center', icon: HelpCircle, description: 'FAQs & tutorials' },
  { href: '/about', label: 'About SabiPrep', icon: Info, description: 'Our mission' },
  { href: '/privacy', label: 'Privacy & Security', icon: Shield, description: 'Your data is safe' },
];

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Learning Modes']));

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

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50',
          'flex flex-col',
          'animate-slide-in-right'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-primary-50 to-accent-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20 animate-scale-in">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900">SabiPrep</h2>
              <p className="text-xs text-slate-500">Master Your Exams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-xl transition-all hover:scale-105 active:scale-95"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* User info card */}
        {user && (
          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'}
                </p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">
                    Free Plan
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable navigation */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {/* Main navigation sections */}
          {navigationSections.map((section, sectionIndex) => {
            const isExpanded = !section.collapsible || expandedSections.has(section.title);
            
            return (
              <div key={section.title} className="mb-2">
                {/* Section header */}
                {section.collapsible ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
                  >
                    {section.title}
                    <ChevronDown 
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      )} 
                    />
                  </button>
                ) : (
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                )}

                {/* Section items */}
                <ul 
                  className={cn(
                    'space-y-0.5 px-2 overflow-hidden transition-all duration-300',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <li 
                        key={`${item.href}-${itemIndex}`}
                        className="animate-enter"
                        style={{ animationDelay: `${(sectionIndex * 0.05) + (itemIndex * 0.03)}s` }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group',
                            'hover:translate-x-1',
                            active
                              ? 'bg-primary-50 text-primary-700 shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                            active 
                              ? 'bg-primary-100' 
                              : 'bg-slate-100 group-hover:bg-slate-200'
                          )}>
                            <Icon className={cn(
                              'w-5 h-5',
                              active ? 'text-primary-600' : 'text-slate-500 group-hover:text-slate-700'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{item.label}</p>
                              {item.badge && (
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                  item.badgeColor || 'bg-slate-100 text-slate-600'
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className={cn(
                                'text-xs truncate',
                                active ? 'text-primary-600/70' : 'text-slate-400'
                              )}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={cn(
                            'w-4 h-4 flex-shrink-0 transition-all',
                            'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0',
                            active && 'opacity-100 translate-x-0 text-primary-600'
                          )} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-3 mx-4 border-t border-slate-100" />

          {/* Account section */}
          <div className="mb-2">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Account
            </p>
            <ul className="space-y-0.5 px-2">
              {accountItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li 
                    key={item.href}
                    className="animate-enter"
                    style={{ animationDelay: `${0.2 + (index * 0.03)}s` }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl transition-all group hover:translate-x-1',
                        active
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Support section */}
          <div className="mb-2">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Support
            </p>
            <ul className="space-y-0.5 px-2">
              {supportItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <li 
                    key={item.href}
                    className="animate-enter"
                    style={{ animationDelay: `${0.25 + (index * 0.03)}s` }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group hover:translate-x-1"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Footer with sign out */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl 
                       text-red-600 hover:bg-red-50 active:bg-red-100 transition-all font-medium
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            SabiPrep v1.0 • Made for Nigerian Students 🇳🇬
          </p>
        </div>
      </aside>
    </>
  );
}

export default NavigationDrawer;
