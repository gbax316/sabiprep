'use client';

import React, { useState } from 'react';

/**
 * QuestionPreview Props
 */
interface QuestionPreviewProps {
  questionText: string;
  passage?: string;
  imageUrl?: string;
  imageAltText?: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: string;
  hint?: string;
  explanation?: string;
  solution?: string;
  difficulty?: string;
  examType?: string;
  examYear?: string;
}

/**
 * Get difficulty badge color
 */
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':
      return 'bg-green-100 text-green-700';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'Hard':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get exam type badge color
 */
function getExamTypeColor(examType: string): string {
  switch (examType) {
    case 'WAEC':
      return 'bg-blue-100 text-blue-700';
    case 'JAMB':
      return 'bg-purple-100 text-purple-700';
    case 'NECO':
      return 'bg-orange-100 text-orange-700';
    case 'GCE':
      return 'bg-teal-100 text-teal-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * QuestionPreview Component
 * Render question exactly as student sees with toggle answer/solution
 */
export function QuestionPreview({
  questionText,
  passage,
  imageUrl,
  imageAltText,
  options,
  correctAnswer,
  hint,
  explanation,
  solution,
  difficulty,
  examType,
  examYear,
}: QuestionPreviewProps) {
  const [viewMode, setViewMode] = useState<'question' | 'solution'>('question');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  const optionEntries = Object.entries(options).filter(([, value]) => value?.trim());
  
  const hasExplanation = explanation?.trim() || solution?.trim();
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
      {/* Preview Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('question')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              viewMode === 'question'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Question View
          </button>
          <button
            onClick={() => setViewMode('solution')}
            disabled={!hasExplanation}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              viewMode === 'solution'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            Solution View
          </button>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Metadata Badges */}
        {(difficulty || examType || examYear) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {difficulty && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
            )}
            {examType && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getExamTypeColor(examType)}`}>
                {examType}
              </span>
            )}
            {examYear && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {examYear}
              </span>
            )}
          </div>
        )}
        
        {/* Passage */}
        {passage?.trim() && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-sm font-semibold text-blue-700">Passage</p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{passage}</p>
          </div>
        )}
        
        {/* Question Image */}
        {imageUrl?.trim() && (
          <div className="mb-4">
            <img
              src={imageUrl}
              alt={imageAltText || 'Question image'}
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
            />
            {imageAltText && (
              <p className="mt-2 text-xs text-gray-500 italic">{imageAltText}</p>
            )}
          </div>
        )}
        
        {/* Question Text */}
        {questionText?.trim() ? (
          <div className="mb-4">
            <p className="text-gray-900 font-medium whitespace-pre-wrap">{questionText}</p>
          </div>
        ) : (
          <div className="mb-4 text-gray-400 italic">
            No question text entered yet...
          </div>
        )}
        
        {/* Options */}
        {optionEntries.length > 0 ? (
          <div className="space-y-2 mb-4">
            {optionEntries.map(([key, value]) => {
              const isCorrect = key === correctAnswer;
              const isSelected = selectedAnswer === key;
              const showCorrectness = viewMode === 'solution' || (isSelected && selectedAnswer !== null);
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedAnswer(key)}
                  disabled={viewMode === 'solution'}
                  className={`w-full p-3 text-left rounded-lg border transition-all ${
                    showCorrectness
                      ? isCorrect
                        ? 'bg-green-50 border-green-500 text-green-800'
                        : isSelected
                          ? 'bg-red-50 border-red-500 text-red-800'
                          : 'border-gray-200'
                      : isSelected
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      showCorrectness
                        ? isCorrect
                          ? 'bg-green-500 text-white'
                          : isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        : isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm flex-1">{value}</span>
                    {showCorrectness && isCorrect && (
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {showCorrectness && isSelected && !isCorrect && (
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-4 text-gray-400 italic">
            No options entered yet...
          </div>
        )}
        
        {/* Hint Button */}
        {hint?.trim() && viewMode === 'question' && !showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="mb-4 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Show Hint
          </button>
        )}
        
        {/* Hint Display */}
        {hint?.trim() && showHint && viewMode === 'question' && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-700 mb-1">Hint:</p>
            <p className="text-sm text-amber-800">{hint}</p>
          </div>
        )}
        
        {/* Solution View */}
        {viewMode === 'solution' && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            {/* Correct Answer */}
            {correctAnswer && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700">
                  Correct Answer: {correctAnswer}
                </p>
              </div>
            )}
            
            {/* Explanation */}
            {explanation?.trim() && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Explanation:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{explanation}</p>
              </div>
            )}
            
            {/* Solution */}
            {solution?.trim() && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Detailed Solution:</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{solution}</p>
                </div>
              </div>
            )}
            
            {/* No explanation message */}
            {!explanation?.trim() && !solution?.trim() && (
              <div className="text-gray-400 italic text-sm">
                No explanation or solution provided.
              </div>
            )}
          </div>
        )}
        
        {/* Reset Button */}
        {selectedAnswer && viewMode === 'question' && (
          <button
            onClick={() => {
              setSelectedAnswer(null);
              setShowHint(false);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reset Selection
          </button>
        )}
      </div>
      
      {/* Preview Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {optionEntries.length} option{optionEntries.length !== 1 ? 's' : ''}
          </span>
          <span>
            {correctAnswer ? `Answer: ${correctAnswer}` : 'No answer selected'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuestionPreview;
