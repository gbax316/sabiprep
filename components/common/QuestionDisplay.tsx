'use client';

import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Check, X } from 'lucide-react';
import type { Question } from '@/types/database';

export interface QuestionDisplayProps {
  question: Question;
  showPassage?: boolean;
  selectedAnswer?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  onAnswerSelect?: (answer: 'A' | 'B' | 'C' | 'D' | 'E') => void;
  showCorrectAnswer?: boolean;
  isReview?: boolean;
  questionNumber?: number;
  disabled?: boolean;
}

export function QuestionDisplay({
  question,
  showPassage = true,
  selectedAnswer = null,
  onAnswerSelect,
  showCorrectAnswer = false,
  isReview = false,
  questionNumber,
  disabled = false,
}: QuestionDisplayProps) {
  const options: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D'];
  if (question.option_e) {
    options.push('E');
  }

  return (
    <div className="space-y-6">
      {/* Passage Display */}
      {showPassage && question.passage && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/80 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <article className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">📖</span>
              Reading Passage
            </h3>
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {question.passage}
            </div>
          </article>
        </Card>
      )}

      {/* Question Card */}
      <Card variant="elevated" className="shadow-lg border-gray-200/80 hover:shadow-xl transition-shadow duration-300">
        <div className="space-y-4">
          {/* Question Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge variant="neutral">
              {questionNumber ? `Question ${questionNumber}` : 'Question'}
            </Badge>
            <div className="flex items-center gap-2">
              {question.passage_id && (
                <Badge variant="info" className="text-xs">
                  📖 Passage
                </Badge>
              )}
              {question.question_image_url && (
                <Badge variant="info" className="text-xs">
                  🖼️ Image
                </Badge>
              )}
              {question.difficulty && (
                <Badge
                  variant={
                    question.difficulty === 'Easy'
                      ? 'success'
                      : question.difficulty === 'Medium'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {question.difficulty}
                </Badge>
              )}
            </div>
          </div>

          {/* Question Text */}
          <div className="prose max-w-none">
            <p className="text-lg text-gray-900 font-medium leading-relaxed">
              {question.question_text}
            </p>
          </div>

          {/* Question Image */}
          {question.question_image_url && (
            <div className="flex justify-center">
              <div className="relative max-w-full">
                <img
                  src={question.question_image_url}
                  alt={question.image_alt_text || 'Question image'}
                  className="max-w-full h-auto rounded-lg shadow-md"
                  style={{
                    maxHeight: '400px',
                    width: question.image_width ? `${question.image_width}px` : 'auto',
                    height: question.image_height ? `${question.image_height}px` : 'auto',
                  }}
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((key) => {
          const optionText = question[`option_${key.toLowerCase()}` as keyof Question] as string;
          if (!optionText) return null;

          const isSelected = selectedAnswer === key;
          const isCorrect = key === question.correct_answer;
          const showResult = showCorrectAnswer || isReview;

          return (
            <button
              key={key}
              onClick={() => !disabled && onAnswerSelect && onAnswerSelect(key)}
              disabled={disabled}
              className={`
                w-full p-4 rounded-xl text-left transition-all duration-200
                ${!showResult && !isSelected && 'bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-md'}
                ${!showResult && isSelected && 'bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-500 shadow-md ring-2 ring-indigo-200'}
                ${showResult && isCorrect && 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-2 border-emerald-600 shadow-lg'}
                ${showResult && isSelected && !isCorrect && 'bg-gradient-to-r from-red-500 to-red-600 border-2 border-red-600 shadow-lg'}
                ${showResult && !isSelected && !isCorrect && 'bg-white border-2 border-gray-200'}
                ${disabled && 'cursor-not-allowed opacity-60'}
                ${!disabled && !showResult && 'cursor-pointer active:scale-[0.98]'}
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-all
                    ${!showResult && isSelected && 'bg-indigo-600 text-white shadow-md'}
                    ${!showResult && !isSelected && 'bg-gray-200 text-gray-700'}
                    ${showResult && isCorrect && 'bg-white text-emerald-600 shadow-md'}
                    ${showResult && isSelected && !isCorrect && 'bg-white text-red-600 shadow-md'}
                    ${showResult && !isSelected && !isCorrect && 'bg-gray-300 text-gray-600'}
                  `}
                >
                  {showResult && isCorrect ? (
                    <Check className="w-5 h-5" />
                  ) : showResult && isSelected && !isCorrect ? (
                    <X className="w-5 h-5" />
                  ) : (
                    key
                  )}
                </div>
                <span className={`flex-1 ${
                  showResult && isCorrect ? 'text-white font-medium' :
                  showResult && isSelected && !isCorrect ? 'text-white font-medium' :
                  'text-gray-900'
                }`}>{optionText}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}