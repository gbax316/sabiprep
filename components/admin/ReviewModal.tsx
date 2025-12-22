'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/common';
import { AdminPrimaryButton, AdminSecondaryButton } from '@/components/admin';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { QuestionReview, Question } from '@/types/database';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: QuestionReview;
  question: Question;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

/**
 * Review Modal Component
 */
export function ReviewModal({
  isOpen,
  onClose,
  review,
  question,
  onApprove,
  onReject,
}: ReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'hints' | 'solution' | 'explanation'>('hints');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this review?')) {
      return;
    }
    try {
      setApproving(true);
      await onApprove();
      onClose();
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (!confirm('Are you sure you want to reject this review?')) {
      return;
    }
    try {
      setRejecting(true);
      await onReject(rejectionReason.trim());
      onClose();
      setRejectionReason('');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Details" size="lg">
      <div className="space-y-6">
        {/* Question Preview */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Question</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {question.question_text}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('hints')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'hints'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              Hints
            </button>
            <button
              onClick={() => setActiveTab('solution')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'solution'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              Solution
            </button>
            <button
              onClick={() => setActiveTab('explanation')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'explanation'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              Explanation
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'hints' && (
            <div className="space-y-4">
              {[1, 2, 3].map((level) => {
                const currentHint = question[`hint${level}` as keyof Question] as string | undefined;
                const proposedHint = review[`proposed_hint${level}` as keyof QuestionReview] as string | undefined;
                
                return (
                  <div key={level} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Hint {level}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                          {currentHint || <span className="text-gray-400 italic">No hint</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Proposed</div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                          {proposedHint || <span className="text-gray-400 italic">No hint</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'solution' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current</div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {question.solution || <span className="text-gray-400 italic">No solution</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Proposed</div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {review.proposed_solution || <span className="text-gray-400 italic">No solution</span>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'explanation' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current</div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {question.explanation || <span className="text-gray-400 italic">No explanation</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Proposed</div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {review.proposed_explanation || <span className="text-gray-400 italic">No explanation</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason (if rejecting)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Provide a reason for rejection"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-end gap-4">
            <AdminSecondaryButton onClick={onClose}>Cancel</AdminSecondaryButton>
            <AdminSecondaryButton
              onClick={handleReject}
              disabled={rejecting}
              className="flex items-center gap-2"
            >
              {rejecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Reject
                </>
              )}
            </AdminSecondaryButton>
            <AdminPrimaryButton
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {approving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </>
              )}
            </AdminPrimaryButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

