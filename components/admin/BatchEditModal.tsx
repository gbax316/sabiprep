'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common';
import { XCircle, CheckCircle, Clock, FileText } from 'lucide-react';

export interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: {
    id: string;
    filename: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
  } | null;
  onSave: (data: { filename: string; status?: string }) => Promise<void>;
}

export function BatchEditModal({
  isOpen,
  onClose,
  batch,
  onSave,
}: BatchEditModalProps) {
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('completed');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batch) {
      setFilename(batch.filename);
      setStatus(batch.status);
    }
  }, [batch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave({ filename, status });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update batch');
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
    { value: 'processing', label: 'Processing', icon: Clock, color: 'text-blue-600' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600' },
    { value: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Import Batch"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Filename */}
        <div>
          <label htmlFor="filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filename
          </label>
          <input
            type="text"
            id="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This is for reference only and doesn't affect the actual file.
          </p>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Batch Stats (Read-only) */}
        {batch && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4" />
              <span>Total Rows: {batch.total_rows}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Successful: {batch.successful_rows}</span>
            </div>
            {batch.failed_rows > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                <span>Failed: {batch.failed_rows}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default BatchEditModal;
