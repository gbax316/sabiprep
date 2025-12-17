'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

/**
 * MagicCard - Base card component with gradient borders, dark background, and glow effects
 * 
 * @param children - Card content
 * @param className - Additional CSS classes
 * @param hover - Enable hover effects (default: true)
 * @param glow - Enable glow effect (default: false)
 * 
 * @example
 * ```tsx
 * <MagicCard hover glow>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </MagicCard>
 * ```
 */
export function MagicCard({ 
  children, 
  className = '', 
  hover = true, 
  glow = false 
}: MagicCardProps) {
  return (
    <motion.div
      className={`magic-card ${glow ? 'magic-card-glow' : ''} ${className}`}
      whileHover={hover ? { scale: 1.02, y: -4 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}