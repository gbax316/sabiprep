'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Admin Dialog Component
 * Wrapper around shadcn Dialog with admin-specific styling
 */
export const AdminDialog = Dialog;

export const AdminDialogTrigger = DialogTrigger;

export const AdminDialogClose = DialogClose;

export interface AdminDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const AdminDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  AdminDialogContentProps
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  // shadcn DialogContent automatically uses CSS variables from admin-theme class
  return (
    <DialogContent
      ref={ref}
      className={cn(sizeClasses[size], className)}
      {...props}
    />
  );
});
AdminDialogContent.displayName = 'AdminDialogContent';

export const AdminDialogHeader = DialogHeader;

export const AdminDialogFooter = DialogFooter;

export const AdminDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogTitle>,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
  <DialogTitle
    ref={ref}
    className={className}
    {...props}
  />
));
AdminDialogTitle.displayName = 'AdminDialogTitle';

export const AdminDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogDescription>,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
  <DialogDescription
    ref={ref}
    className={className}
    {...props}
  />
));
AdminDialogDescription.displayName = 'AdminDialogDescription';

