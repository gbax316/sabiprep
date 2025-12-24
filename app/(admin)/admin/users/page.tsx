'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminHeader,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminButton,
  AdminTable,
  AdminBadge,
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogDescription,
  AdminDialogFooter,
  type ColumnDef,
  type PaginationInfo,
} from '@/components/admin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const roleMap: Record<UserRole, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
    admin: 'error',
    tutor: 'info',
    student: 'default',
  };
  
  return (
    <AdminBadge status={roleMap[role] || 'default'}>
      {role === 'admin' ? '👑 Admin' : role === 'tutor' ? '📚 Tutor' : '🎓 Student'}
    </AdminBadge>
  );
}

/**
 * Status badge component with colors
 */
function StatusBadge({ status }: { status: UserStatus }) {
  const statusMap: Record<UserStatus, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
    active: 'success',
    suspended: 'error',
    deleted: 'warning',
  };
  
  const labels: Record<UserStatus, string> = {
    active: 'Active',
    suspended: 'Suspended',
    deleted: 'Inactive',
  };
  
  return (
    <AdminBadge status={statusMap[status] || 'default'}>
      {labels[status] || status}
    </AdminBadge>
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
  return (
    <AdminDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AdminDialogContent size="md">
        <AdminDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDestructive ? 'bg-destructive/10' : 'bg-emerald-100'
            }`}>
              {isDestructive ? (
                <Ban className="w-6 h-6 text-destructive" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <AdminDialogTitle>{title}</AdminDialogTitle>
          </div>
          <AdminDialogDescription className="mt-2">
            {message}
          </AdminDialogDescription>
        </AdminDialogHeader>
        <AdminDialogFooter>
          <AdminSecondaryButton onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </AdminSecondaryButton>
          <AdminButton
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
            )}
            {confirmLabel}
          </AdminButton>
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialog>
  );
}

/**
 * Users Management Page
 */
export default function UsersPage() {
  const router = useRouter();
  
  // Track if component is mounted to prevent state updates after unmount
  const [mounted, setMounted] = useState(true);
  
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
  
  // Cleanup on unmount
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);
  
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
  
  // Fetch users with timeout
  const fetchUsers = useCallback(async () => {
    if (!mounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      
      // Add timeout to prevent infinite loading (5 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!mounted) return;
        
        if (!response.ok) {
          throw new Error(response.status === 401 ? 'Unauthorized' : `Failed to fetch users: ${response.status}`);
        }
        
        const data = await response.json();
        if (!mounted) return;
        
        setUsers(data.users || []);
        setPagination(data.pagination || pagination);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (!mounted) return;
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }
    } catch (err) {
      if (!mounted) return;
      
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      // Set empty state on error to prevent infinite loading
      setUsers([]);
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [mounted, pagination.page, pagination.limit, search, roleFilter, statusFilter]);
  
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
            <p className="font-semibold text-gray-900">{user.full_name}</p>
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
        <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      sortable: true,
      accessor: (user) => user.last_active_date || '',
      render: (user) => (
        <span className={`text-sm ${user.last_active_date ? 'text-gray-600' : 'text-gray-400 italic'}`}>
          {user.last_active_date ? formatDate(user.last_active_date) : 'Never'}
        </span>
      ),
    },
  ];
  
  // Row actions
  const rowActions = (user: User) => (
    <div className="flex items-center gap-1">
      {/* View */}
      <AdminButton
        variant="ghost"
        size="icon"
        onClick={() => handleViewUser(user)}
        title="View details"
      >
        <Eye className="w-4 h-4 text-gray-900" />
      </AdminButton>
      
      {/* Edit */}
      <AdminButton
        variant="ghost"
        size="icon"
        onClick={() => handleEditUser(user)}
        title="Edit user"
      >
        <Pencil className="w-4 h-4 text-gray-900" />
      </AdminButton>
      
      {/* Reset Password */}
      <AdminButton
        variant="ghost"
        size="icon"
        onClick={() => handleResetPassword(user)}
        title="Reset password"
      >
        <Key className="w-4 h-4 text-gray-900" />
      </AdminButton>
      
      {/* Disable/Enable */}
      <AdminButton
        variant="ghost"
        size="icon"
        onClick={() => handleDisableUser(user)}
        title={user.status === 'active' ? 'Disable account' : 'Enable account'}
        className={user.status === 'active' ? 'hover:text-destructive' : 'hover:text-emerald-600'}
      >
        {user.status === 'active' ? (
          <Ban className="w-4 h-4 text-gray-900" />
        ) : (
          <CheckCircle className="w-4 h-4 text-gray-900" />
        )}
      </AdminButton>
    </div>
  );
  
  // Check if filters are active
  const hasActiveFilters = roleFilter !== '' || statusFilter !== '' || searchInput !== '';

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <AdminHeader
        title="Users"
        subtitle="Manage all users in the system"
        actions={
          <>
            <AdminSecondaryButton
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={handleAddUser}>
              <Plus className="w-4 h-4" />
              Add User
            </AdminPrimaryButton>
          </>
        }
      />

      {/* Filters Card */}
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center justify-between">
            <AdminCardTitle>Filters</AdminCardTitle>
            {hasActiveFilters && (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
                Clear All
              </AdminButton>
            )}
          </div>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="sm:col-span-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Name or email..."
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Role filter */}
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={roleFilter || 'all'}
                onValueChange={(value) => {
                  setRoleFilter(value === 'all' ? '' : (value as UserRole));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger id="role" className="mt-2">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="tutor">Tutors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status filter */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(value) => {
                  setStatusFilter(value === 'all' ? '' : (value as UserStatus));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger id="status" className="mt-2">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>
      
      {/* Error state */}
      {error && (
        <AdminCard className="border-destructive">
          <AdminCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
              <AdminButton
                variant="outline"
                size="sm"
                onClick={fetchUsers}
              >
                Try again
              </AdminButton>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}
      
      {/* Data table */}
      <AdminCard>
        <AdminCardContent className="p-0">
          <AdminTable<User>
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
              <Users className="w-12 h-12 text-muted-foreground" />
            }
          />
        </AdminCardContent>
      </AdminCard>
      
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
