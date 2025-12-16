'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ValidationResultsTableProps {
  errors: ValidationError[];
  className?: string;
}

export function ValidationResultsTable({ errors, className = '' }: ValidationResultsTableProps) {
  const [sortBy, setSortBy] = useState<'row' | 'field'>('row');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Sort and filter errors
  const displayedErrors = useMemo(() => {
    let filtered = errors;

    // Apply search filter
    if (searchTerm) {
      filtered = errors.filter(error =>
        error.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.row.toString().includes(searchTerm)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'row') {
        comparison = a.row - b.row;
      } else {
        comparison = a.field.localeCompare(b.field);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [errors, sortBy, sortOrder, searchTerm]);

  const toggleSort = (column: 'row' | 'field') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: 'row' | 'field' }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-semibold">
            {displayedErrors.length} Validation Error{displayedErrors.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => toggleSort('row')}
              >
                Row #
                <SortIcon column="row" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => toggleSort('field')}
              >
                Field
                <SortIcon column="field" />
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Issue
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {displayedErrors.map((error, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {error.row}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded font-mono text-xs">
                    {error.field}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error.message}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                  {error.value !== null && error.value !== undefined 
                    ? String(error.value) 
                    : <span className="italic text-gray-400">empty</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searchTerm && displayedErrors.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No errors match your search
        </div>
      )}
    </div>
  );
}
