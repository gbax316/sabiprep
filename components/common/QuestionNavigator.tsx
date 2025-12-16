'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Flag, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

interface QuestionStatus {
  id: string;
  index: number;
  status: 'unanswered' | 'answered' | 'correct' | 'incorrect' | 'flagged' | 'current';
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
      return 'bg-primary-600 text-white ring-2 ring-primary-300 ring-offset-2';
    }
    
    switch (status) {
      case 'answered':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'correct':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'incorrect':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'flagged':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
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
          <div className="px-4 pb-4">
            <div className="grid grid-cols-10 gap-2">
              {questions.map((question) => {
                const isCurrent = question.index === currentIndex;
                const icon = getStatusIcon(question.status);
                
                return (
                  <button
                    key={question.id}
                    onClick={() => onNavigate(question.index)}
                    className={cn(
                      'relative w-8 h-8 rounded-lg text-xs font-semibold border transition-all',
                      'flex items-center justify-center',
                      getStatusStyles(question.status, isCurrent)
                    )}
                  >
                    {icon || question.index + 1}
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
      <div className={cn('bg-white rounded-2xl shadow-soft p-4', className)}>
        <h3 className="font-semibold text-slate-900 mb-3">Questions</h3>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="font-bold text-slate-900">{stats.answered}</p>
            <p className="text-slate-500">Answered</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="font-bold text-slate-900">{stats.unanswered}</p>
            <p className="text-slate-500">Remaining</p>
          </div>
        </div>

        {/* Question grid */}
        <div className="grid grid-cols-5 gap-2">
          {questions.map((question) => {
            const isCurrent = question.index === currentIndex;
            const icon = getStatusIcon(question.status);
            
            return (
              <button
                key={question.id}
                onClick={() => onNavigate(question.index)}
                className={cn(
                  'relative w-full aspect-square rounded-lg text-xs font-semibold border transition-all',
                  'flex items-center justify-center',
                  getStatusStyles(question.status, isCurrent)
                )}
              >
                {icon || question.index + 1}
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
      'fixed bottom-20 right-4 z-30',
      'bg-white rounded-2xl shadow-xl border border-slate-200 p-3',
      'max-w-xs',
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-900">
          {currentIndex + 1} / {questions.length}
        </span>
        {onToggle && (
          <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-8 gap-1.5">
        {questions.map((question) => {
          const isCurrent = question.index === currentIndex;
          
          return (
            <button
              key={question.id}
              onClick={() => onNavigate(question.index)}
              className={cn(
                'w-6 h-6 rounded text-[10px] font-semibold transition-all',
                'flex items-center justify-center',
                getStatusStyles(question.status, isCurrent)
              )}
            >
              {question.index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuestionNavigator;
