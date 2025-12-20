'use client';

import { CheckCircle, XCircle, Clock, FileText, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface ImportReportCardProps {
  report: {
    id: string;
    filename: string;
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
    completed_at?: string;
    admin?: {
      full_name: string;
      email: string;
    };
  };
  className?: string;
  onEdit?: (reportId: string) => void;
  onDelete?: (reportId: string) => void;
}

export function ImportReportCard({ report, className = '', onEdit, onDelete }: ImportReportCardProps) {
  const statusConfig = {
    pending: { color: 'yellow', icon: Clock, text: 'Pending' },
    processing: { color: 'blue', icon: Clock, text: 'Processing' },
    completed: { color: 'green', icon: CheckCircle, text: 'Completed' },
    failed: { color: 'red', icon: XCircle, text: 'Failed' }
  };

  const config = statusConfig[report.status];
  const StatusIcon = config.icon;
  
  const successRate = report.total_rows > 0 
    ? Math.round((report.successful_rows / report.total_rows) * 100) 
    : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = () => {
    if (!report.completed_at) return null;
    const start = new Date(report.created_at);
    const end = new Date(report.completed_at);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
      hover:shadow-lg transition-shadow duration-200 p-6 relative
      ${className}
    `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-lg
              ${config.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' : ''}
              ${config.color === 'red' ? 'bg-red-100 dark:bg-red-900/20' : ''}
              ${config.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' : ''}
              ${config.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''}
            `}>
              <FileText className={`
                w-5 h-5
                ${config.color === 'green' ? 'text-green-600 dark:text-green-400' : ''}
                ${config.color === 'red' ? 'text-red-600 dark:text-red-400' : ''}
                ${config.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : ''}
                ${config.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : ''}
              `} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
                {report.filename}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(report.created_at)}
              </p>
            </div>
          </div>
          
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1
            ${config.color === 'green' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : ''}
            ${config.color === 'red' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' : ''}
            ${config.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' : ''}
            ${config.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' : ''}
          `}>
            <StatusIcon className="w-4 h-4" />
            <span>{config.text}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {report.total_rows}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Rows
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {report.successful_rows}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Successful
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {report.failed_rows}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Failed
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {report.status === 'completed' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Success Rate</span>
              <span>{successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
          <span>
            {report.admin ? report.admin.full_name : 'Unknown Admin'}
          </span>
          {formatDuration() && (
            <span>Duration: {formatDuration()}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            href={`/admin/import/history/${report.id}`}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {onEdit && (
            <button
              onClick={(e) => handleActionClick(e, () => onEdit(report.id))}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit Batch"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => handleActionClick(e, () => onDelete(report.id))}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete Batch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
  );
}
