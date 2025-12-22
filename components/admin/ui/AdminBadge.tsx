'use client';

import * as React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Admin Badge Component
 * Wrapper around shadcn Badge with admin-specific status variants
 */
export interface AdminBadgeProps extends BadgeProps {
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default';
}

export const AdminBadge = ({ className, status = 'default', variant, ...props }: AdminBadgeProps) => {
  // Map status to variant and colors
  const statusClasses = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    error: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    pending: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
    default: '',
  };

  return (
    <Badge
      variant={variant || (status === 'default' ? 'default' : 'outline')}
      className={cn(
        status !== 'default' && statusClasses[status],
        // Override with shadcn theme if using default variant
        status === 'default' && variant === 'default' && 'bg-shadcn-primary text-shadcn-primary-foreground',
        status === 'default' && variant === 'secondary' && 'bg-shadcn-secondary text-shadcn-secondary-foreground',
        status === 'default' && variant === 'destructive' && 'bg-shadcn-destructive text-shadcn-destructive-foreground',
        className
      )}
      {...props}
    />
  );
};

