'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CircularTimerProps {
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  size?: 'sm' | 'md' | 'lg';
  showSeconds?: boolean;
  className?: string;
}

export function CircularTimer({
  timeRemaining,
  totalTime,
  size = 'md',
  showSeconds = true,
  className,
}: CircularTimerProps) {
  const percentage = (timeRemaining / totalTime) * 100;
  
  // Size configurations
  const sizes = {
    sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg' },
    md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl' },
    lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl' },
  };
  
  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Color based on time remaining
  const getColor = () => {
    if (percentage > 50) return { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' }; // Green
    if (percentage > 25) return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' }; // Yellow
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' }; // Red
  };
  
  const colors = getColor();
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}`;
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Background circle */}
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={config.strokeWidth}
        />
        
        {/* Progress */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
          style={{
            filter: percentage <= 25 ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'none',
          }}
        />
      </svg>
      
      {/* Time display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'font-display font-bold tabular-nums',
          config.fontSize,
          colors.text,
          percentage <= 10 && 'animate-pulse'
        )}>
          {formatTime(timeRemaining)}
        </span>
        {showSeconds && size !== 'sm' && (
          <span className="text-xs text-slate-500 mt-0.5">
            {timeRemaining === 1 ? 'second' : 'seconds'}
          </span>
        )}
      </div>
      
      {/* Pulse animation when low */}
      {percentage <= 25 && (
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: colors.stroke }}
        />
      )}
    </div>
  );
}

export default CircularTimer;
