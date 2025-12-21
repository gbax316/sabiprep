'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2 } from 'lucide-react';
import type { LearningMode } from './ModeSelector';

interface StartButtonProps {
  mode: LearningMode;
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  questionCount: number;
}

const modeLabels = {
  practice: 'Start Practice',
  test: 'Begin Test',
  timed: 'Start Exam',
};

const modeColors = {
  practice: 'from-emerald-500 to-teal-500',
  test: 'from-blue-500 to-indigo-500',
  timed: 'from-orange-500 to-red-500',
};

export function StartButton({ 
  mode, 
  isLoading = false, 
  isDisabled = false, 
  onClick,
  questionCount,
}: StartButtonProps) {
  const label = modeLabels[mode];
  const gradient = modeColors[mode];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pb-safe z-50">
      <motion.button
        onClick={onClick}
        disabled={isLoading || isDisabled}
        className={`
          w-full py-4 px-6 rounded-2xl
          bg-gradient-to-r ${gradient}
          text-white font-semibold text-lg
          shadow-xl shadow-indigo-500/30
          flex items-center justify-center gap-3
          disabled:opacity-50 disabled:cursor-not-allowed
          relative overflow-hidden
        `}
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Animated background shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
        
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Creating session...</span>
          </>
        ) : (
          <>
            <Play className="w-6 h-6" />
            <span>{label}</span>
            <span className="text-white/80 text-sm">
              ({questionCount} questions)
            </span>
          </>
        )}
      </motion.button>
      
      {/* Safe area spacer for iOS */}
      <div className="h-safe" />
    </div>
  );
}

