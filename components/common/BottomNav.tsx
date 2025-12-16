'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, BookOpen, Zap, BarChart3, User } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const defaultNavItems: NavItem[] = [
  {
    href: '/home',
    label: 'Home',
    icon: <Home className="w-5 h-5" />,
  },
  {
    href: '/subjects',
    label: 'Subjects',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    href: '/quick-practice',
    label: 'Practice',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    href: '/analytics',
    label: 'Progress',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
  },
];

export interface BottomNavProps {
  items?: NavItem[];
  className?: string;
}

export function BottomNav({ items = defaultNavItems, className }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/home') {
      return pathname === '/' || pathname === '/home';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0',
        'bg-white/95 backdrop-blur-md',
        'border-t border-slate-100',
        'z-40 pb-safe',
        className
      )}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center py-2 px-4 rounded-xl transition-all',
                active 
                  ? 'text-primary-600' 
                  : 'text-slate-400 hover:text-slate-600 active:scale-95'
              )}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full" />
              )}
              
              <span className={cn(
                'transition-transform',
                active && 'scale-110'
              )}>
                {item.icon}
              </span>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium',
                  active && 'text-primary-600'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function NavButton({ icon, label, isActive = false, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center py-2 px-3 rounded-xl transition-all',
        isActive 
          ? 'text-primary-600' 
          : 'text-slate-400 hover:text-slate-600'
      )}
    >
      {icon}
      <span className={cn('text-[10px] mt-1 font-medium')}>
        {label}
      </span>
    </button>
  );
}

export default BottomNav;
