'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: number; // in minutes
  onChange: (minutes: number) => void;
}

const timePresets = [15, 30, 45, 60, 90, 120];

export function TimePicker({ value, onChange }: TimePickerProps) {
  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800">Time Limit</h2>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          <motion.span 
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg sm:text-xl font-bold text-orange-600"
          >
            {formatTime(value)}
          </motion.span>
        </div>
      </div>
      
      {/* Preset buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {timePresets.map((preset) => (
          <motion.button
            key={preset}
            onClick={() => onChange(preset)}
            className={`
              py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all
              ${value === preset 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {formatTime(preset)}
          </motion.button>
        ))}
      </div>
      
      {/* Slider */}
      <div className="relative pt-2">
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-br
            [&::-webkit-slider-thumb]:from-orange-500
            [&::-webkit-slider-thumb]:to-red-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-4
            [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-br
            [&::-moz-range-thumb]:from-orange-500
            [&::-moz-range-thumb]:to-red-500
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-4
            [&::-moz-range-thumb]:border-white
          "
          style={{
            background: `linear-gradient(to right, rgb(249, 115, 22) 0%, rgb(239, 68, 68) ${(value / 180) * 100}%, rgb(226, 232, 240) ${(value / 180) * 100}%, rgb(226, 232, 240) 100%)`,
          }}
        />
        
        {/* Min/Max labels */}
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>5 min</span>
          <span>3 hours</span>
        </div>
      </div>
      
    </div>
  );
}

