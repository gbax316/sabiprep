'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AdminHeader, 
  AdminSecondaryButton,
  AdminTable,
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminBadge,
  AdminButton,
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
import type { AdminAuditLog } from '@/types/database';
import type { AuditLogListParams, AuditLogWithAdmin } from '@/types/admin';
import {
  Filter,
  Search,
  Calendar,
  User,
  FileText,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  X,
} from 'lucide-react';

/**
 * Format date for display
 */
function formatDate(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { date: dateStr, time: timeStr };
}

/**
 * Format date for input (YYYY-MM-DD)
 */
function formatDateForInput(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Check if date is today
 */
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Action badge component
 */
function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    CREATE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    UPDATE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    DELETE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    BULK_PUBLISH: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    BULK_ARCHIVE: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
    BULK_DELETE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    IMPORT_START: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
    IMPORT_COMPLETE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    IMPORT_FAILED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    ROLE_CHANGE: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    STATUS_CHANGE: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
    LOGIN: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    LOGOUT: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  };

  const { bg, text } = config[action] || {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
  };

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'error',
    BULK_PUBLISH: 'info',
    BULK_ARCHIVE: 'warning',
    BULK_DELETE: 'error',
    IMPORT_START: 'info',
    IMPORT_COMPLETE: 'success',
    IMPORT_FAILED: 'error',
    ROLE_CHANGE: 'warning',
    STATUS_CHANGE: 'info',
    LOGIN: 'success',
    LOGOUT: 'default',
  };
  
  return (
    <AdminBadge status={statusMap[action] || 'default'}>
      {action.replace(/_/g, ' ')}
    </AdminBadge>
  );
}

/**
 * Entity type badge component
 */
function EntityTypeBadge({ entityType }: { entityType: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    user: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'User' },
    question: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Question' },
    subject: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Subject' },
    topic: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Topic' },
    import: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'Import' },
  };

  const { bg, text, label } = config[entityType] || {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    label: entityType,
  };

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
    user: 'info',
    question: 'info',
    subject: 'success',
    topic: 'warning',
    import: 'info',
  };
  
  return (
    <AdminBadge status={statusMap[entityType] || 'default'}>
      {label}
    </AdminBadge>
  );
}

/**
 * Expandable details component
 */
function LogDetails({ log }: { log: AuditLogWithAdmin }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Details</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
          {log.admin && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Admin</span>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{log.admin.full_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{log.admin.email}</p>
            </div>
          )}
          {log.entity_id && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entity ID</span>
              <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{log.entity_id}</p>
            </div>
          )}
          {log.ip_address && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">IP Address</span>
              <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{log.ip_address}</p>
            </div>
          )}
          {log.user_agent && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User Agent</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-all">{log.user_agent}</p>
            </div>
          )}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Details</span>
              <pre className="text-xs text-gray-700 dark:text-gray-300 mt-1 p-3 bg-white dark:bg-gray-900 rounded-lg overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Audit Logs Page
 */
export default function AuditLogsPage() {
  // State
  const [logs, setLogs] = useState<AuditLogWithAdmin[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<AuditLogListParams>({
    page: 1,
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 50));

      if (filters.admin_id) params.set('admin_id', filters.admin_id);
      if (filters.action) params.set('action', filters.action);
      if (filters.entity_type) params.set('entity_type', filters.entity_type);
      if (filters.startDate) params.set('start_date', filters.startDate);
      if (filters.endDate) params.set('end_date', filters.endDate);

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogListParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
    });
  };

  // Table columns
  const columns: ColumnDef<AuditLogWithAdmin>[] = [
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (log) => <ActionBadge action={log.action} />,
    },
    {
      key: 'entity_type',
      header: 'Entity',
      sortable: true,
      render: (log) => <EntityTypeBadge entityType={log.entity_type} />,
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (log) => (
        <div>
          {log.admin ? (
            <>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{log.admin.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{log.admin.email}</p>
            </>
          ) : (
            <span className="text-sm text-gray-400">Unknown</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (log) => {
        const { date, time } = formatDate(log.created_at);
        return (
          <div>
            <p className="text-sm text-gray-900 dark:text-white">{date}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
          </div>
        );
      },
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => <LogDetails log={log} />,
    },
  ];

  const hasActiveFilters =
    !!filters.admin_id || !!filters.action || !!filters.entity_type || !!filters.startDate || !!filters.endDate;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Audit Logs"
        subtitle="Track all administrative actions and changes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Audit Logs' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AdminSecondaryButton
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-gray-100 dark:bg-gray-700' : ''}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                  {[
                    filters.admin_id,
                    filters.action,
                    filters.entity_type,
                    filters.startDate,
                    filters.endDate,
                  ].filter(Boolean).length}
                </span>
              )}
            </AdminSecondaryButton>
            <AdminSecondaryButton onClick={fetchLogs}>
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </AdminSecondaryButton>
          </div>
        }
      />

      {/* Filters Panel */}
      {showFilters && (
        <AdminCard>
          <AdminCardHeader>
            <div className="flex items-center justify-between w-full">
              <AdminCardTitle>Filter Logs</AdminCardTitle>
              {hasActiveFilters && (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </AdminButton>
              )}
            </div>
          </AdminCardHeader>
          <AdminCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Action Filter */}
              <div>
                <Label htmlFor="action">Action Type</Label>
                <Select
                  value={filters.action || 'all'}
                  onValueChange={(value) => handleFilterChange('action', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger id="action" className="mt-2">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="BULK_PUBLISH">Bulk Publish</SelectItem>
                    <SelectItem value="BULK_ARCHIVE">Bulk Archive</SelectItem>
                    <SelectItem value="BULK_DELETE">Bulk Delete</SelectItem>
                    <SelectItem value="IMPORT_START">Import Start</SelectItem>
                    <SelectItem value="IMPORT_COMPLETE">Import Complete</SelectItem>
                    <SelectItem value="IMPORT_FAILED">Import Failed</SelectItem>
                    <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
                    <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <Label htmlFor="entity_type">Entity Type</Label>
                <Select
                  value={filters.entity_type || 'all'}
                  onValueChange={(value) => handleFilterChange('entity_type', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger id="entity_type" className="mt-2">
                    <SelectValue placeholder="All Entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filters */}
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  className="mt-2"
                />
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Audit Logs Table */}
      <AdminCard>
        <AdminCardContent className="p-0">
          <AdminTable
            data={logs}
            columns={columns}
            keyAccessor={(log) => log.id}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={(page) => handleFilterChange('page', page)}
            onPageSizeChange={(newLimit) => {
              handleFilterChange('limit', newLimit);
            }}
            emptyMessage="No audit logs found. Actions will appear here as they occur."
            showSearch={false}
            skeletonRows={10}
          />
        </AdminCardContent>
      </AdminCard>

      {/* Summary Stats */}
      {!isLoading && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AdminCard>
            <AdminCardContent>
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pagination.total}</p>
            </AdminCardContent>
          </AdminCard>
          <AdminCard>
            <AdminCardContent>
              <p className="text-sm text-muted-foreground">Showing</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {logs.length} of {pagination.total}
              </p>
            </AdminCardContent>
          </AdminCard>
          <AdminCard>
            <AdminCardContent>
              <p className="text-sm text-muted-foreground">Page</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {pagination.page} / {pagination.totalPages}
              </p>
            </AdminCardContent>
          </AdminCard>
          <AdminCard>
            <AdminCardContent>
              <p className="text-sm text-muted-foreground">Actions Today</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {logs.filter((log) => isToday(log.created_at)).length}
              </p>
            </AdminCardContent>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
