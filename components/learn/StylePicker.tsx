'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, BookOpen, Settings, GraduationCap, Clock } from 'lucide-react';
import type { LearningMode } from './ModeSelector';

export type PracticeStyle = 'quick' | 'comprehensive' | 'custom';
export type TestStyle = 'waec' | 'jamb' | 'custom';
export type TimedStyle = '30min' | '1hr' | '2hr' | 'custom';

export type StyleOption = PracticeStyle | TestStyle | TimedStyle;

interface StylePickerProps {
  mode: LearningMode;
  selectedStyle: StyleOption;
  onStyleSelect: (style: StyleOption) => void;
  customQuestionCount?: number;
  onCustomQuestionCountChange?: (count: number) => void;
  subjectName?: string; // For JAMB subject-specific question counts
}

const styleConfigs = {
  practice: [
    { id: 'quick' as PracticeStyle, name: 'Quick', description: '10 questions', icon: Zap, questions: 10 },
    { id: 'comprehensive' as PracticeStyle, name: 'Deep Dive', description: '30 questions', icon: BookOpen, questions: 30 },
    { id: 'custom' as PracticeStyle, name: 'Custom', description: 'You choose', icon: Settings, questions: null },
  ],
  test: [
    { id: 'waec' as TestStyle, name: 'WAEC', description: '50 questions', icon: GraduationCap, questions: 50 },
    { id: 'jamb' as TestStyle, name: 'JAMB', description: '55 questions', icon: GraduationCap, questions: 55 },
    { id: 'custom' as TestStyle, name: 'Custom', description: 'You choose', icon: Settings, questions: null },
  ],
  timed: [
    { id: '30min' as TimedStyle, name: '30 Min', description: '20 questions', icon: Clock, time: 30 },
    { id: '1hr' as TimedStyle, name: '1 Hour', description: '40 questions', icon: Clock, time: 60 },
    { id: '2hr' as TimedStyle, name: '2 Hours', description: '80 questions', icon: Clock, time: 120 },
    { id: 'custom' as TimedStyle, name: 'Custom', description: 'You choose', icon: Settings, time: null },
  ],
};

// Helper to get JAMB question count based on subject
function getJambQuestionCount(subjectName?: string): number {
  if (!subjectName) return 40;
  const lowerName = subjectName.toLowerCase();
  // English Language has 60 questions in JAMB
  if (lowerName.includes('english')) return 60;
  // All other subjects have 40 questions
  return 40;
}

// Helper function to calculate question count from timed duration (using ~1.5 min/question)
export function getQuestionCountFromTimedStyle(style: TimedStyle, customTimeMinutes?: number): number {
  if (style === 'custom' && customTimeMinutes !== undefined) {
    return Math.round(customTimeMinutes / 1.5);
  }
  
  const config = styleConfigs.timed.find(s => s.id === style);
  if (config && 'time' in config && config.time) {
    return Math.round(config.time / 1.5);
  }
  
  return 20; // Default for 30min
}

export function StylePicker({ 
  mode, 
  selectedStyle, 
  onStyleSelect,
  customQuestionCount,
  onCustomQuestionCountChange,
  subjectName,
}: StylePickerProps) {
  // Get dynamic JAMB question count based on subject
  const jambQuestions = getJambQuestionCount(subjectName);
  
  // Build styles with dynamic JAMB count
  const getStyles = () => {
    if (mode === 'test') {
      return [
        { id: 'waec' as TestStyle, name: 'WAEC', description: '50 questions', icon: GraduationCap, questions: 50 },
        { id: 'jamb' as TestStyle, name: 'JAMB', description: `${jambQuestions} questions`, icon: GraduationCap, questions: jambQuestions },
        { id: 'custom' as TestStyle, name: 'Custom', description: 'You choose', icon: Settings, questions: null },
      ];
    }
    return styleConfigs[mode];
  };
  
  const styles = getStyles();
  
  // Slider display values (precompute to avoid type narrowing issues)
  const sliderLabel = mode === 'timed' ? 'Duration' : 'Questions';
  const sliderUnit = mode === 'timed' ? 'min' : '';
  const sliderMin = mode === 'timed' ? 5 : 5;
  const sliderMax = mode === 'timed' ? 180 : 100;
  const sliderStep = mode === 'timed' ? 5 : 5;
  
  // Only show custom slider for practice and test modes, not for timed mode
  const showCustomSlider = selectedStyle === 'custom' && onCustomQuestionCountChange && mode !== 'timed';
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/427f2c1c-09b4-440f-8235-f4463fed2c6d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
        location: 'components/learn/StylePicker.tsx:showCustomSlider',
        message: 'StylePicker render state',
        data: { mode, selectedStyle, showCustomSlider, customQuestionCount, sliderLabel, sliderUnit, sliderMin, sliderMax, sliderStep },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">
        {mode === 'timed' ? 'Select Duration' : 'Select Style'}
      </h2>
      
      <div className="grid grid-cols-3 gap-2">
        {styles.map((style, index) => {
          const Icon = style.icon;
          const isSelected = selectedStyle === style.id;
          
          return (
            <motion.button
              key={style.id}
              onClick={() => onStyleSelect(style.id)}
              className={`
                flex flex-col items-center p-2 sm:p-3 rounded-xl
                border-2 transition-all duration-200
                ${isSelected 
                  ? 'bg-indigo-50 border-indigo-500 shadow-md' 
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className={`
                w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-1 sm:mb-1.5
                ${isSelected 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white' 
                  : 'bg-slate-100 text-slate-500'
                }
              `}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              
              <span className={`
                font-medium text-xs sm:text-sm text-center
                ${isSelected ? 'text-indigo-700' : 'text-slate-700'}
              `}>
                {style.name}
              </span>
              
              <span className={`
                text-[9px] sm:text-[10px] text-center line-clamp-1
                ${isSelected ? 'text-indigo-500' : 'text-slate-400'}
              `}>
                {style.description}
              </span>
            </motion.button>
          );
        })}
      </div>
      
      <AnimatePresence>
        {showCustomSlider && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{sliderLabel}</span>
                <span className="font-semibold text-indigo-600">
                  {customQuestionCount} {sliderUnit}
                </span>
              </div>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={customQuestionCount || 20}
                onChange={(e) => {
                  const next = parseInt(e.target.value);
                  // #region agent log
                  if (typeof window !== 'undefined') {
                    fetch('http://127.0.0.1:7242/ingest/427f2c1c-09b4-440f-8235-f4463fed2c6d', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'run1',
                        hypothesisId: 'H2',
                        location: 'components/learn/StylePicker.tsx:onCustomQuestionCountChange',
                        message: 'Custom slider change',
                        data: { mode, selectedStyle, value: next },
                        timestamp: Date.now(),
                      }),
                    }).catch(() => {});
                  }
                  // #endregion
                  onCustomQuestionCountChange?.(next);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{sliderMin}{sliderUnit ? ' min' : ''}</span>
                <span>{sliderMax}{sliderUnit ? ' min' : ''}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to get question count from style
export function getQuestionCountFromStyle(mode: LearningMode, style: StyleOption, customCount?: number, subjectName?: string, customTimeMinutes?: number): number {
  // Handle timed mode separately
  if (mode === 'timed') {
    return getQuestionCountFromTimedStyle(style as TimedStyle, customTimeMinutes);
  }
  
  if (style === 'custom' && customCount) return customCount;
  
  // Handle JAMB specifically with subject-aware question count
  if (mode === 'test' && style === 'jamb') {
    return getJambQuestionCount(subjectName);
  }
  
  const config = styleConfigs[mode].find(s => s.id === style);
  if (config && 'questions' in config && config.questions) return config.questions;
  
  // Defaults
  if (mode === 'practice') return 20;
  if (mode === 'test') return 50;
  return 30;
}

// Helper function to get time limit from style (for timed mode)
export function getTimeLimitFromStyle(style: TimedStyle, customTime?: number): number {
  if (style === 'custom' && customTime) return customTime * 60; // Convert to seconds
  
  const config = styleConfigs.timed.find(s => s.id === style);
  if (config && 'time' in config && config.time) return config.time * 60; // Convert to seconds
  
  return 30 * 60; // Default 30 minutes
}

