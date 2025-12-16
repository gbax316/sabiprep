'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-indigo-100 text-indigo-600',
  secondary: 'bg-purple-100 text-purple-600',
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
  error: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-600',
  neutral: 'bg-gray-100 text-gray-600',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1',
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
        'inline-flex items-center font-medium rounded-full',
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
        variantStyles[variant],
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
