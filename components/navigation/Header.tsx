'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NavigationDrawer } from './NavigationDrawer';
import { useAuth } from '@/lib/auth-context';
import {
  Menu,
  ArrowLeft,
  GraduationCap,
  Search,
  User,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/common/NotificationDropdown';

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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, userId } = useAuth();

  // Track scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          'sticky top-0 z-30 transition-all duration-300',
          transparent
            ? 'bg-transparent'
            : 'bg-black/60 backdrop-blur-xl border-b border-white/5',
          scrolled && !transparent && 'shadow-lg shadow-black/20',
          className
        )}
      >
        <div className="container-app">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left section */}
            <div className="flex items-center gap-3">
              {shouldShowBack ? (
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-all hover:scale-105 active:scale-95"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
              ) : (
                <Link href="/home" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:shadow-cyan-500/50 transition-all group-hover:scale-110">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-lg bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent hidden sm:block">
                    SabiPrep
                  </span>
                </Link>
              )}

              {/* Title */}
              {title && (
                <div className="flex flex-col">
                  <h1 className="font-display font-bold text-lg text-white leading-tight">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs text-slate-400">{subtitle}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {actions}

              {/* Search button (visible on larger screens) */}
              <button
                className="hidden sm:flex p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-105 active:scale-95"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-300" />
              </button>

              {/* Notifications */}
              {userId && (
                <NotificationDropdown userId={userId} />
              )}

              {/* Profile Avatar */}
              {user && (
                <Link
                  href="/profile"
                  className="hidden sm:flex w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 items-center justify-center text-white text-sm font-bold border-2 border-primary/20 hover:border-cyan-500/50 transition-all hover:scale-110 shadow-lg shadow-cyan-500/30"
                  aria-label="Profile"
                >
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </Link>
              )}

              {/* Menu button - Always visible */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white/5"
                aria-label="Open menu"
                type="button"
              >
                <Menu className="w-5 h-5 text-white" />
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
