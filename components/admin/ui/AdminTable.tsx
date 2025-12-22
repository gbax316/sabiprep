'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export types from DataTable for compatibility
export type { ColumnDef, PaginationInfo, DataTableProps } from '../DataTable';

/**
 * AdminTable Component
 * shadcn-based table component that maintains DataTable API compatibility
 */
export function AdminTable<T>({
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
}: {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    sortable?: boolean;
    render?: (item: T, index: number) => React.ReactNode;
    accessor?: (item: T) => string | number | boolean | null | undefined;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }>;
  isLoading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  keyAccessor: (item: T) => string;
  searchFilter?: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
  showSearch?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  rowActions?: (item: T) => React.ReactNode;
  className?: string;
  skeletonRows?: number;
  selectedKeys?: Set<string>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());
  
  const selectedKeys = externalSelectedKeys ?? internalSelectedKeys;
  const setSelectedKeys = externalSelectedKeys ? () => {} : setInternalSelectedKeys;
  
  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];
    
    if (searchFilter && searchQuery.trim()) {
      result = result.filter((item) => searchFilter(item, searchQuery.trim().toLowerCase()));
    }
    
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
  
  const handleSort = (columnKey: string) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column?.sortable) return;
    
    if (sortColumn === columnKey) {
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
  
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-indigo-600" />
      : <ArrowDown className="w-4 h-4 text-indigo-600" />;
  };
  
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
        {showSearch && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <Skeleton className="w-64 h-10" />
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && <TableHead className="w-12" />}
                {columns.map((col) => (
                  <TableHead key={col.key}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
                {rowActions && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, idx) => (
                <TableRow key={idx}>
                  {selectable && (
                    <TableCell>
                      <Skeleton className="w-4 h-4" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton className="w-8 h-8 rounded" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {showSearch && searchFilter && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10"
            />
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedKeys.size === processedData.length && processedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(col.key)}
                      className="h-auto p-0 font-semibold text-xs uppercase tracking-wider text-gray-700 hover:text-gray-900"
                    >
                      {col.header}
                      {getSortIcon(col.key)}
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {col.header}
                    </span>
                  )}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead className="w-24 text-right">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="h-64 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    {emptyIcon || (
                      <div className="w-12 h-12 text-gray-300 mb-4">
                        <Search className="w-full h-full" />
                      </div>
                    )}
                    <p className="text-gray-600 text-sm font-medium">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              processedData.map((item, index) => {
                const key = keyAccessor(item);
                const isSelected = selectedKeys.has(key);
                
                return (
                  <TableRow
                    key={key}
                    onClick={() => onRowClick?.(item, index)}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-indigo-50'
                    )}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(item)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-sm text-gray-900',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(item)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
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
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          
          {pagination.totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={pagination.page === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

