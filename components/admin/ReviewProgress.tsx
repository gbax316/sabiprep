'use client';

import React from 'react';
import { Card } from '@/components/common';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ReviewProgressProps {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentQuestion?: string;
}

/**
 * Review Progress Component
 */
export function ReviewProgress({
  total,
  completed,
  successful,
  failed,
  currentQuestion,
}: ReviewProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Batch Review Progress
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completed} / {total}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {percentage}% complete • {remaining} remaining
        </div>
      </div>

      {currentQuestion && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Currently reviewing: {currentQuestion}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-2xl font-bold">{successful}</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Successful</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 mb-1">
            <XCircle className="w-5 h-5" />
            <span className="text-2xl font-bold">{failed}</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
            <Clock className="w-5 h-5" />
            <span className="text-2xl font-bold">{remaining}</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
        </div>
      </div>
    </Card>
  );
}

