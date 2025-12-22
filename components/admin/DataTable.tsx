'use client';

import React, { useState, useMemo } from 'react';

/**
 * Column definition for the DataTable
 */
export interface ColumnDef<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (item: T, index: number) => React.ReactNode;
  /** Accessor function for sorting */
  accessor?: (item: T) => string | number | boolean | null | undefined;
  /** Width class for the column */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * DataTable Props
 */
export interface DataTableProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Loading state */
  isLoading?: boolean;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selected: T[]) => void;
  /** Callback when a row is clicked */
  onRowClick?: (item: T, index: number) => void;
  /** Message to display when data is empty */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Unique key accessor for each row */
  keyAccessor: (item: T) => string;
  /** Search filter function */
  searchFilter?: (item: T, query: string) => boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Whether to show search input */
  showSearch?: boolean;
  /** Pagination info (if using server-side pagination) */
  pagination?: PaginationInfo;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Available page sizes */
  pageSizeOptions?: number[];
  /** Custom row actions */
  rowActions?: (item: T) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Selected keys for external control */
  selectedKeys?: Set<string>;
}

/**
 * Sort direction
 */
type SortDirection = 'asc' | 'desc' | null;

/**
 * DataTable Component
 * A reusable table component with sorting, filtering, pagination, and selection
 * Clean, light design with indigo accents
 */
export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  selectable = false,
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No data available',
  emptyIcon,
  keyAccessor,
  searchFilter,
  searchPlaceholder = 'Search...',
  showSearch = true,
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 75, 100, 200],
  rowActions,
  className = '',
  skeletonRows = 5,
  selectedKeys: externalSelectedKeys,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());
  
  // Use external or internal selected keys
  const selectedKeys = externalSelectedKeys ?? internalSelectedKeys;
  const setSelectedKeys = externalSelectedKeys ? () => {} : setInternalSelectedKeys;
  
  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply search filter
    if (searchFilter && searchQuery.trim()) {
      result = result.filter((item) => searchFilter(item, searchQuery.trim().toLowerCase()));
    }
    
    // Apply sorting (client-side)
    if (sortColumn && sortDirection && !pagination) {
      const column = columns.find((c) => c.key === sortColumn);
      if (column?.accessor) {
        result.sort((a, b) => {
          const aVal = column.accessor!(a);
          const bVal = column.accessor!(b);
          
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          let comparison = 0;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else {
            comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          }
          
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }
    
    return result;
  }, [data, searchQuery, searchFilter, sortColumn, sortDirection, columns, pagination]);
  
  // Handle sort click
  const handleSort = (columnKey: string) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column?.sortable) return;
    
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  
  // Handle selection
  const handleSelectAll = () => {
    if (selectedKeys.size === processedData.length) {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(processedData.map(keyAccessor));
      setSelectedKeys(newSelected);
      onSelectionChange?.(processedData);
    }
  };
  
  const handleSelectRow = (item: T) => {
    const key = keyAccessor(item);
    const newSelected = new Set(selectedKeys);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedKeys(newSelected);
    onSelectionChange?.(processedData.filter((d) => newSelected.has(keyAccessor(d))));
  };
  
  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    
    return (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        {showSearch && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="w-64 h-10 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && <th className="w-12 px-6 py-3" />}
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </th>
                ))}
                {rowActions && <th className="w-24 px-6 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: skeletonRows }).map((_, idx) => (
                <tr key={idx} className="bg-white hover:bg-gray-50">
                  {selectable && (
                    <td className="px-6 py-3">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-6 py-3">
                      <div className="w-8 h-8 bg-gray-100 rounded animate-pulse" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Search */}
      {showSearch && searchFilter && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-xs">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === processedData.length && processedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-${col.align || 'left'} ${col.width || ''}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900 transition-colors"
                    >
                      {col.header}
                      {getSortIcon(col.key)}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
              {rowActions && (
                <th className="w-24 px-6 py-3 text-right">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-6 py-16 text-center bg-white"
                >
                  <div className="flex flex-col items-center justify-center">
                    {emptyIcon || (
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    )}
                    <p className="text-gray-600 text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              processedData.map((item, index) => {
                const key = keyAccessor(item);
                const isSelected = selectedKeys.has(key);
                
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item, index)}
                    className={`
                      transition-colors bg-white
                      ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                      ${isSelected ? 'bg-indigo-50' : ''}
                    `}
                  >
                    {selectable && (
                      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 focus:ring-offset-0"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-6 py-3 text-sm text-gray-900 text-${col.align || 'left'} ${col.width || ''}`}
                      >
                        {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(item)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && (pagination.totalPages > 1 || onPageSizeChange) && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium text-gray-900">{pagination.total}</span> results
            </p>
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">
                  Rows per page:
                </label>
                <select
                  value={pagination.limit}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={`min-w-[2.25rem] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;
