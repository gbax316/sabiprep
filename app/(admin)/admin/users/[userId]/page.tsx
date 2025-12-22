'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader, AdminPrimaryButton, AdminSecondaryButton } from '@/components/admin';
import { UserFormModal } from '@/components/admin/UserFormModal';
import type { User, UserRole, UserStatus, AdminAuditLog } from '@/types/database';

/**
 * Role badge component with colors
 */
function RoleBadge({ role }: { role: UserRole }) {
  const config: Record<UserRole, { bg: string; text: string; label: string }> = {
    admin: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' },
    tutor: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Tutor' },
    student: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Student' },
  };
  
  const { bg, text, label } = config[role] || config.student;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

/**
 * Status badge component with colors
 */
function StatusBadge({ status }: { status: UserStatus }) {
  const config: Record<UserStatus, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
    suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    deleted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Inactive' },
  };
  
  const { bg, text, label } = config[status] || config.active;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

/**
 * User stats interface
 */
interface UserStats {
  totalSessions: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  streakCount: number;
  totalStudyTimeMinutes: number;
}

/**
 * Stat Card Component
 */
function StatCard({ 
  label, 
  value, 
  icon,
  color = 'emerald',
}: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  color?: 'emerald' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation Modal Component
 */
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-xl shadow-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * User avatar component
 */
function UserAvatar({ user, size = 'lg' }: { user: User; size?: 'sm' | 'lg' }) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const sizeClasses = size === 'lg' 
    ? 'w-20 h-20 text-2xl' 
    : 'w-10 h-10 text-sm';
  
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className={`${sizeClasses} rounded-full object-cover`}
      />
    );
  }
  
  return (
    <div className={`${sizeClasses} rounded-full bg-emerald-100 flex items-center justify-center`}>
      <span className="font-semibold text-emerald-700">{initials}</span>
    </div>
  );
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

/**
 * User Detail Page
 */
export default function UserDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { userId } = resolvedParams;
  
  // Data state
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAuditLog[]>([]);
  const [roleHistory, setRoleHistory] = useState<AdminAuditLog[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    isDestructive?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  
  // Fetch user data
  const fetchUser = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch user');
      }
      
      setUser(data.user);
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
      setRoleHistory(data.roleHistory || []);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [userId]);
  
  // Handle edit user
  const handleEditUser = () => {
    setIsFormModalOpen(true);
  };
  
  // Handle reset password
  const handleResetPassword = () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Are you sure you want to send a password reset email to ${user.email}?`,
      confirmLabel: 'Send Reset Email',
      action: async () => {
        const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to send reset email');
        }
      },
    });
  };
  
  // Handle disable/enable user
  const handleToggleStatus = () => {
    if (!user) return;
    
    const isActive = user.status === 'active';
    
    setConfirmModal({
      isOpen: true,
      title: isActive ? 'Disable Account' : 'Enable Account',
      message: isActive
        ? `Are you sure you want to disable ${user.full_name}'s account? They will not be able to log in.`
        : `Are you sure you want to enable ${user.full_name}'s account?`,
      confirmLabel: isActive ? 'Disable Account' : 'Enable Account',
      isDestructive: isActive,
      action: async () => {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: isActive ? 'suspended' : 'active' }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update user status');
        }
        
        // Refresh data
        fetchUser();
      },
    });
  };
  
  // Handle confirm modal action
  const handleConfirmAction = async () => {
    setIsConfirmLoading(true);
    try {
      await confirmModal.action();
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (err) {
      console.error('Error performing action:', err);
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirmLoading(false);
    }
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    fetchUser();
  };
  
  // Format date
  const formatDate = (dateString?: string, includeTime = false) => {
    if (!dateString) return '-';
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Format minutes to hours/minutes
  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  // Format action for display
  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      CREATE: 'User created',
      UPDATE: 'Profile updated',
      ROLE_CHANGE: 'Role changed',
      STATUS_CHANGE: 'Status changed',
      DELETE: 'Account deleted',
    };
    return actionMap[action] || action;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-96 bg-gray-100 rounded mb-8" />
        
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !user) {
    return (
      <div>
        <AdminHeader
          title="User Not Found"
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Not Found' },
          ]}
        />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-4">{error || 'User not found'}</p>
          <Link href="/admin/users" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <AdminHeader
        title={user.full_name}
        subtitle={user.email}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Users', href: '/admin/users' },
          { label: user.full_name },
        ]}
        actions={
          <div className="flex gap-3">
            <AdminSecondaryButton onClick={handleResetPassword}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Reset Password
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={handleEditUser}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit User
            </AdminPrimaryButton>
          </div>
        }
      />
      
      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <UserAvatar user={user} size="lg" />
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Joined</p>
                <p className="text-gray-900">{formatDate(user.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Active</p>
                <p className="text-gray-900">
                  {user.last_active_date ? formatDate(user.last_active_date) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Grade</p>
                <p className="text-gray-900">{user.grade || 'Not set'}</p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex sm:flex-col gap-2">
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                user.status === 'active'
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {user.status === 'active' ? 'Disable Account' : 'Enable Account'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Sessions"
            value={stats.totalSessions}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatCard
            label="Questions Answered"
            value={stats.totalQuestionsAnswered}
            color="emerald"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Accuracy"
            value={`${stats.averageAccuracy}%`}
            color="purple"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Study Time"
            value={formatStudyTime(stats.totalStudyTimeMinutes)}
            color="orange"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}
      
      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Change History */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role & Status History</h3>
          
          {roleHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No history available</p>
          ) : (
            <div className="space-y-4">
              {roleHistory.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action === 'CREATE' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    ) : log.action === 'ROLE_CHANGE' ? (
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{formatAction(log.action)}</p>
                    {log.details && (
                      <p className="text-gray-500 text-xs">
                        {log.action === 'ROLE_CHANGE' && (
                          <>
                            {(log.details as { previous_role?: string }).previous_role} →{' '}
                            {(log.details as { new_role?: string }).new_role}
                          </>
                        )}
                        {log.action === 'STATUS_CHANGE' && (
                          <>
                            {(log.details as { previous_status?: string }).previous_status} →{' '}
                            {(log.details as { new_status?: string }).new_status}
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(log.created_at, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activity</h3>
          
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{formatAction(log.action)}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(log.created_at, true)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* User form modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        user={user}
      />
      
      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={isConfirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
