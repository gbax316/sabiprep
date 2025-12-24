'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { 
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminBadge,
  AdminTable,
  AdminButton,
  AdminPrimaryButton,
  type ColumnDef,
} from '@/components/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
      return 'bg-emerald-100 text-emerald-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get role badge classes
 */
function getRoleBadgeClasses(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800';
    case 'tutor':
      return 'bg-blue-100 text-blue-800';
    case 'student':
    default:
      return 'bg-gray-100 text-gray-800';
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

  // Fetch dashboard data with timeout
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      setError(null);

      // Add timeout to prevent hanging (7 seconds - slightly longer for dashboard with multiple data sources)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch('/api/admin/dashboard', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: DashboardResponse = await response.json();

        if (data.success && data.data) {
          setStats(data.data.stats);
          setRecentImports(data.data.recentImports || []);
          setRecentUsers(data.data.recentUsers || []);
          setError(null); // Clear any previous errors
        } else {
          setError('Failed to load dashboard statistics');
          // Set empty states to prevent infinite loading
          setStats(null);
          setRecentImports([]);
          setRecentUsers([]);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          // Timeout - log as warning (expected behavior when server is slow)
          console.warn('Dashboard data request timed out after 7 seconds');
          setError('Request timed out. The server is taking longer than expected. Please try refreshing the page.');
          // Set empty states to prevent infinite loading
          setStats(null);
          setRecentImports([]);
          setRecentUsers([]);
          return; // Return early to avoid re-throwing
        }
        throw fetchError;
      }
    } catch (err: any) {
      // Only log non-timeout errors as errors
      if (err.message && !err.message.includes('timed out')) {
        console.error('Error fetching dashboard data:', err);
      }
      const errorMessage = err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      // Set empty states to prevent infinite loading
      setStats(null);
      setRecentImports([]);
      setRecentUsers([]);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch alerts with timeout
  const fetchAlerts = useCallback(async () => {
    try {
      setIsAlertsLoading(true);

      // Add timeout to prevent hanging (5 seconds - alerts are less critical)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('/api/admin/dashboard/alerts', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          // Alerts are non-critical, just set empty array on error
          setAlerts([]);
          return;
        }

        const data: AlertsResponse = await response.json();

        if (data.success && data.data) {
          setAlerts(data.data.alerts || []);
        } else {
          setAlerts([]);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Alerts are non-critical, fail silently but set empty array
        if (fetchError.name !== 'AbortError') {
          console.warn('Error fetching alerts:', fetchError);
        }
        setAlerts([]);
      }
    } catch (err) {
      console.warn('Error fetching alerts:', err);
      setAlerts([]);
    } finally {
      setIsAlertsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    // Check for refresh flag first
    if (typeof window !== 'undefined') {
      const shouldRefresh = sessionStorage.getItem('refresh_dashboard');
      if (shouldRefresh === 'true') {
        sessionStorage.removeItem('refresh_dashboard');
        // Small delay to ensure navigation is complete
        setTimeout(() => {
          fetchDashboardData();
          fetchAlerts();
        }, 500);
        return;
      }
    }

    // Normal load
    fetchDashboardData();
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Refresh on window focus if flag is set
  useEffect(() => {
    const handleFocus = () => {
      if (typeof window !== 'undefined') {
        const shouldRefresh = sessionStorage.getItem('refresh_dashboard');
        if (shouldRefresh === 'true') {
          sessionStorage.removeItem('refresh_dashboard');
          fetchDashboardData();
          fetchAlerts();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      render: (item) => {
        const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending'> = {
          completed: 'success',
          processing: 'info',
          failed: 'error',
          pending: 'pending',
        };
        return (
          <AdminBadge status={statusMap[item.status] || 'default'}>
            {item.status}
          </AdminBadge>
        );
      },
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
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
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
      render: (item) => {
        const roleMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
          admin: 'error',
          tutor: 'info',
          student: 'default',
        };
        return (
          <AdminBadge status={roleMap[item.role] || 'default'}>
            {item.role}
          </AdminBadge>
        );
      },
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
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {adminUser?.full_name?.split(' ')[0] || 'Admin'}! 👋
        </h1>
        <p className="text-gray-600">
          {stats && stats.activity.sessionsToday > 0 
            ? `You have ${stats.activity.sessionsToday} learning session${stats.activity.sessionsToday !== 1 ? 's' : ''} today. Keep up your good work!`
            : 'Here\'s what\'s happening on your platform today.'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to Load Dashboard</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <AdminButton
              onClick={() => {
                setError(null);
                fetchDashboardData();
                fetchAlerts();
              }}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </AdminButton>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Metrics - Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Users</div>
            <div className="text-3xl font-bold text-foreground">{stats?.users.total ?? '-'}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats ? `${stats.users.active} active this week` : 'Loading...'}
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Questions</div>
            <div className="text-3xl font-bold text-foreground">{stats?.content.totalQuestions ?? '-'}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats ? `${stats.content.publishedQuestions} published` : 'Loading...'}
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Learning Sessions</div>
            <div className="text-3xl font-bold text-foreground">{stats?.activity.totalSessions ?? '-'}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats ? `${stats.activity.sessionsToday} today` : 'Loading...'}
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Avg. Accuracy</div>
            <div className="text-3xl font-bold text-foreground">
              {stats ? `${stats.activity.averageAccuracy}%` : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats ? `${stats.activity.totalAnswered.toLocaleString()} questions answered` : 'Loading...'}
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>

      {/* User Breakdown - Insight Section */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Users by Role</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
        {isStatsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700 font-medium">Students</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {Math.round((stats.users.byRole.student / stats.users.total) * 100)}%
                </span>
                <span className="font-bold text-gray-900 text-lg">{stats.users.byRole.student}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">Tutors</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-600">
                  {Math.round((stats.users.byRole.tutor / stats.users.total) * 100)}%
                </span>
                <span className="font-bold text-blue-900 text-lg">{stats.users.byRole.tutor}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-700 font-medium">Admins</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-purple-600">
                  {Math.round((stats.users.byRole.admin / stats.users.total) * 100)}%
                </span>
                <span className="font-bold text-purple-900 text-lg">{stats.users.byRole.admin}</span>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-200">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm text-emerald-700 font-medium">New this month</span>
                <span className="font-bold text-emerald-600 text-lg">+{stats.users.newThisMonth}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Unable to load user breakdown</p>
        )}
        </AdminCardContent>
      </AdminCard>

      {/* Quick Actions */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Quick Actions</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            href="/admin/questions/new"
            className="group flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">Add Question</span>
          </Link>
          <Link 
            href="/admin/import"
            className="group flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">Import CSV</span>
          </Link>
          <Link 
            href="/admin/users"
            className="group flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">Manage Users</span>
          </Link>
          <Link 
            href="/admin/content"
            className="group flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
          >
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-foreground">Edit Content</span>
          </Link>
        </div>
        </AdminCardContent>
      </AdminCard>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <Alert className="border-amber-300 bg-amber-50">
            <Activity className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">System Alerts</AlertTitle>
            <AlertDescription className="text-amber-800">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
          {alerts.map((alert) => (
            <Alert 
              key={alert.id} 
              variant={alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'default' : 'default'}
              className="border-l-4"
            >
              <AlertTitle>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <AdminCard>
          <AdminCardHeader>
            <div className="flex items-center justify-between">
              <AdminCardTitle>Recent Registrations</AdminCardTitle>
              <AdminButton variant="ghost" size="sm" href="/admin/users" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </AdminButton>
            </div>
          </AdminCardHeader>
          <AdminCardContent>
            <AdminTable
              data={recentUsers}
              columns={userColumns}
              keyAccessor={(u) => u.id}
              isLoading={isStatsLoading}
              emptyMessage="No recent registrations"
              showSearch={false}
              skeletonRows={3}
            />
          </AdminCardContent>
        </AdminCard>

        {/* Recent Imports */}
        <AdminCard>
          <AdminCardHeader>
            <div className="flex items-center justify-between">
              <AdminCardTitle>Recent Imports</AdminCardTitle>
              <AdminButton variant="ghost" size="sm" href="/admin/import/history" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </AdminButton>
            </div>
          </AdminCardHeader>
          <AdminCardContent>
            {recentImports.length > 0 || isStatsLoading ? (
              <AdminTable
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-2">No imports yet</h4>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  Upload your first CSV file to bulk import questions into the system.
                </p>
                <AdminPrimaryButton href="/admin/import" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import CSV
                </AdminPrimaryButton>
              </div>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>
    </div>
  );
}
