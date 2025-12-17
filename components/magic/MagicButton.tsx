'use client';

import { motion } from 'framer-motion';
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface MagicButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * MagicButton - Pill-shaped button with gradients, glows, and smooth animations
 * 
 * @param variant - Button style variant (default: 'primary')
 * @param size - Button size (default: 'md')
 * @param children - Button content
 * @param className - Additional CSS classes
 * @param disabled - Disabled state
 * @param onClick - Click handler
 * 
 * @example
 * ```tsx
 * <MagicButton variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </MagicButton>
 * ```
 */
export function MagicButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}: MagicButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-600 hover:to-violet-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50',
    secondary: 'bg-slate-800/50 border border-slate-700 text-white hover:bg-slate-800 hover:border-slate-600',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white',
    icon: 'bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white p-2 w-10 h-10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <motion.button
      className={`${baseClasses} ${variants[variant]} ${variant !== 'icon' ? sizes[size] : ''} ${className}`}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.2 }}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  );
}