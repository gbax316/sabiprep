'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * ProgressRing - Circular progress indicator with glow
 * 
 * @param progress - Progress value from 0 to 100
 * @param size - Ring size (default: 'md')
 * @param showLabel - Show percentage label in center (default: true)
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <ProgressRing progress={75} size="lg" showLabel />
 * ```
 */
export function ProgressRing({
  progress,
  size = 'md',
  showLabel = true,
  className = '',
}: ProgressRingProps) {
  const sizes = {
    sm: { width: 60, stroke: 4, fontSize: 'text-xs' },
    md: { width: 80, stroke: 6, fontSize: 'text-sm' },
    lg: { width: 120, stroke: 8, fontSize: 'text-lg' },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={width} height={width} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={stroke}
        />
        
        {/* Progress Circle with Gradient */}
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-white ${fontSize}`}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}