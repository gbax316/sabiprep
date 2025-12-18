'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { Card } from '@/components/common';
import { 
  StatCard, 
  StatIcons, 
  AlertList, 
  DataTable,
  type ColumnDef,
} from '@/components/admin';
import type { AdminDashboardStats, SystemAlert } from '@/types/admin';
import type { UserRole } from '@/types/database';
import {
  Plus,
  Upload,
  Users,
  FolderOpen,
  ArrowRight,
  RefreshCcw,
  TrendingUp,
  Activity,
  BookOpen,
  ClipboardList,
} from 'lucide-react';

/**
 * Recent import type for the table
 */
interface RecentImport {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  successful_rows: number;
  created_at: string;
}

/**
 * Recent user type for the table
 */
interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

/**
 * Dashboard API response type
 */
interface DashboardResponse {
  success: boolean;
  data: {
    stats: AdminDashboardStats;
    recentImports: RecentImport[];
    recentUsers: RecentUser[];
  };
}

/**
 * Alerts API response type
 */
interface AlertsResponse {
  success: boolean;
  data: {
    alerts: SystemAlert[];
  };
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Get status badge classes
 */
function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get role badge classes
 */
function getRoleBadgeClasses(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700';
    case 'tutor':
      return 'bg-blue-100 text-blue-700';
    case 'student':
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Admin Dashboard Page
 * Main dashboard with key metrics, alerts, and quick actions
 */
export default function AdminDashboardPage() {
  const { adminUser, isAdmin } = useAdminAuth();
  
  // State
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard');
      const data: DashboardResponse = await response.json();

      if (data.success && data.data) {
        setStats(data.data.stats);
        setRecentImports(data.data.recentImports || []);
        setRecentUsers(data.data.recentUsers || []);
      } else {
        setError('Failed to load dashboard statistics');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setIsAlertsLoading(true);

      const response = await fetch('/api/admin/dashboard/alerts');
      const data: AlertsResponse = await response.json();

      if (data.success && data.data) {
        setAlerts(data.data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsAlertsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
  }, [fetchDashboardData, fetchAlerts]);

  // Handle alert dismiss
  const handleAlertDismiss = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  // Column definitions for recent imports table
  const importColumns: ColumnDef<RecentImport>[] = [
    {
      key: 'filename',
      header: 'File',
      render: (item) => (
        <span className="font-medium text-gray-900">{item.filename}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(item.status)}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'rows',
      header: 'Rows',
      render: (item) => (
        <span className="text-gray-600">
          {item.successful_rows}/{item.total_rows}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (item) => (
        <span className="text-gray-500">{formatRelativeTime(item.created_at)}</span>
      ),
    },
  ];

  // Column definitions for recent users table
  const userColumns: ColumnDef<RecentUser>[] = [
    {
      key: 'full_name',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {item.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium text-gray-900">{item.full_name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item) => (
        <span className="text-gray-600">{item.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClasses(item.role)}`}>
          {item.role}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (item) => (
        <span className="text-gray-500">{formatRelativeTime(item.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-2xl p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Welcome back, {adminUser?.full_name?.split(' ')[0] || 'Admin'}! 👋
            </h1>
            <p className="text-emerald-100 text-sm lg:text-base max-w-xl">
              You have {isAdmin ? 'full admin' : 'tutor'} access to the SabiPrep admin portal.
              {stats && stats.activity.sessionsToday > 0 && (
                <> There {stats.activity.sessionsToday === 1 ? 'has been' : 'have been'} <strong className="text-white">{stats.activity.sessionsToday}</strong> learning session{stats.activity.sessionsToday !== 1 ? 's' : ''} today.</>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchAlerts();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-sm font-medium self-start"
          >
            <RefreshCcw className={`w-4 h-4 ${isStatsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
          </div>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchAlerts();
            }}
            className="px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats?.users.total ?? '-'}
          icon={StatIcons.users}
          variant="primary"
          isLoading={isStatsLoading}
          subtitle={stats ? `${stats.users.active} active this week` : undefined}
        />

        <StatCard
          label="Total Questions"
          value={stats?.content.totalQuestions ?? '-'}
          icon={StatIcons.questions}
          variant="success"
          isLoading={isStatsLoading}
          subtitle={stats ? `${stats.content.publishedQuestions} published` : undefined}
        />

        <StatCard
          label="Learning Sessions"
          value={stats?.activity.totalSessions ?? '-'}
          icon={StatIcons.sessions}
          variant="info"
          isLoading={isStatsLoading}
          subtitle={stats ? `${stats.activity.sessionsToday} today` : undefined}
        />

        <StatCard
          label="Avg. Accuracy"
          value={stats ? `${stats.activity.averageAccuracy}%` : '-'}
          icon={StatIcons.chart}
          variant="warning"
          isLoading={isStatsLoading}
          subtitle={stats ? `${stats.activity.totalAnswered.toLocaleString()} questions answered` : undefined}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Subjects"
          value={stats?.content.totalSubjects ?? '-'}
          icon={StatIcons.subjects}
          variant="primary"
          isLoading={isStatsLoading}
        />

        <StatCard
          label="Topics"
          value={stats?.content.totalTopics ?? '-'}
          icon={StatIcons.subjects}
          variant="success"
          isLoading={isStatsLoading}
        />

        <StatCard
          label="Draft Questions"
          value={stats?.content.draftQuestions ?? '-'}
          icon={StatIcons.clock}
          variant="warning"
          isLoading={isStatsLoading}
          subtitle="Pending review"
        />
      </div>

      {/* Alerts Section */}
      {(isAlertsLoading || alerts.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 dark:bg-amber-700 flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {alerts.length} active {alerts.length === 1 ? 'alert' : 'alerts'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <AlertList
              alerts={alerts}
              isLoading={isAlertsLoading}
              onDismiss={handleAlertDismiss}
            />
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center shadow-sm">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Common tasks</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/admin/questions/new"
                className="group flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Question</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create new</p>
                </div>
              </Link>
              <Link 
                href="/admin/import"
                className="group flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Import CSV</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bulk import</p>
                </div>
              </Link>
              <Link 
                href="/admin/users"
                className="group flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-purple-600 dark:bg-purple-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Manage Users</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View all users</p>
                </div>
              </Link>
              <Link 
                href="/admin/content"
                className="group flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-amber-600 dark:bg-amber-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Edit Content</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Subjects & topics</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* User Statistics Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Breakdown</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">By role</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {isStatsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Students</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-lg">{stats.users.byRole.student}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Tutors</span>
                  </div>
                  <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">{stats.users.byRole.tutor}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">Admins</span>
                  </div>
                  <span className="font-bold text-purple-900 dark:text-purple-100 text-lg">{stats.users.byRole.admin}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">New this month</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">+{stats.users.newThisMonth}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Unable to load user breakdown</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 dark:bg-purple-700 flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Registrations</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">New users</p>
                </div>
              </div>
              <Link 
                href="/admin/users"
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              data={recentUsers}
              columns={userColumns}
              keyAccessor={(u) => u.id}
              isLoading={isStatsLoading}
              emptyMessage="No recent registrations"
              showSearch={false}
              skeletonRows={3}
            />
          </div>
        </div>

        {/* Recent Imports */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-sm">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Imports</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">CSV uploads</p>
                </div>
              </div>
              <Link 
                href="/admin/import/history"
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentImports.length > 0 || isStatsLoading ? (
              <DataTable
                data={recentImports}
                columns={importColumns}
                keyAccessor={(i) => i.id}
                isLoading={isStatsLoading}
                emptyMessage="No imports yet"
                showSearch={false}
                skeletonRows={3}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-500 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">No imports yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
                  Upload your first CSV file to bulk import questions into the system.
                </p>
                <Link
                  href="/admin/import"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Dashboard Guide</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              This dashboard provides an overview of your SabiPrep platform. Use the navigation menu to manage users, 
              content, questions, and imports. System alerts will appear above when there are issues requiring attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
