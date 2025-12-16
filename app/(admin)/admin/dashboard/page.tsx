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
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {adminUser?.full_name?.split(' ')[0] || 'Admin'}!
        </h1>
        <p className="text-emerald-100">
          You have {isAdmin ? 'full admin' : 'tutor'} access to the SabiPrep admin portal.
          {stats && stats.activity.sessionsToday > 0 && (
            <> There {stats.activity.sessionsToday === 1 ? 'has been' : 'have been'} <strong>{stats.activity.sessionsToday}</strong> learning session{stats.activity.sessionsToday !== 1 ? 's' : ''} today.</>
          )}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button
            onClick={() => {
              fetchDashboardData();
              fetchAlerts();
            }}
            className="ml-2 text-red-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
          <AlertList
            alerts={alerts}
            isLoading={isAlertsLoading}
            onDismiss={handleAlertDismiss}
          />
        </Card>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Card */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/admin/questions/new"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Add Question</span>
            </Link>
            <Link 
              href="/admin/import"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Import CSV</span>
            </Link>
            <Link 
              href="/admin/users"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Manage Users</span>
            </Link>
            <Link 
              href="/admin/content"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Edit Content</span>
            </Link>
          </div>
        </Card>

        {/* User Statistics Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h3>
          {isStatsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-sm text-gray-600">Students</span>
                </div>
                <span className="font-semibold text-gray-900">{stats.users.byRole.student}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-600">Tutors</span>
                </div>
                <span className="font-semibold text-gray-900">{stats.users.byRole.tutor}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm text-gray-600">Admins</span>
                </div>
                <span className="font-semibold text-gray-900">{stats.users.byRole.admin}</span>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">New this month</span>
                  <span className="font-medium text-emerald-600">+{stats.users.newThisMonth}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Unable to load user breakdown</p>
          )}
        </Card>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Registrations</h3>
            <Link 
              href="/admin/users"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <DataTable
            data={recentUsers}
            columns={userColumns}
            keyAccessor={(u) => u.id}
            isLoading={isStatsLoading}
            emptyMessage="No recent registrations"
            showSearch={false}
            skeletonRows={3}
          />
        </Card>

        {/* Recent Imports */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Imports</h3>
            <Link 
              href="/admin/import/history"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All →
            </Link>
          </div>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-3">No imports yet</p>
              <Link
                href="/admin/import"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Import your first CSV →
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Admin Dashboard</h4>
            <p className="text-sm text-blue-600 mt-1">
              This dashboard provides an overview of your SabiPrep platform. Use the navigation menu to manage users, 
              content, questions, and imports. System alerts will appear above when there are issues requiring attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
