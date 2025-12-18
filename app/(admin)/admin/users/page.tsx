'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader, AdminPrimaryButton, AdminSecondaryButton } from '@/components/admin/AdminHeader';
import { DataTable, type ColumnDef, type PaginationInfo } from '@/components/admin/DataTable';
import { UserFormModal } from '@/components/admin/UserFormModal';
import type { User, UserRole, UserStatus } from '@/types/database';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Key,
  Ban,
  CheckCircle,
  Users,
  RefreshCcw,
  X,
} from 'lucide-react';

/**
 * Role badge component with colors
 */
function RoleBadge({ role }: { role: UserRole }) {
  const config: Record<UserRole, { bg: string; text: string; label: string; icon: string }> = {
    admin: { bg: 'bg-purple-600 dark:bg-purple-700', text: 'text-white', label: 'Admin', icon: '👑' },
    tutor: { bg: 'bg-blue-600 dark:bg-blue-700', text: 'text-white', label: 'Tutor', icon: '📚' },
    student: { bg: 'bg-gray-600 dark:bg-gray-700', text: 'text-white', label: 'Student', icon: '🎓' },
  };
  
  const { bg, text, label } = config[role] || config.student;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${bg} ${text}`}>
      {label}
    </span>
  );
}

/**
 * Status badge component with colors
 */
function StatusBadge({ status }: { status: UserStatus }) {
  const config: Record<UserStatus, { bg: string; text: string; label: string; dot: string }> = {
    active: { bg: 'bg-emerald-600 dark:bg-emerald-700', text: 'text-white', label: 'Active', dot: 'bg-white' },
    suspended: { bg: 'bg-red-600 dark:bg-red-700', text: 'text-white', label: 'Suspended', dot: 'bg-white' },
    deleted: { bg: 'bg-amber-600 dark:bg-amber-700', text: 'text-white', label: 'Inactive', dot: 'bg-white' },
  };
  
  const { bg, text, label, dot } = config[status] || config.active;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${bg} ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
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
        className="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm"
      />
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm">
      <span className="text-sm font-bold text-white">{initials}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
            isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
          }`}>
            {isDestructive ? (
              <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isLoading && (
              <RefreshCcw className="w-4 h-4 animate-spin" />
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
            <p className="font-semibold text-gray-900 dark:text-white">{user.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
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
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      sortable: true,
      accessor: (user) => user.last_active_date || '',
      render: (user) => (
        <span className={`text-sm ${user.last_active_date ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500 italic'}`}>
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
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
        title="View details"
      >
        <Eye className="w-4 h-4" />
      </button>
      
      {/* Edit */}
      <button
        onClick={() => handleEditUser(user)}
        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
        title="Edit user"
      >
        <Pencil className="w-4 h-4" />
      </button>
      
      {/* Reset Password */}
      <button
        onClick={() => handleResetPassword(user)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
        title="Reset password"
      >
        <Key className="w-4 h-4" />
      </button>
      
      {/* Disable/Enable */}
      <button
        onClick={() => handleDisableUser(user)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          user.status === 'active'
            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
        }`}
        title={user.status === 'active' ? 'Disable account' : 'Enable account'}
      >
        {user.status === 'active' ? (
          <Ban className="w-4 h-4" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
      </button>
    </div>
  );
  
  // Check if filters are active
  const hasActiveFilters = roleFilter !== '' || statusFilter !== '' || searchInput !== '';

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Users"
        subtitle="Manage all users in the system"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Users' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AdminSecondaryButton onClick={fetchUsers}>
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={handleAddUser}>
              <Plus className="w-4 h-4" />
              Add User
            </AdminPrimaryButton>
          </div>
        }
      />

      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-sm">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Search and filter users</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="ml-auto flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name or email..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          
          {/* Role filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | '');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          
          {/* Status filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as UserStatus | '');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Data table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <DataTable<User>
          data={users}
          columns={columns}
          isLoading={isLoading}
          keyAccessor={(user) => user.id}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={(newLimit) => {
            setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
          }}
          rowActions={rowActions}
          onRowClick={handleViewUser}
          showSearch={false}
          emptyMessage="No users found"
          emptyIcon={
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          }
        />
      </div>
      
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
