'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, BookOpen, BarChart3, User } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const defaultNavItems: NavItem[] = [
  {
    href: '/home',
    label: 'Home',
    icon: <Home className="w-6 h-6" />,
  },
  {
    href: '/subjects',
    label: 'Learn',
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    href: '/analytics',
    label: 'Stats',
    icon: <BarChart3 className="w-6 h-6" />,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: <User className="w-6 h-6" />,
  },
];

export interface BottomNavProps {
  items?: NavItem[];
  className?: string;
}

export function BottomNav({ items = defaultNavItems, className }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/' || pathname === '/home';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100',
        'px-6 py-3 z-40',
        className
      )}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center transition-colors',
                active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {item.icon}
              <span
                className={cn(
                  'text-xs mt-1',
                  active && 'font-medium'
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
        'flex flex-col items-center transition-colors',
        isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
      )}
    >
      {icon}
      <span className={cn('text-xs mt-1', isActive && 'font-medium')}>
        {label}
      </span>
    </button>
  );
}

export default BottomNav;
