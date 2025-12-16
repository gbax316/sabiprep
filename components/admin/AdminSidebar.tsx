'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation item definition
 */
export interface NavItem {
  /** Display name */
  name: string;
  /** Route href */
  href: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Whether this item is admin-only (hidden from tutors) */
  adminOnly?: boolean;
  /** Optional badge count */
  badge?: number;
}

/**
 * User info for sidebar footer
 */
export interface SidebarUserInfo {
  fullName: string;
  email: string;
  role: 'admin' | 'tutor';
  avatarUrl?: string;
}

/**
 * AdminSidebar Props
 */
export interface AdminSidebarProps {
  /** Whether the sidebar is open (mobile) */
  isOpen: boolean;
  /** Callback to close the sidebar */
  onClose: () => void;
  /** Navigation items */
  navItems: NavItem[];
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** User info for the footer */
  userInfo?: SidebarUserInfo;
  /** Sign out callback */
  onSignOut?: () => void;
  /** App name */
  appName?: string;
  /** App subtitle */
  appSubtitle?: string;
}

/**
 * Default navigation items for admin portal
 */
export const defaultAdminNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Questions',
    href: '/admin/questions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Import',
    href: '/admin/import',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    adminOnly: true,
  },
];

/**
 * AdminSidebar Component
 * Collapsible sidebar navigation for admin portal
 */
export function AdminSidebar({
  isOpen,
  onClose,
  navItems = defaultAdminNavItems,
  isAdmin,
  userInfo,
  onSignOut,
  appName = 'SabiPrep',
  appSubtitle = 'Admin Portal',
}: AdminSidebarProps) {
  const pathname = usePathname();
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{appName}</h1>
            <p className="text-xs text-gray-400">{appSubtitle}</p>
          </div>
          
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1 text-gray-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-1 overflow-y-auto h-[calc(100vh-200px)]">
          {navItems.map((item) => {
            // Hide admin-only items from tutors
            if (item.adminOnly && !isAdmin) {
              return null;
            }

            const isActive = pathname?.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative
                  ${isActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-4 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {userInfo && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              {userInfo.avatarUrl ? (
                <img
                  src={userInfo.avatarUrl}
                  alt={userInfo.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {userInfo.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userInfo.fullName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {userInfo.email}
                </p>
              </div>
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${userInfo.role === 'admin' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}
              `}>
                {userInfo.role}
              </span>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminSidebar;
