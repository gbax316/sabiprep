// Shared navigation configuration for BottomNav and NavigationDrawer
import {
  Home,
  BookOpen,
  Brain,
  TrendingUp,
  User,
  BookOpenCheck,
  FileText,
  Timer,
  Sparkles,
  Trophy,
  Settings,
  Bell,
  HelpCircle,
} from 'lucide-react';
import type { React.ComponentType } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Main navigation sections (used in NavigationDrawer)
export const navigationSections: NavSection[] = [
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

// Bottom navigation items (extracted from main sections, matching current bottom nav)
// These are the primary quick-access items
export const bottomNavItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/subjects', label: 'Explore', icon: BookOpen },
  { href: '/quick-practice', label: 'Learn', icon: Brain },
  { href: '/analytics', label: 'Progress', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User },
];
