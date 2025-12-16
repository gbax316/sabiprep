'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NavigationDrawer } from './NavigationDrawer';
import {
  Menu,
  Bell,
  ArrowLeft,
  GraduationCap,
  Search,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  backHref?: string;
  transparent?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  backHref,
  transparent = false,
  className,
  actions,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Determine if we're on a page that needs a back button
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const isSubPage = pathSegments.length > 1;
  const shouldShowBack = showBack || isSubPage;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      window.location.href = backHref;
    } else {
      window.history.back();
    }
  };

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30',
          transparent 
            ? 'bg-transparent' 
            : 'bg-white/95 backdrop-blur-md border-b border-slate-100',
          className
        )}
      >
        <div className="container-app">
          <div className="flex items-center justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-3">
              {shouldShowBack ? (
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              ) : (
                <Link href="/home" className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary-500/20">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-lg text-slate-900 hidden sm:block">
                    SabiPrep
                  </span>
                </Link>
              )}

              {/* Title */}
              {title && (
                <div className="flex flex-col">
                  <h1 className="font-display font-bold text-lg text-slate-900 leading-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs text-slate-500">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {actions}

              {/* Search button (visible on larger screens) */}
              <button
                className="hidden sm:flex p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-600" />
              </button>

              {/* Notifications */}
              <button
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              </button>

              {/* Menu button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default Header;
