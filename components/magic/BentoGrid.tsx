'use client';

import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * BentoGrid - Flexible grid layout for dashboard elements
 * 
 * @param children - Grid items
 * @param columns - Number of columns (1-4, default: 3)
 * @param gap - Gap size between items (default: 'md')
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <BentoGrid columns={3} gap="md">
 *   <MagicCard>Item 1</MagicCard>
 *   <MagicCard>Item 2</MagicCard>
 *   <MagicCard>Item 3</MagicCard>
 * </BentoGrid>
 * ```
 */
export function BentoGrid({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}: BentoGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}