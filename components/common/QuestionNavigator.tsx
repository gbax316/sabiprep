'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Flag, Check, X, ChevronUp, ChevronDown, BookOpen, Image as ImageIcon } from 'lucide-react';

interface QuestionStatus {
  id: string;
  index: number;
  status: 'unanswered' | 'answered' | 'correct' | 'incorrect' | 'flagged' | 'current';
  hasPassage?: boolean;
  hasImage?: boolean;
}

interface QuestionNavigatorProps {
  questions: QuestionStatus[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  showResults?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  variant?: 'sidebar' | 'bottom' | 'floating';
  className?: string;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  onNavigate,
  showResults = false,
  isOpen = true,
  onToggle,
  variant = 'bottom',
  className,
}: QuestionNavigatorProps) {
  const getStatusStyles = (status: QuestionStatus['status'], isCurrent: boolean) => {
    if (isCurrent) {
      return 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 ring-offset-1 shadow-md';
    }
    
    switch (status) {
      case 'answered':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300';
      case 'correct':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300';
      case 'incorrect':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300';
      case 'flagged':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300';
    }
  };

  const getStatusIcon = (status: QuestionStatus['status']) => {
    switch (status) {
      case 'correct':
        return <Check className="w-3 h-3" />;
      case 'incorrect':
        return <X className="w-3 h-3" />;
      case 'flagged':
        return <Flag className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Count statistics
  const stats = {
    answered: questions.filter(q => q.status === 'answered' || q.status === 'correct' || q.status === 'incorrect').length,
    correct: questions.filter(q => q.status === 'correct').length,
    incorrect: questions.filter(q => q.status === 'incorrect').length,
    flagged: questions.filter(q => q.status === 'flagged').length,
    unanswered: questions.filter(q => q.status === 'unanswered').length,
  };

  if (variant === 'bottom') {
    return (
      <div className={cn('bg-white border-t border-slate-200 shadow-lg', className)}>
        {/* Toggle header */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-slate-900">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  {stats.answered} answered
                </span>
                {stats.flagged > 0 && (
                  <span className="flex items-center gap-1">
                    <Flag className="w-3 h-3 text-amber-500" />
                    {stats.flagged}
                  </span>
                )}
              </div>
            </div>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            )}
          </button>
        )}

        {/* Question grid */}
        {isOpen && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2">
              {questions.map((question) => {
                const isCurrent = question.index === currentIndex;
                const icon = getStatusIcon(question.status);
                const hasIndicators = question.hasPassage || question.hasImage;
                
                return (
                  <button
                    key={question.id}
                    onClick={() => onNavigate(question.index)}
                    className={cn(
                      'relative w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold border transition-all',
                      'flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm hover:shadow-md',
                      getStatusStyles(question.status, isCurrent)
                    )}
                    title={`Question ${question.index + 1}`}
                  >
                    {icon || question.index + 1}
                    {hasIndicators && (
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex gap-0.5">
                        {question.hasPassage && (
                          <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-blue-600 bg-white rounded-full p-0.5 shadow-sm" />
                        )}
                        {question.hasImage && (
                          <ImageIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-indigo-600 bg-white rounded-full p-0.5 shadow-sm" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                Unanswered
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary-100 border border-primary-200" />
                Answered
              </span>
              {showResults && (
                <>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
                    Correct
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
                    Incorrect
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4', className)}>
        <h3 className="font-semibold text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">Questions</h3>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-xs">
          <div className="bg-slate-50 rounded-lg p-1.5 sm:p-2 text-center border border-slate-100">
            <p className="font-bold text-slate-900 text-sm">{stats.answered}</p>
            <p className="text-slate-500 text-[10px] sm:text-xs">Answered</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-1.5 sm:p-2 text-center border border-slate-100">
            <p className="font-bold text-slate-900 text-sm">{stats.unanswered}</p>
            <p className="text-slate-500 text-[10px] sm:text-xs">Remaining</p>
          </div>
        </div>

        {/* Question grid - Responsive columns */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
          {questions.map((question) => {
            const isCurrent = question.index === currentIndex;
            const icon = getStatusIcon(question.status);
            const hasIndicators = question.hasPassage || question.hasImage;
            
            return (
              <button
                key={question.id}
                onClick={() => onNavigate(question.index)}
                className={cn(
                  'relative w-full aspect-square rounded-md text-[10px] sm:text-xs font-semibold border transition-all',
                  'flex items-center justify-center hover:scale-105 active:scale-95',
                  'shadow-sm hover:shadow-md',
                  getStatusStyles(question.status, isCurrent)
                )}
                title={`Question ${question.index + 1}`}
              >
                {icon || question.index + 1}
                {hasIndicators && (
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex gap-0.5">
                    {question.hasPassage && (
                      <BookOpen className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-blue-600 bg-white rounded-full p-0.5 shadow-sm" />
                    )}
                    {question.hasImage && (
                      <ImageIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-indigo-600 bg-white rounded-full p-0.5 shadow-sm" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Floating variant
  return (
    <div className={cn(
      'fixed bottom-20 right-2 sm:right-4 z-30',
      'bg-white rounded-xl shadow-xl border border-slate-200 p-2 sm:p-3',
      'max-w-[280px] sm:max-w-xs',
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium text-slate-900">
          {currentIndex + 1} / {questions.length}
        </span>
        {onToggle && (
          <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded transition-colors">
            <X className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 sm:gap-1.5">
        {questions.map((question) => {
          const isCurrent = question.index === currentIndex;
          const hasIndicators = question.hasPassage || question.hasImage;
          
          return (
            <button
              key={question.id}
              onClick={() => onNavigate(question.index)}
              className={cn(
                'relative w-5 h-5 sm:w-6 sm:h-6 rounded text-[9px] sm:text-[10px] font-semibold transition-all',
                'flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm hover:shadow-md',
                getStatusStyles(question.status, isCurrent)
              )}
              title={`Question ${question.index + 1}`}
            >
              {question.index + 1}
              {hasIndicators && (
                <div className="absolute -top-0.5 -right-0.5 flex gap-0.5">
                  {question.hasPassage && (
                    <BookOpen className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-blue-600 bg-white rounded-full p-0.5 shadow-sm" />
                  )}
                  {question.hasImage && (
                    <ImageIcon className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-indigo-600 bg-white rounded-full p-0.5 shadow-sm" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionNavigator;
