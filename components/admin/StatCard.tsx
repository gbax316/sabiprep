'use client';

import React from 'react';

/**
 * Color variants for the StatCard
 */
export type StatCardVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * StatCard Props
 */
export interface StatCardProps {
  /** Label displayed above the value */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Optional change percentage (positive or negative) */
  change?: number;
  /** Optional change label (e.g., "vs last month") */
  changeLabel?: string;
  /** Color variant */
  variant?: StatCardVariant;
  /** Loading state */
  isLoading?: boolean;
  /** Optional subtitle text */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color classes based on variant
 */
function getVariantClasses(variant: StatCardVariant): {
  bg: string;
  icon: string;
  text: string;
} {
  const variants: Record<StatCardVariant, { bg: string; icon: string; text: string }> = {
    primary: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      text: 'text-blue-600',
    },
    success: {
      bg: 'bg-emerald-100',
      icon: 'text-emerald-600',
      text: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-100',
      icon: 'text-amber-600',
      text: 'text-amber-600',
    },
    danger: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      text: 'text-red-600',
    },
    info: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      text: 'text-purple-600',
    },
  };
  
  return variants[variant];
}

/**
 * StatCard Component
 * Displays a statistic with label, value, icon, and optional change percentage
 */
export function StatCard({
  label,
  value,
  icon,
  change,
  changeLabel,
  variant = 'primary',
  isLoading = false,
  subtitle,
  className = '',
}: StatCardProps) {
  const colors = getVariantClasses(variant);
  
  // Determine change indicator
  const hasChange = change !== undefined;
  const isPositive = change !== undefined && change >= 0;
  
  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Label skeleton */}
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            {/* Value skeleton */}
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Icon skeleton */}
          <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        {/* Subtitle skeleton */}
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <div className={colors.icon}>{icon}</div>
          </div>
        )}
      </div>
      
      {/* Change indicator or subtitle */}
      <div className="mt-2 flex items-center gap-2">
        {hasChange && (
          <>
            <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change}%
            </span>
            {changeLabel && (
              <span className="text-sm text-gray-400">{changeLabel}</span>
            )}
          </>
        )}
        {!hasChange && subtitle && (
          <span className="text-sm text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Default Icons for common stat types
 */
export const StatIcons = {
  users: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  questions: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sessions: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  subjects: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  check: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clock: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  upload: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
};

export default StatCard;
