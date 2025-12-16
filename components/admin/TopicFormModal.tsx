'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common';
import { X, Save, BookOpen, type LucideIcon } from 'lucide-react';

interface SubjectOption {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface TopicFormData {
  id?: string;
  name: string;
  subject_id: string;
  description: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  status: 'active' | 'inactive';
}

export interface TopicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TopicFormData) => Promise<void>;
  initialData?: Partial<TopicFormData>;
  mode: 'create' | 'edit';
  subjects: SubjectOption[];
  preselectedSubjectId?: string;
}

export function TopicFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  subjects,
  preselectedSubjectId,
}: TopicFormModalProps) {
  const [formData, setFormData] = useState<TopicFormData>({
    name: '',
    subject_id: '',
    description: '',
    difficulty: null,
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: initialData?.id,
        name: initialData?.name || '',
        subject_id: initialData?.subject_id || preselectedSubjectId || '',
        description: initialData?.description || '',
        difficulty: initialData?.difficulty || null,
        status: initialData?.status || 'active',
      });
      setErrors({});
    }
  }, [isOpen, initialData, preselectedSubjectId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Topic name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Topic name must be at least 2 characters';
    }

    if (!formData.subject_id) {
      newErrors.subject_id = 'Please select a subject';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save topic. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSubject = subjects.find(s => s.id === formData.subject_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Add New Topic' : 'Edit Topic'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Subject Selector */}
        <div>
          <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            id="subject_id"
            value={formData.subject_id}
            onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
              errors.subject_id ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isSubmitting || (mode === 'edit' && !!initialData?.subject_id)}
          >
            <option value="">Select a subject...</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subject_id && (
            <p className="mt-1 text-sm text-red-500">{errors.subject_id}</p>
          )}
          {selectedSubject && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedSubject.color || '#6B7280' }}
              />
              <span>Selected: {selectedSubject.name}</span>
            </div>
          )}
        </div>

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Topic Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Algebra, Comprehension, Kinematics"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Brief description of this topic..."
            disabled={isSubmitting}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Difficulty (optional)
          </label>
          <div className="flex gap-3">
            {[
              { value: null, label: 'None' },
              { value: 'Easy', label: 'Easy', color: 'text-green-600 dark:text-green-400' },
              { value: 'Medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
              { value: 'Hard', label: 'Hard', color: 'text-red-600 dark:text-red-400' },
            ].map(({ value, label, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  difficulty: value as TopicFormData['difficulty'] 
                }))}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  formData.difficulty === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                } ${color || ''}`}
                disabled={isSubmitting}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status (only in edit mode) */}
        {mode === 'edit' && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              disabled={isSubmitting}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        {/* Error message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            <span className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </span>
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isSubmitting}
          >
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Topic' : 'Save Changes'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default TopicFormModal;
