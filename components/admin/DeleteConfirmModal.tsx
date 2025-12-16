'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common';
import { AlertTriangle, Trash2, Archive, X } from 'lucide-react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (archive?: boolean) => Promise<void>;
  title: string;
  itemName: string;
  itemType: 'subject' | 'topic';
  canDelete: boolean;
  canArchive: boolean;
  counts?: {
    topicCount?: number;
    questionCount?: number;
  };
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  canDelete,
  canArchive,
  counts,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (archive: boolean) => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(archive);
      onClose();
    } catch (err) {
      console.error('Error performing action:', err);
      setError('Failed to complete the action. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAssociatedContent = (counts?.topicCount || 0) > 0 || (counts?.questionCount || 0) > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Warning Icon and Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {canDelete ? 'Confirm Deletion' : 'Cannot Delete'}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {canDelete 
                ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
                : `"${itemName}" cannot be deleted because it has associated content.`
              }
            </p>
          </div>
        </div>

        {/* Associated Content Warning */}
        {hasAssociatedContent && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Associated Content
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {(counts?.topicCount || 0) > 0 && (
                <li>• {counts?.topicCount} topic{counts?.topicCount !== 1 ? 's' : ''}</li>
              )}
              {(counts?.questionCount || 0) > 0 && (
                <li>• {counts?.questionCount} question{counts?.questionCount !== 1 ? 's' : ''}</li>
              )}
            </ul>
            {canArchive && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                You can archive this {itemType} instead, which will hide it from users but preserve the data.
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            disabled={isDeleting}
          >
            <span className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </span>
          </button>

          {canArchive && (
            <button
              type="button"
              onClick={() => handleAction(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isDeleting}
            >
              <span className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                {isDeleting ? 'Archiving...' : 'Archive Instead'}
              </span>
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => handleAction(false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isDeleting}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;
