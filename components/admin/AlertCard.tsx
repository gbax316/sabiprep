'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error';

/**
 * AlertCard Props
 */
export interface AlertCardProps {
  /** Unique identifier for the alert */
  id: string;
  /** Severity level of the alert */
  severity: AlertSeverity;
  /** Alert message */
  message: string;
  /** Optional action URL */
  actionUrl?: string;
  /** Optional action label (defaults to "View Details") */
  actionLabel?: string;
  /** Callback when dismiss button is clicked */
  onDismiss?: (id: string) => void;
  /** Whether the alert is dismissible */
  dismissible?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Timestamp for the alert */
  timestamp?: string;
}

/**
 * Get color classes based on severity
 */
function getSeverityClasses(severity: AlertSeverity): {
  bg: string;
  border: string;
  icon: string;
  text: string;
  button: string;
} {
  const severities: Record<AlertSeverity, {
    bg: string;
    border: string;
    icon: string;
    text: string;
    button: string;
  }> = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-800',
      button: 'text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      text: 'text-amber-800',
      button: 'text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      text: 'text-red-800',
      button: 'text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200',
    },
  };
  
  return severities[severity];
}

/**
 * Get icon based on severity
 */
function getSeverityIcon(severity: AlertSeverity): React.ReactNode {
  const icons: Record<AlertSeverity, React.ReactNode> = {
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  return icons[severity];
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * AlertCard Component
 * Displays a system alert with severity level, action button, and dismiss functionality
 */
export function AlertCard({
  id,
  severity,
  message,
  actionUrl,
  actionLabel = 'View Details',
  onDismiss,
  dismissible = true,
  className = '',
  timestamp,
}: AlertCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const colors = getSeverityClasses(severity);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(id);
  };
  
  if (isDismissed) {
    return null;
  }
  
  return (
    <div 
      className={`${colors.bg} ${colors.border} border rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
          {getSeverityIcon(severity)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colors.text}`}>
            {message}
          </p>
          
          {/* Timestamp */}
          {timestamp && (
            <p className="text-xs text-gray-500 mt-1">
              {formatTimestamp(timestamp)}
            </p>
          )}
          
          {/* Action Button */}
          {actionUrl && (
            <div className="mt-3">
              <Link
                href={actionUrl}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${colors.button}`}
              >
                {actionLabel}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
        
        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AlertList Component
 * Displays a list of alerts with empty state
 */
export interface AlertListProps {
  /** Array of alerts to display */
  alerts: Array<{
    id: string;
    type: AlertSeverity;
    message: string;
    action?: string;
    createdAt: string;
  }>;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when an alert is dismissed */
  onDismiss?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export function AlertList({ 
  alerts, 
  isLoading = false, 
  onDismiss, 
  className = '' 
}: AlertListProps) {
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (alerts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">All Clear!</h3>
        <p className="text-sm text-gray-500">No system alerts at the moment.</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          id={alert.id}
          severity={alert.type}
          message={alert.message}
          actionUrl={alert.action}
          timestamp={alert.createdAt}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export default AlertCard;
