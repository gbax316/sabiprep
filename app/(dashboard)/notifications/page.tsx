'use client';

import React, { useState } from 'react';
import { MagicCard } from '@/components/magic/MagicCard';
import { MagicButton } from '@/components/magic/MagicButton';
import { MagicBadge } from '@/components/magic/MagicBadge';
import { BottomNav } from '@/components/common/BottomNav';
import { Header } from '@/components/navigation/Header';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Trophy,
  Flame,
  Calendar,
  Megaphone,
  Clock,
  CheckCircle,
  Circle,
  RefreshCw,
  Sparkles,
  BellOff,
} from 'lucide-react';

// Types for notifications
interface Notification {
  id: string;
  type: 'achievement' | 'challenge' | 'streak' | 'reminder' | 'announcement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Achievement Unlocked! 🏆',
    message: 'You earned the "Week Warrior" badge for maintaining a 7-day streak!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    actionUrl: '/achievements',
  },
  {
    id: '2',
    type: 'challenge',
    title: 'Daily Challenge Available',
    message: 'New Mathematics challenge is ready! Complete it to earn bonus XP.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
    actionUrl: '/daily-challenge',
  },
  {
    id: '3',
    type: 'streak',
    title: 'Streak Reminder 🔥',
    message: "Don't forget to practice today to keep your 5-day streak alive!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Study Reminder',
    message: "It's your scheduled study time for English. Ready to learn?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    actionUrl: '/subjects',
  },
  {
    id: '5',
    type: 'announcement',
    title: 'New Feature: Timed Mode',
    message: 'Test your speed with our new timed practice mode! Race against the clock.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    actionUrl: '/timed',
  },
  {
    id: '6',
    type: 'achievement',
    title: 'First Steps Complete! ⭐',
    message: 'Congratulations on answering your first question!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    read: true,
    actionUrl: '/achievements',
  },
  {
    id: '7',
    type: 'challenge',
    title: 'Challenge Completed!',
    message: 'Great job! You scored 85% on the Physics daily challenge.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    read: true,
  },
];

// Helper to get notification icon
function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'achievement':
      return <Trophy className="w-5 h-5" />;
    case 'challenge':
      return <Calendar className="w-5 h-5" />;
    case 'streak':
      return <Flame className="w-5 h-5" />;
    case 'reminder':
      return <Clock className="w-5 h-5" />;
    case 'announcement':
      return <Megaphone className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
}

// Helper to get notification colors
function getNotificationColors(type: Notification['type']) {
  switch (type) {
    case 'achievement':
      return {
        bg: 'from-amber-500 to-orange-500',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
      };
    case 'challenge':
      return {
        bg: 'from-purple-500 to-pink-500',
        border: 'border-purple-500/30',
        glow: 'shadow-purple-500/20',
      };
    case 'streak':
      return {
        bg: 'from-orange-500 to-red-500',
        border: 'border-orange-500/30',
        glow: 'shadow-orange-500/20',
      };
    case 'reminder':
      return {
        bg: 'from-cyan-500 to-blue-500',
        border: 'border-cyan-500/30',
        glow: 'shadow-cyan-500/20',
      };
    case 'announcement':
      return {
        bg: 'from-violet-500 to-indigo-500',
        border: 'border-violet-500/30',
        glow: 'shadow-violet-500/20',
      };
    default:
      return {
        bg: 'from-slate-500 to-slate-600',
        border: 'border-slate-500/30',
        glow: 'shadow-slate-500/20',
      };
  }
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper to group notifications by date
function groupNotificationsByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  const groups: { label: string; notifications: Notification[] }[] = [
    { label: 'Today', notifications: [] },
    { label: 'Yesterday', notifications: [] },
    { label: 'This Week', notifications: [] },
    { label: 'Earlier', notifications: [] },
  ];

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.timestamp);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      groups[0].notifications.push(notification);
    } else if (notifDate.getTime() === yesterday.getTime()) {
      groups[1].notifications.push(notification);
    } else if (notifDate >= thisWeekStart) {
      groups[2].notifications.push(notification);
    } else {
      groups[3].notifications.push(notification);
    }
  });

  // Filter out empty groups
  return groups.filter((group) => group.notifications.length > 0);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groupedNotifications = groupNotificationsByDate(notifications);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <Header title="Notifications" showBack />

      <div className="container-app py-6 space-y-6">
        {/* Header Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
              <Bell className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-semibold">
                {unreadCount} unread
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MagicButton
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="!px-3"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </MagicButton>
            {unreadCount > 0 && (
              <MagicButton
                variant="secondary"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle className="w-4 h-4" />
                Mark all read
              </MagicButton>
            )}
          </div>
        </motion.div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <div className="space-y-6">
            {groupedNotifications.map((group, groupIndex) => (
              <div key={group.label}>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {group.label}
                </h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {group.notifications.map((notification, index) => {
                      const colors = getNotificationColors(notification.type);
                      const icon = getNotificationIcon(notification.type);

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <MagicCard
                            hover
                            className={`cursor-pointer transition-all ${
                              !notification.read
                                ? `${colors.border} shadow-lg ${colors.glow}`
                                : 'border-slate-800'
                            }`}
                          >
                            <div
                              className="p-4"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div
                                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center flex-shrink-0`}
                                >
                                  {icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3
                                      className={`font-semibold ${
                                        notification.read
                                          ? 'text-slate-300'
                                          : 'text-white'
                                      }`}
                                    >
                                      {notification.title}
                                    </h3>
                                    {/* Read/Unread indicator */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {!notification.read && (
                                        <Circle className="w-2 h-2 fill-cyan-400 text-cyan-400" />
                                      )}
                                    </div>
                                  </div>
                                  <p
                                    className={`text-sm mt-1 ${
                                      notification.read
                                        ? 'text-slate-500'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-2">
                                    {formatRelativeTime(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </MagicCard>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <MagicCard className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
                <BellOff className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                All Caught Up!
              </h3>
              <p className="text-slate-400 mb-6">
                You have no notifications at the moment.
              </p>
              <MagicButton
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4" />
                Check for updates
              </MagicButton>
            </MagicCard>
          </motion.div>
        )}

        {/* Tips Section */}
        <MagicCard className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-violet-200">
                Stay on top of your learning by enabling push notifications in settings!
              </p>
            </div>
          </div>
        </MagicCard>
      </div>

      <BottomNav />
    </div>
  );
}

