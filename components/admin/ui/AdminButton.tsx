'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Admin Button Component
 * Wrapper around shadcn Button with admin-specific styling
 * Supports href prop for navigation
 */
export interface AdminButtonProps extends ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  href?: string;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant = 'default', href, ...props }, ref) => {
    // shadcn Button automatically uses CSS variables from admin-theme class
    if (href) {
      return (
        <Button
          variant={variant}
          className={className}
          asChild
          {...props}
        >
          <Link href={href}>{props.children}</Link>
        </Button>
      );
    }
    
    return (
      <Button
        ref={ref}
        variant={variant}
        className={className}
        {...props}
      />
    );
  }
);

AdminButton.displayName = 'AdminButton';

// Convenience exports for common button types
export const AdminPrimaryButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  (props, ref) => <AdminButton ref={ref} variant="default" {...props} />
);
AdminPrimaryButton.displayName = 'AdminPrimaryButton';

export const AdminSecondaryButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  (props, ref) => <AdminButton ref={ref} variant="secondary" {...props} />
);
AdminSecondaryButton.displayName = 'AdminSecondaryButton';

