'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common';
import { Save, X, AlertCircle } from 'lucide-react';

interface QuestionData {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer: string;
  hint?: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  solution?: string;
  explanation?: string;
  difficulty?: string;
  status: string;
}

export interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionData | null;
  onSave: (questionId: string, updates: Partial<QuestionData>) => Promise<void>;
}

export function QuickEditModal({
  isOpen,
  onClose,
  question,
  onSave,
}: QuickEditModalProps) {
  const [formData, setFormData] = useState<Partial<QuestionData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setFormData({
        correct_answer: question.correct_answer,
        hint: question.hint || '',
        hint1: question.hint1 || '',
        hint2: question.hint2 || '',
        hint3: question.hint3 || '',
        solution: question.solution || '',
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'Medium',
        status: question.status,
      });
      setError(null);
    }
  }, [question]);

  const handleSave = async () => {
    if (!question) return;
    
    setIsSaving(true);
    setError(null);

    try {
      await onSave(question.id, formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({});
    setError(null);
  };

  if (!question) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Quick Edit Question"
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Question Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Question</h4>
          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
            {question.question_text}
          </p>
        </div>

        {/* Options Display */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Options</h4>
          {['A', 'B', 'C', 'D', 'E'].map((letter) => {
            const optionKey = `option_${letter.toLowerCase()}` as keyof QuestionData;
            const optionText = question[optionKey];
            if (!optionText) return null;
            return (
              <div
                key={letter}
                className={`flex items-start gap-2 p-2 rounded ${
                  formData.correct_answer === letter
                    ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-gray-700'
                }`}
              >
                <span className={`font-medium ${
                  formData.correct_answer === letter
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {letter}.
                </span>
                <span className={`text-sm ${
                  formData.correct_answer === letter
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {optionText as string}
                </span>
              </div>
            );
          })}
        </div>

        {/* Correct Answer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Correct Answer <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {['A', 'B', 'C', 'D', 'E'].map((letter) => {
              const optionKey = `option_${letter.toLowerCase()}` as keyof QuestionData;
              if (!question[optionKey]) return null;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, correct_answer: letter }))}
                  className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
                    formData.correct_answer === letter
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              value={formData.difficulty || 'Medium'}
              onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status || 'published'}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Hints */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Hints</h4>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hint 1</label>
            <input
              type="text"
              value={formData.hint1 || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hint1: e.target.value }))}
              placeholder="First hint..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hint 2</label>
            <input
              type="text"
              value={formData.hint2 || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hint2: e.target.value }))}
              placeholder="Second hint..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hint 3</label>
            <input
              type="text"
              value={formData.hint3 || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hint3: e.target.value }))}
              placeholder="Third hint..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
        </div>

        {/* Solution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Solution
          </label>
          <textarea
            value={formData.solution || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
            placeholder="Step-by-step solution..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Explanation
          </label>
          <textarea
            value={formData.explanation || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
            placeholder="Why this answer is correct..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default QuickEditModal;
