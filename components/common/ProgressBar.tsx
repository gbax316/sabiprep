'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  labelPosition?: 'right' | 'inside' | 'top';
  animated?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const colorStyles = {
  primary: 'bg-indigo-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  labelPosition = 'right',
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  if (labelPosition === 'top' && showLabel) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-600">{Math.round(percentage)}%</span>
        </div>
        <div className={cn('w-full bg-gray-100 rounded-full', sizeStyles[size])}>
          <div
            className={cn(
              'rounded-full transition-all duration-300',
              sizeStyles[size],
              colorStyles[color],
              animated && 'animate-pulse'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', showLabel && 'space-x-3', className)}>
      <div className={cn('flex-1 bg-gray-100 rounded-full', sizeStyles[size])}>
        <div
          className={cn(
            'rounded-full transition-all duration-300',
            sizeStyles[size],
            colorStyles[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && labelPosition === 'right' && (
        <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'white';
  showLabel?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const circularColorStyles = {
  primary: 'stroke-indigo-600',
  success: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  error: 'stroke-red-500',
  info: 'stroke-blue-500',
  white: 'stroke-white',
};

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  color = 'primary',
  showLabel = false,
  className,
  children,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-300', circularColorStyles[color])}
        />
      </svg>
      {(showLabel || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-sm font-bold text-gray-900">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
