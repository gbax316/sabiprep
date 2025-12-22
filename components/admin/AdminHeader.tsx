'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * AdminHeader Props
 */
export interface AdminHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional action buttons slot */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AdminHeader Component
 * Page header with title, subtitle, breadcrumbs, and action buttons
 * Clean, light design with indigo accents
 */
export function AdminHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
}: AdminHeaderProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      {/* Header content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AdminPageWrapper Component
 * A wrapper component for admin pages that includes the header
 */
export interface AdminPageWrapperProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional action buttons slot */
  actions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

export function AdminPageWrapper({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className = '',
}: AdminPageWrapperProps) {
  return (
    <div className={className}>
      <AdminHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      {children}
    </div>
  );
}

// Note: AdminPrimaryButton and AdminSecondaryButton have been moved to components/admin/ui/AdminButton.tsx
// They are now shadcn-based components. Import them from '@/components/admin' or '@/components/admin/ui'

/**
 * Danger button for destructive actions
 */
export function AdminDangerButton({
  children,
  onClick,
  href,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
}) {
  const baseClasses = `
    inline-flex items-center gap-2 px-4 py-2.5
    bg-red-600 hover:bg-red-700 
    text-white text-sm font-semibold 
    rounded-lg transition-all duration-200
    shadow-sm hover:shadow
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `.trim();
  
  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses}>
      {children}
    </button>
  );
}

/**
 * Success button for positive actions
 */
export function AdminSuccessButton({
  children,
  onClick,
  href,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
}) {
  const baseClasses = `
    inline-flex items-center gap-2 px-4 py-2.5
    bg-emerald-600 hover:bg-emerald-700 
    text-white text-sm font-semibold 
    rounded-lg transition-all duration-200
    shadow-sm hover:shadow
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `.trim();
  
  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses}>
      {children}
    </button>
  );
}

export default AdminHeader;
