'use client';

import React, { useState } from 'react';
import { CheckCircle, Archive, Trash2, FileText, X, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common';

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: 'publish' | 'archive' | 'draft' | 'delete') => Promise<void>;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  onAction,
  onClear,
}: BulkActionBarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'publish' | 'archive' | 'draft' | 'delete') => {
    if (action === 'delete') {
      setShowDeleteConfirm(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onAction(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onAction('delete');
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-900 dark:bg-gray-800 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-medium">
              {selectedCount}
            </span>
            <span className="text-sm">selected</span>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          {error && (
            <span className="text-red-400 text-sm">{error}</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('publish')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Publish
            </button>
            <button
              onClick={() => handleAction('draft')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Draft
            </button>
            <button
              onClick={() => handleAction('archive')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={() => handleAction('delete')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          <button
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Questions"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You are about to permanently delete {selectedCount} question{selectedCount !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isLoading ? 'Deleting...' : 'Delete Questions'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default BulkActionBar;
