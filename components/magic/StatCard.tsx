'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

/**
 * StatCard - Large number display with icon and gradient
 * 
 * @param title - Card title/label
 * @param value - Main stat value to display
 * @param icon - Icon component or element
 * @param trend - Optional trend direction ('up' | 'down')
 * @param trendValue - Optional trend value text
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <StatCard
 *   title="Questions Answered"
 *   value={1234}
 *   icon={<Target className="w-6 h-6" />}
 *   trend="up"
 *   trendValue="+12%"
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  className = '',
}: StatCardProps) {
  return (
    <motion.div
      className={`magic-card p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
          <span className="text-white">{icon}</span>
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            <span>{trend === 'up' ? '↑' : '↓'}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      
      <motion.div
        className="text-4xl font-black text-white mb-2"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {value}
      </motion.div>
      
      <p className="text-sm text-slate-400">{title}</p>
    </motion.div>
  );
}