'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common';
import { 
  BookOpen, 
  Calculator, 
  FlaskConical, 
  Globe, 
  Languages, 
  Landmark, 
  Leaf, 
  Palette, 
  Music,
  Laptop,
  Heart,
  Scale,
  X,
  Save,
  type LucideIcon
} from 'lucide-react';

// Available Lucide icons for subjects
export const SUBJECT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Calculator', icon: Calculator },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'Globe', icon: Globe },
  { name: 'Languages', icon: Languages },
  { name: 'Landmark', icon: Landmark },
  { name: 'Leaf', icon: Leaf },
  { name: 'Palette', icon: Palette },
  { name: 'Music', icon: Music },
  { name: 'Laptop', icon: Laptop },
  { name: 'Heart', icon: Heart },
  { name: 'Scale', icon: Scale },
];

// Predefined color palette
export const SUBJECT_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Cyan', value: '#06B6D4' },
];

// Available exam types
export const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO', 'GCE'];

export interface SubjectFormData {
  id?: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  exam_types: string[];
  status: 'active' | 'inactive';
}

export interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectFormData) => Promise<void>;
  initialData?: Partial<SubjectFormData>;
  mode: 'create' | 'edit';
}

export function SubjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: SubjectFormModalProps) {
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    icon: 'BookOpen',
    color: '#3B82F6',
    description: '',
    exam_types: [],
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
        icon: initialData?.icon || 'BookOpen',
        color: initialData?.color || '#3B82F6',
        description: initialData?.description || '',
        exam_types: initialData?.exam_types || [],
        status: initialData?.status || 'active',
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters';
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
      setErrors({ submit: 'Failed to save subject. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExamTypeToggle = (examType: string) => {
    setFormData(prev => ({
      ...prev,
      exam_types: prev.exam_types.includes(examType)
        ? prev.exam_types.filter(t => t !== examType)
        : [...prev.exam_types, examType],
    }));
  };

  // Get icon component by name
  const getIconComponent = (iconName: string): LucideIcon => {
    const found = SUBJECT_ICONS.find(i => i.name === iconName);
    return found?.icon || BookOpen;
  };

  const SelectedIcon = getIconComponent(formData.icon);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'create' ? 'Add New Subject' : 'Edit Subject'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Mathematics"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Icon Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Icon
          </label>
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: formData.color + '20', color: formData.color }}
            >
              <SelectedIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 grid grid-cols-6 gap-2">
              {SUBJECT_ICONS.map(({ name, icon: IconComp }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: name }))}
                  className={`p-2 rounded-lg border transition-colors ${
                    formData.icon === name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <IconComp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map(({ name, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color: value }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === value
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: value }}
                title={name}
                disabled={isSubmitting}
              />
            ))}
          </div>
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
            placeholder="Brief description of this subject..."
            disabled={isSubmitting}
          />
        </div>

        {/* Exam Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Exam Types
          </label>
          <div className="flex flex-wrap gap-2">
            {EXAM_TYPES.map(examType => (
              <button
                key={examType}
                type="button"
                onClick={() => handleExamTypeToggle(examType)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  formData.exam_types.includes(examType)
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
                disabled={isSubmitting}
              >
                {examType}
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
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Subject' : 'Save Changes'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SubjectFormModal;
