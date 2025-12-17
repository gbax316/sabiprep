'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, BookOpen, Brain, TrendingUp, User } from 'lucide-react';
import { motion } from 'framer-motion';

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
    label: 'Explore',
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    href: '/quick-practice',
    label: 'Learn',
    icon: <Brain className="w-6 h-6" />,
  },
  {
    href: '/analytics',
    label: 'Progress',
    icon: <TrendingUp className="w-6 h-6" />,
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
    if (!pathname) return false;
    if (href === '/home') {
      return pathname === '/' || pathname === '/home';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-black/60 backdrop-blur-xl border-t border-white/10',
        'rounded-t-2xl',
        className
      )}
    >
      <div className="h-16 px-4 flex items-center justify-around max-w-lg mx-auto safe-area-inset-bottom">
        {items.map((item, index) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-300',
                active
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300 active:scale-95'
              )}
            >
              {/* Active indicator with animation */}
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 h-1 w-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
              
              {/* Icon with glow on active */}
              <span className={cn(
                'transition-all duration-300',
                active && 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
              )}>
                {item.icon}
              </span>
              
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium transition-all duration-300',
                  active && 'font-semibold'
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
