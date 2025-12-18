'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  secondary: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  success: 'bg-indigo-600 dark:bg-indigo-600 text-white dark:text-white',
  warning: 'bg-indigo-100 dark:bg-indigo-900/40 text-white dark:text-white',
  error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  info: 'bg-blue-600 dark:bg-blue-700 text-white dark:text-blue-100',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function Badge({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-lg',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export interface IconBadgeProps {
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconBadgeSizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconBadgeIconSizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const iconBadgeVariantStyles = {
  primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  secondary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

export function IconBadge({
  icon,
  variant = 'primary',
  size = 'md',
  className,
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl',
        iconBadgeVariantStyles[variant],
        iconBadgeSizeStyles[size],
        className
      )}
    >
      <span className={iconBadgeIconSizeStyles[size]}>{icon}</span>
    </div>
  );
}

export interface NotificationBadgeProps {
  count?: number;
  max?: number;
  showZero?: boolean;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function NotificationBadge({
  count = 0,
  max = 99,
  showZero = false,
  dot = false,
  className,
  children,
}: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  const showBadge = dot || count > 0 || showZero;

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      {showBadge && (
        <span
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white',
            dot
              ? 'w-3 h-3 rounded-full'
              : 'min-w-[1.25rem] h-5 px-1 text-xs font-bold rounded-full'
          )}
        >
          {!dot && displayCount}
        </span>
      )}
    </div>
  );
}

export default Badge;
