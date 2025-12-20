'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { navigationSections, type NavItem } from '@/lib/navigation-config';
import {
  X,
  LogOut,
  GraduationCap,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ isOpen, onClose }: NavigationDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      // Unlock body scroll
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/login');
  };

  const isActive = useCallback((href?: string) => {
    if (!href) return false;
    return pathname === href || pathname?.startsWith(`${href}/`);
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isExpanded = (label: string) => expandedItems.has(label);

  const hasActiveChild = useCallback((children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.href));
  }, [isActive]);

  // Auto-expand menu items with active children
  useEffect(() => {
    navigationSections.forEach(section => {
      section.items.forEach(item => {
        if (item.children && hasActiveChild(item.children)) {
          setExpandedItems(prev => {
            if (!prev.has(item.label)) {
              return new Set(prev).add(item.label);
            }
            return prev;
          });
        }
      });
    });
  }, [pathname, hasActiveChild]);

  const handleNavClick = (href?: string) => {
    if (href) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999]" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - slides in from right */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-80 max-w-[85vw]',
          'flex flex-col',
          'bg-gradient-to-b from-slate-900 via-slate-900 to-black',
          'border-l border-white/10',
          'shadow-2xl shadow-black/50',
          'transition-transform duration-300 ease-out',
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">SabiPrep</h2>
              <p className="text-xs text-slate-400">Master Your Exams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/40">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student'}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="px-5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.title}
              </p>

              <ul className="space-y-1 px-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const hasChildren = item.children && item.children.length > 0;
                  const childActive = hasActiveChild(item.children);
                  const expanded = isExpanded(item.label);

                  if (hasChildren) {
                    return (
                      <li key={item.label}>
                        <button
                          onClick={() => toggleExpanded(item.label)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                            childActive
                              ? 'bg-white/10 text-white'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                            childActive
                              ? 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/30'
                              : 'bg-white/5'
                          )}>
                            <Icon className={cn(
                              'w-4 h-4',
                              childActive ? 'text-white' : 'text-slate-400'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-500 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <ChevronDown className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            expanded ? 'rotate-180' : '',
                            childActive ? 'text-cyan-400' : 'text-slate-600'
                          )} />
                        </button>

                        {/* Children */}
                        <div className={cn(
                          'overflow-hidden transition-all duration-200',
                          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}>
                          <ul className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              const childIsActive = isActive(child.href);

                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href || '#'}
                                    onClick={() => handleNavClick(child.href)}
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                                      childIsActive
                                        ? 'bg-white/10 text-white'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'
                                    )}
                                  >
                                    <div className={cn(
                                      'w-7 h-7 rounded-md flex items-center justify-center',
                                      childIsActive
                                        ? 'bg-gradient-to-br from-cyan-500/50 to-violet-500/50'
                                        : 'bg-white/5'
                                    )}>
                                      <ChildIcon className={cn(
                                        'w-3.5 h-3.5',
                                        childIsActive ? 'text-white' : 'text-slate-400'
                                      )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm">{child.label}</p>
                                      {child.description && (
                                        <p className="text-[10px] text-slate-500 truncate">
                                          {child.description}
                                        </p>
                                      )}
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </li>
                    );
                  }

                  // Regular item (no children)
                  return (
                    <li key={item.href || item.label}>
                      <Link
                        href={item.href || '#'}
                        onClick={() => handleNavClick(item.href)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                          active
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10'
                        )}
                      >
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                          active
                            ? 'bg-gradient-to-br from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/30'
                            : 'bg-white/5'
                        )}>
                          <Icon className={cn(
                            'w-4 h-4',
                            active ? 'text-white' : 'text-slate-400'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.badge && (
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                                item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className={cn(
                          'w-4 h-4',
                          active ? 'text-cyan-400' : 'text-slate-600'
                        )} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sign out button */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-red-500/10 border border-red-500/30 text-red-400
                       hover:bg-red-500/20 hover:border-red-500/50
                       transition-all font-medium active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-3">
            SabiPrep v1.0 • Made for Nigerian Students 🇳🇬
          </p>
        </div>
      </div>
    </div>
  );
}

export default NavigationDrawer;
