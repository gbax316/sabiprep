'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from './Badge';
import { Check, ChevronDown, X } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: Array<{ id: string; label: string; count?: number; difficulty?: string }>;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  placeholder?: string;
  maxHeight?: string;
}

export function MultiSelectDropdown({
  options,
  selectedIds,
  onSelectionChange,
  placeholder = 'Select topics...',
  maxHeight = '300px',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(id: string) {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  }

  function clearSelection() {
    onSelectionChange(new Set());
  }

  const selectedOptions = options.filter(opt => selectedIds.has(opt.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedIds.size === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.slice(0, 3).map(opt => (
                  <Badge key={opt.id} variant="info" size="sm">
                    {opt.label}
                  </Badge>
                ))}
                {selectedIds.size > 3 && (
                  <Badge variant="neutral" size="sm">
                    +{selectedIds.size - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg"
          style={{ maxHeight }}
        >
          <div className="overflow-y-auto p-2" style={{ maxHeight }}>
            {options.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No topics available</div>
            ) : (
              options.map((option) => {
                const isSelected = selectedIds.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`
                      w-full text-left p-3 rounded-lg transition-colors mb-1 group
                      ${isSelected
                        ? 'bg-indigo-600 dark:bg-indigo-700 border-2 border-indigo-700 dark:border-indigo-800'
                        : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:bg-indigo-600 dark:hover:bg-indigo-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${isSelected
                            ? 'border-white bg-white'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-white group-hover:bg-white'
                          }
                        `}>
                          {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-700" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`
                              font-medium transition-colors
                              ${isSelected 
                                ? 'text-white' 
                                : 'text-gray-900 dark:text-gray-100 group-hover:text-white'
                              }
                            `}>
                              {option.label}
                            </span>
                            {option.difficulty && (
                              <Badge variant={
                                option.difficulty === 'Easy' ? 'success' :
                                option.difficulty === 'Medium' ? 'warning' :
                                'error'
                              } size="sm">
                                {option.difficulty}
                              </Badge>
                            )}
                          </div>
                          {option.count !== undefined && (
                            <p className={`
                              text-xs mt-0.5 transition-colors
                              ${isSelected 
                                ? 'text-indigo-100' 
                                : 'text-gray-600 dark:text-gray-400 group-hover:text-indigo-100'
                              }
                            `}>
                              {option.count} questions available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="border-t border-gray-200 p-2">
              <div className="text-xs text-gray-600">
                {selectedIds.size} topic{selectedIds.size !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
