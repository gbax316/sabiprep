'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Layers } from 'lucide-react';
import type { Topic } from '@/types/database';

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicIds: Set<string>;
  onTopicToggle: (topicId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function TopicSelector({
  topics,
  selectedTopicIds,
  onTopicToggle,
  onSelectAll,
  onDeselectAll,
}: TopicSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const allSelected = topics.length > 0 && selectedTopicIds.size === topics.length;
  const someSelected = selectedTopicIds.size > 0 && selectedTopicIds.size < topics.length;
  const selectedCount = selectedTopicIds.size;
  
  const handleAllTopicsToggle = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Topics</h2>
        <span className="text-sm text-slate-500">
          {selectedCount} of {topics.length} selected
        </span>
      </div>
      
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
        {/* All Topics Toggle */}
        <motion.button
          onClick={handleAllTopicsToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${allSelected 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white' 
                : 'bg-slate-100 text-slate-500'
              }
            `}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800">All Topics</p>
              <p className="text-xs text-slate-500">{topics.length} topics available</p>
            </div>
          </div>
          
          <div className={`
            w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
            ${allSelected 
              ? 'bg-indigo-500 border-indigo-500' 
              : someSelected
                ? 'bg-indigo-200 border-indigo-300'
                : 'border-slate-300'
            }
          `}>
            {(allSelected || someSelected) && (
              <Check className={`w-4 h-4 ${allSelected ? 'text-white' : 'text-indigo-600'}`} />
            )}
          </div>
        </motion.button>
        
        {/* Expand/Collapse Button */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 border-t border-slate-100 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <span>{isExpanded ? 'Hide topics' : 'Choose specific topics'}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
        
        {/* Individual Topics */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 max-h-64 overflow-y-auto">
                {topics.map((topic, index) => {
                  const isSelected = selectedTopicIds.has(topic.id);
                  
                  return (
                    <motion.button
                      key={topic.id}
                      onClick={() => onTopicToggle(topic.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium
                          ${isSelected 
                            ? 'bg-indigo-100 text-indigo-600' 
                            : 'bg-slate-100 text-slate-400'
                          }
                        `}>
                          {index + 1}
                        </div>
                        <span className={`
                          text-sm text-left
                          ${isSelected ? 'text-slate-800 font-medium' : 'text-slate-600'}
                        `}>
                          {topic.name}
                        </span>
                      </div>
                      
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${isSelected 
                          ? 'bg-indigo-500 border-indigo-500' 
                          : 'border-slate-300'
                        }
                      `}>
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

