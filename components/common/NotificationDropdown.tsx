'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, Sparkles, Flame, Target, Clock, Trophy, AlertCircle } from 'lucide-react';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/lib/api';
import type { Notification, NotificationType } from '@/types/database';
import { cn } from '@/lib/utils';
import { NotificationBadge } from './Badge';
import Link from 'next/link';

interface NotificationDropdownProps {
  userId: string;
  className?: string;
}

const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  achievement_unlocked: Trophy,
  streak_milestone: Flame,
  session_completed: Target,
  goal_achieved: Sparkles,
  daily_reminder: Clock,
  new_content: Sparkles,
  student_progress: Target,
  student_achievement: Trophy,
  new_signup: AlertCircle,
  import_completed: Check,
  system_alert: AlertCircle,
  content_review: AlertCircle,
};

const notificationColors: Record<NotificationType, string> = {
  achievement_unlocked: 'from-yellow-500 to-orange-500',
  streak_milestone: 'from-red-500 to-pink-500',
  session_completed: 'from-blue-500 to-cyan-500',
  goal_achieved: 'from-green-500 to-emerald-500',
  daily_reminder: 'from-purple-500 to-violet-500',
  new_content: 'from-indigo-500 to-blue-500',
  student_progress: 'from-cyan-500 to-blue-500',
  student_achievement: 'from-amber-500 to-yellow-500',
  new_signup: 'from-green-500 to-teal-500',
  import_completed: 'from-blue-500 to-indigo-500',
  system_alert: 'from-red-500 to-orange-500',
  content_review: 'from-orange-500 to-amber-500',
};

export function NotificationDropdown({ userId, className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  async function loadNotifications() {
    if (!userId) return;

    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, 20),
        getUnreadNotificationCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function handleMarkAllAsRead() {
    if (!userId) return;

    try {
      await markAllNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  function getNotificationLink(notification: Notification): string | null {
    if (notification.data) {
      if (notification.data.session_id) {
        return `/results/${notification.data.session_id}`;
      }
      if (notification.data.achievement_id) {
        return '/achievements';
      }
    }
    return null;
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-br from-pink-500 to-red-500 rounded-full ring-2 ring-black shadow-lg shadow-pink-500/50 animate-pulse" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <>
                {/* Unread Notifications */}
                {unreadNotifications.length > 0 && (
                  <div className="p-2">
                    {unreadNotifications.map(notification => {
                      const Icon = notificationIcons[notification.type];
                      const colorClass = notificationColors[notification.type];
                      const link = getNotificationLink(notification);

                      const content = (
                        <div
                          className={cn(
                            'p-3 rounded-xl mb-2 cursor-pointer transition-all',
                            'bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-cyan-500/50',
                            !notification.read && 'bg-gradient-to-r from-cyan-500/10 to-transparent border-cyan-500/30'
                          )}
                          onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', colorClass)}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded"
                                  >
                                    <Check className="w-3 h-3 text-slate-400" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      );

                      return link ? (
                        <Link key={notification.id} href={link} onClick={() => setIsOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        <div key={notification.id}>{content}</div>
                      );
                    })}
                  </div>
                )}

                {/* Read Notifications */}
                {readNotifications.length > 0 && (
                  <div className="p-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500 px-2 py-1 mb-2">Earlier</p>
                    {readNotifications.map(notification => {
                      const Icon = notificationIcons[notification.type];
                      const colorClass = notificationColors[notification.type];
                      const link = getNotificationLink(notification);

                      const content = (
                        <div
                          className={cn(
                            'p-3 rounded-xl mb-2 cursor-pointer transition-all opacity-70 hover:opacity-100',
                            'bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', colorClass)}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      );

                      return link ? (
                        <Link key={notification.id} href={link} onClick={() => setIsOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        <div key={notification.id}>{content}</div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
