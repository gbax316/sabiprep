'use client';

import React, { useState, useEffect } from 'react';
import type { User, UserRole, UserStatus } from '@/types/database';

/**
 * User form data
 */
export interface UserFormData {
  email: string;
  full_name: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  institution?: string;
}

/**
 * UserFormModal Props
 */
export interface UserFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback on successful submit */
  onSuccess: (user: User) => void;
  /** User data for edit mode (null for create mode) */
  user?: User | null;
  /** Modal title override */
  title?: string;
}

/**
 * UserFormModal Component
 * Modal form for creating and editing users
 */
export function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  title,
}: UserFormModalProps) {
  const isEditMode = !!user;
  
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    password: '',
    role: 'student',
    status: 'active',
    phone: '',
    institution: '',
  });
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Populate form data when editing
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        password: '',
        role: user.role,
        status: user.status,
        phone: (user as unknown as { phone?: string }).phone || '',
        institution: (user as unknown as { institution?: string }).institution || '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'student',
        status: 'active',
        phone: '',
        institution: '',
      });
    }
    setError(null);
    setValidationErrors({});
  }, [user, isOpen]);
  
  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    }
    
    // Password validation (only required in create mode)
    if (!isEditMode) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const url = isEditMode
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Prepare payload
      const payload: Record<string, unknown> = {
        full_name: formData.full_name.trim(),
        role: formData.role,
        status: formData.status,
      };
      
      if (!isEditMode) {
        payload.email = formData.email.trim();
        payload.password = formData.password;
      }
      
      if (formData.phone?.trim()) {
        payload.phone = formData.phone.trim();
      }
      
      if (formData.institution?.trim()) {
        payload.institution = formData.institution.trim();
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save user');
      }
      
      // Call success callback with the user data
      onSuccess(data.data?.user || data.user);
      onClose();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {title || (isEditMode ? 'Edit User' : 'Create New User')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isEditMode}
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  ${validationErrors.email ? 'border-red-300' : 'border-gray-200'}
                `}
                placeholder="user@example.com"
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>
            
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  ${validationErrors.full_name ? 'border-red-300' : 'border-gray-200'}
                `}
                placeholder="John Doe"
              />
              {validationErrors.full_name && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.full_name}</p>
              )}
            </div>
            
            {/* Password (only in create mode) */}
            {!isEditMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                    ${validationErrors.password ? 'border-red-300' : 'border-gray-200'}
                  `}
                  placeholder="••••••••"
                />
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
              </div>
            )}
            
            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            {/* Phone (optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="+234 800 000 0000"
              />
            </div>
            
            {/* Institution (optional) */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                Institution <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="University of Lagos"
              />
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
