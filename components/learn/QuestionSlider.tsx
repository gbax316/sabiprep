'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LearningMode } from './ModeSelector';

interface QuestionSliderProps {
  mode: LearningMode;
  value: number;
  onChange: (value: number) => void;
  maxQuestions?: number;
}

const presets = {
  practice: [10, 20, 30, 50],
  test: [25, 50, 75, 100],
  timed: [15, 30, 50, 75],
};

export function QuestionSlider({ 
  mode, 
  value, 
  onChange,
  maxQuestions = 100,
}: QuestionSliderProps) {
  const modePresets = presets[mode];
  
  // Calculate available presets based on max questions
  const availablePresets = modePresets.filter(p => p <= maxQuestions);
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800">Questions</h2>
        <motion.span 
          key={value}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
        >
          {value}
        </motion.span>
      </div>
      
      {/* Preset buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {availablePresets.map((preset) => (
          <motion.button
            key={preset}
            onClick={() => onChange(preset)}
            className={`
              py-2 px-3 rounded-xl text-sm font-medium transition-all
              ${value === preset 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {preset}
          </motion.button>
        ))}
      </div>
      
      {/* Slider */}
      <div className="relative pt-2">
        <input
          type="range"
          min={5}
          max={maxQuestions}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-indigo-500
            [&::-webkit-slider-thumb]:to-purple-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-4
            [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-indigo-500
            [&::-moz-range-thumb]:to-purple-500
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-4
            [&::-moz-range-thumb]:border-white
          "
          style={{
            background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(168, 85, 247) ${(value / maxQuestions) * 100}%, rgb(226, 232, 240) ${(value / maxQuestions) * 100}%, rgb(226, 232, 240) 100%)`,
          }}
        />
        
        {/* Min/Max labels */}
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>5</span>
          <span>{maxQuestions}</span>
        </div>
      </div>
      
      {/* Estimate info */}
      <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
        <span>Estimated time:</span>
        <span className="font-medium text-slate-700">
          {Math.ceil(value * 1.5)} - {Math.ceil(value * 2)} min
        </span>
      </div>
    </div>
  );
}

