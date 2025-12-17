'use client';

import { ReactNode } from 'react';

interface MagicBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * MagicBadge - Pill-shaped tags for categories, status, difficulty
 * 
 * @param children - Badge content
 * @param variant - Badge color variant (default: 'default')
 * @param size - Badge size (default: 'md')
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <MagicBadge variant="success" size="sm">
 *   Completed
 * </MagicBadge>
 * ```
 */
export function MagicBadge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: MagicBadgeProps) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accent: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-all ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}