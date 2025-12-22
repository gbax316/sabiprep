'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/common';
import { CheckCircle2, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import type { QuestionReview } from '@/types/database';

interface ReviewCardProps {
  review: QuestionReview & {
    question?: {
      id: string;
      question_text: string;
    };
    reviewer?: {
      full_name: string;
    };
  };
}

/**
 * Get status badge
 */
function getStatusBadge(status: QuestionReview['status']) {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        icon: <Clock className="w-4 h-4" />,
        text: 'Pending',
      };
    case 'approved':
      return {
        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        icon: <CheckCircle2 className="w-4 h-4" />,
        text: 'Approved',
      };
    case 'rejected':
      return {
        bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Rejected',
      };
    case 'failed':
      return {
        bg: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Failed',
      };
  }
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Review Card Component
 */
export function ReviewCard({ review }: ReviewCardProps) {
  const statusBadge = getStatusBadge(review.status);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg}`}>
              {statusBadge.icon}
              {statusBadge.text}
            </span>
            {review.model_used && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {review.model_used}
              </span>
            )}
          </div>
          {review.question && (
            <p className="text-sm text-gray-900 dark:text-white line-clamp-2 mb-2">
              {review.question.question_text}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div>
          {review.reviewer && (
            <span>Reviewed by {review.reviewer.full_name}</span>
          )}
        </div>
        <div>
          {formatDate(review.created_at)}
        </div>
      </div>

      {review.status === 'pending' && review.question && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={`/admin/review/${review.question.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <Eye className="w-4 h-4" />
            View & Approve
          </Link>
        </div>
      )}

      {review.error_message && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-red-600 dark:text-red-400">
            Error: {review.error_message}
          </p>
        </div>
      )}
    </Card>
  );
}

