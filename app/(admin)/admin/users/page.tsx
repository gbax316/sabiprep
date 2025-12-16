'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader, AdminPrimaryButton, AdminSecondaryButton } from '@/components/admin/AdminHeader';
import { DataTable, type ColumnDef, type PaginationInfo } from '@/components/admin/DataTable';
import { UserFormModal } from '@/components/admin/UserFormModal';
import type { User, UserRole, UserStatus } from '@/types/database';

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
 * User avatar component
 */
function UserAvatar({ user }: { user: User }) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
      <span className="text-xs font-medium text-emerald-700">{initials}</span>
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
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
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
            {cancelLabel}
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
 * Users Management Page
 */
export default function UsersPage() {
  const router = useRouter();
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
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
  
  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch users');
      }
      
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);
  
  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Handle search with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };
  
  // Handle add user
  const handleAddUser = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };
  
  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };
  
  // Handle view user details
  const handleViewUser = (user: User) => {
    router.push(`/admin/users/${user.id}`);
  };
  
  // Handle reset password
  const handleResetPassword = (user: User) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Are you sure you want to send a password reset email to ${user.email}?`,
      confirmLabel: 'Send Reset Email',
      action: async () => {
        const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
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
  
  // Handle disable user
  const handleDisableUser = (user: User) => {
    const isActive = user.status === 'active';
    
    setConfirmModal({
      isOpen: true,
      title: isActive ? 'Disable User' : 'Enable User',
      message: isActive
        ? `Are you sure you want to disable ${user.full_name}'s account? They will not be able to log in.`
        : `Are you sure you want to enable ${user.full_name}'s account?`,
      confirmLabel: isActive ? 'Disable Account' : 'Enable Account',
      isDestructive: isActive,
      action: async () => {
        const response = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: isActive ? 'suspended' : 'active' }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update user status');
        }
        
        // Refresh list
        fetchUsers();
      },
    });
  };
  
  // Handle confirm modal action
  const handleConfirmAction = async () => {
    setIsConfirmLoading(true);
    try {
      await confirmModal.action();
      setConfirmModal({ ...confirmModal, isOpen: false });
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Error performing action:', err);
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirmLoading(false);
    }
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    fetchUsers();
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Table columns
  const columns: ColumnDef<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div>
            <p className="font-medium text-gray-900">{user.full_name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: (user) => user.role,
      render: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (user) => user.status,
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      accessor: (user) => user.created_at,
      render: (user) => (
        <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      sortable: true,
      accessor: (user) => user.last_active_date || '',
      render: (user) => (
        <span className="text-sm text-gray-500">
          {user.last_active_date ? formatDate(user.last_active_date) : 'Never'}
        </span>
      ),
    },
  ];
  
  // Row actions
  const rowActions = (user: User) => (
    <div className="flex items-center gap-1">
      {/* View */}
      <button
        onClick={() => handleViewUser(user)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="View details"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      
      {/* Edit */}
      <button
        onClick={() => handleEditUser(user)}
        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        title="Edit user"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      
      {/* Reset Password */}
      <button
        onClick={() => handleResetPassword(user)}
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Reset password"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </button>
      
      {/* Disable/Enable */}
      <button
        onClick={() => handleDisableUser(user)}
        className={`p-1.5 rounded transition-colors ${
          user.status === 'active'
            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
        }`}
        title={user.status === 'active' ? 'Disable account' : 'Enable account'}
      >
        {user.status === 'active' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
    </div>
  );
  
  return (
    <div>
      <AdminHeader
        title="Users"
        subtitle="Manage all users in the system"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Users' },
        ]}
        actions={
          <AdminPrimaryButton onClick={handleAddUser}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add User
          </AdminPrimaryButton>
        }
      />
      
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as UserRole | '');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="tutor">Tutors</option>
          <option value="admin">Admins</option>
        </select>
        
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as UserStatus | '');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      
      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={fetchUsers}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Data table */}
      <DataTable<User>
        data={users}
        columns={columns}
        isLoading={isLoading}
        keyAccessor={(user) => user.id}
        pagination={pagination}
        onPageChange={handlePageChange}
        rowActions={rowActions}
        onRowClick={handleViewUser}
        showSearch={false}
        emptyMessage="No users found"
        emptyIcon={
          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      />
      
      {/* User form modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        user={editingUser}
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
