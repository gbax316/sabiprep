'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface BatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: {
    id: string;
    filename: string;
    successful_rows: number;
  } | null;
  onDelete: (deleteQuestions: boolean) => Promise<void>;
}

export function BatchDeleteModal({
  isOpen,
  onClose,
  batch,
  onDelete,
}: BatchDeleteModalProps) {
  const [deleteQuestions, setDeleteQuestions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(deleteQuestions);
      onClose();
      setConfirmText('');
      setDeleteQuestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete batch');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText('');
    setDeleteQuestions(false);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Import Batch"
      size="md"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                This action cannot be undone
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You are about to delete the import batch <strong>{batch?.filename}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Batch Info */}
        {batch && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Filename:</strong> {batch.filename}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Questions imported:</strong> {batch.successful_rows}
            </p>
          </div>
        )}

        {/* Delete Questions Option */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteQuestions}
              onChange={(e) => setDeleteQuestions(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Also delete all questions from this batch
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {deleteQuestions ? (
                  <span className="text-red-600 dark:text-red-400">
                    ⚠️ All {batch?.successful_rows || 0} questions will be permanently deleted.
                  </span>
                ) : (
                  <span>
                    Questions will be kept but unlinked from this batch. They will remain in the database.
                  </span>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Confirmation Input */}
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            type="text"
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'DELETE'}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Batch'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BatchDeleteModal;
