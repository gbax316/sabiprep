'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminHeader, AdminSecondaryButton } from '@/components/admin';
import { Badge } from '@/components/common';
import { DataTable, type ColumnDef, type PaginationInfo } from '@/components/admin/DataTable';
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

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${bg} ${text}`}>
      {action.replace(/_/g, ' ')}
    </span>
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

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Logs</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="BULK_PUBLISH">Bulk Publish</option>
                <option value="BULK_ARCHIVE">Bulk Archive</option>
                <option value="BULK_DELETE">Bulk Delete</option>
                <option value="IMPORT_START">Import Start</option>
                <option value="IMPORT_COMPLETE">Import Complete</option>
                <option value="IMPORT_FAILED">Import Failed</option>
                <option value="ROLE_CHANGE">Role Change</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entity Type
              </label>
              <select
                value={filters.entity_type || ''}
                onChange={(e) => handleFilterChange('entity_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              >
                <option value="">All Entities</option>
                <option value="user">User</option>
                <option value="question">Question</option>
                <option value="subject">Subject</option>
                <option value="topic">Topic</option>
                <option value="import">Import</option>
              </select>
            </div>

            {/* Date Range Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <DataTable
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
      </div>

      {/* Summary Stats */}
      {!isLoading && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pagination.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Showing</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {logs.length} of {pagination.total}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Page</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {pagination.page} / {pagination.totalPages}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Actions Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {logs.filter((log) => isToday(log.created_at)).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
