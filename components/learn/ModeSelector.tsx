'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ClipboardCheck, Timer } from 'lucide-react';

export type LearningMode = 'practice' | 'test' | 'timed';

interface ModeSelectorProps {
  selectedMode: LearningMode;
  onModeSelect: (mode: LearningMode) => void;
}

const modes = [
  {
    id: 'practice' as LearningMode,
    name: 'Practice',
    description: 'Learn at your own pace with hints',
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    selectedBorder: 'border-emerald-500',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'test' as LearningMode,
    name: 'Test',
    description: 'Simulate real exam conditions',
    icon: ClipboardCheck,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    iconColor: 'text-blue-600',
  },
  {
    id: 'timed' as LearningMode,
    name: 'Timed',
    description: 'Race against the clock',
    icon: Timer,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    selectedBorder: 'border-orange-500',
    iconColor: 'text-orange-600',
  },
];

export function ModeSelector({ selectedMode, onModeSelect }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">Choose Your Mode</h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          
          return (
            <motion.button
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              className={`
                relative flex-shrink-0 snap-center
                w-[calc(33.333%-8px)] min-w-[100px] max-w-[140px]
                flex flex-col items-center p-3 sm:p-4 rounded-2xl
                border-2 transition-all duration-200
                ${isSelected 
                  ? `${mode.bgColor} ${mode.selectedBorder} shadow-lg` 
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2
                  ${isSelected 
                    ? `bg-gradient-to-br ${mode.color} text-white shadow-md` 
                    : `${mode.bgColor} ${mode.iconColor}`
                  }
                `}
                animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>
              
              <span className={`
                font-semibold text-xs sm:text-sm
                ${isSelected ? 'text-slate-800' : 'text-slate-600'}
              `}>
                {mode.name}
              </span>
              
              <span className={`
                text-[9px] sm:text-[10px] text-center mt-1 leading-tight line-clamp-2
                ${isSelected ? 'text-slate-600' : 'text-slate-400'}
              `}>
                {mode.description}
              </span>
              
              {isSelected && (
                <motion.div
                  className={`absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${mode.color} flex items-center justify-center`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

