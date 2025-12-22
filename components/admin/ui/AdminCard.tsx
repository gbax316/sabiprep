'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Admin Card Component
 * Wrapper around shadcn Card with admin-specific styling
 */
export interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined';
}

export const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    // shadcn Card automatically uses CSS variables from admin-theme class
    return (
      <Card
        ref={ref}
        className={cn(
          variant === 'outlined' && 'border-2',
          className
        )}
        {...props}
      />
    );
  }
);

AdminCard.displayName = 'AdminCard';

// Re-export card sub-components with admin styling
export const AdminCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <CardHeader
    ref={ref}
    className={className}
    {...props}
  />
));
AdminCardHeader.displayName = 'AdminCardHeader';

export const AdminCardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <CardTitle
    ref={ref}
    className={className}
    {...props}
  />
));
AdminCardTitle.displayName = 'AdminCardTitle';

export const AdminCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <CardDescription
    ref={ref}
    className={className}
    {...props}
  />
));
AdminCardDescription.displayName = 'AdminCardDescription';

export const AdminCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <CardContent
    ref={ref}
    className={className}
    {...props}
  />
));
AdminCardContent.displayName = 'AdminCardContent';

export const AdminCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <CardFooter
    ref={ref}
    className={className}
    {...props}
  />
));
AdminCardFooter.displayName = 'AdminCardFooter';

