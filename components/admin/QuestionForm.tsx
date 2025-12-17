'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionPreview from './QuestionPreview';
import ImageUpload from './ImageUpload';

/**
 * Subject type for dropdown
 */
interface Subject {
  id: string;
  name: string;
  slug: string;
}

/**
 * Topic type for dropdown
 */
interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

/**
 * Question form data
 */
export interface QuestionFormData {
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage: string;
  passage_id: string;
  question_image_url: string;
  image_alt_text: string;
  image_width: string;
  image_height: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E' | '';
  explanation: string;
  hint: string;
  solution: string;
  further_study_links: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | '';
  exam_type: string;
  exam_year: string;
  status: 'draft' | 'published';
}

/**
 * QuestionForm Props
 */
interface QuestionFormProps {
  initialData?: Partial<QuestionFormData>;
  subjects: Subject[];
  isEditing?: boolean;
  questionId?: string;
}

const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'GCE'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);

/**
 * QuestionForm Component
 * Reusable form component for create/edit questions
 */
export function QuestionForm({ 
  initialData, 
  subjects, 
  isEditing = false,
  questionId 
}: QuestionFormProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState<QuestionFormData>({
    subject_id: initialData?.subject_id || '',
    topic_id: initialData?.topic_id || '',
    question_text: initialData?.question_text || '',
    passage: initialData?.passage || '',
    passage_id: initialData?.passage_id || '',
    question_image_url: initialData?.question_image_url || '',
    image_alt_text: initialData?.image_alt_text || '',
    image_width: initialData?.image_width || '',
    image_height: initialData?.image_height || '',
    option_a: initialData?.option_a || '',
    option_b: initialData?.option_b || '',
    option_c: initialData?.option_c || '',
    option_d: initialData?.option_d || '',
    option_e: initialData?.option_e || '',
    correct_answer: initialData?.correct_answer || '',
    explanation: initialData?.explanation || '',
    hint: initialData?.hint || '',
    solution: initialData?.solution || '',
    further_study_links: initialData?.further_study_links || '',
    difficulty: initialData?.difficulty || '',
    exam_type: initialData?.exam_type || '',
    exam_year: initialData?.exam_year || '',
    status: initialData?.status || 'draft',
  });
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showPassageSection, setShowPassageSection] = useState(!!initialData?.passage);
  const [showImageSection, setShowImageSection] = useState(!!initialData?.question_image_url);
  const [showExplanationSection, setShowExplanationSection] = useState(
    !!(initialData?.hint || initialData?.solution || initialData?.further_study_links)
  );
  
  // Fetch topics when subject changes
  const fetchTopics = useCallback(async (subjectId: string) => {
    if (!subjectId) {
      setTopics([]);
      return;
    }
    
    setIsLoadingTopics(true);
    try {
      const response = await fetch(`/api/admin/topics?subjectId=${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);
  
  useEffect(() => {
    if (formData.subject_id) {
      fetchTopics(formData.subject_id);
    }
  }, [formData.subject_id, fetchTopics]);
  
  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset topic when subject changes
      ...(name === 'subject_id' && { topic_id: '' }),
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.subject_id) {
      newErrors.subject_id = 'Subject is required';
    }
    
    if (!formData.topic_id) {
      newErrors.topic_id = 'Topic is required';
    }
    
    if (!formData.question_text.trim()) {
      newErrors.question_text = 'Question text is required';
    }
    
    if (!formData.option_a.trim()) {
      newErrors.option_a = 'Option A is required';
    }
    
    if (!formData.option_b.trim()) {
      newErrors.option_b = 'Option B is required';
    }
    
    if (!formData.correct_answer) {
      newErrors.correct_answer = 'Correct answer is required';
    } else {
      // Verify the correct answer option is filled
      const optionMap: Record<string, string> = {
        A: formData.option_a,
        B: formData.option_b,
        C: formData.option_c,
        D: formData.option_d,
        E: formData.option_e,
      };
      if (!optionMap[formData.correct_answer]?.trim()) {
        newErrors.correct_answer = `Option ${formData.correct_answer} must be filled when selected as correct answer`;
      }
    }
    
    if (!formData.difficulty) {
      newErrors.difficulty = 'Difficulty is required';
    }
    
    if (!formData.exam_type) {
      newErrors.exam_type = 'Exam type is required';
    }
    
    // Validate image alt text if image exists
    if (formData.question_image_url && !formData.image_alt_text.trim()) {
      newErrors.image_alt_text = 'Alt text is required when an image is uploaded';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (asDraft: boolean = false) => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        status: asDraft ? 'draft' : 'published',
        further_study_links: formData.further_study_links
          ? formData.further_study_links.split(',').map(l => l.trim()).filter(l => l)
          : [],
        exam_year: formData.exam_year ? parseInt(formData.exam_year, 10) : null,
        image_width: formData.image_width ? parseInt(formData.image_width, 10) : null,
        image_height: formData.image_height ? parseInt(formData.image_height, 10) : null,
        passage_id: formData.passage_id || null,
      };
      
      const url = isEditing 
        ? `/api/admin/questions/${questionId}` 
        : '/api/admin/questions';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (response.ok) {
        router.push('/admin/questions');
        router.refresh();
      } else {
        const data = await response.json();
        setErrors({ submit: data.message || 'Failed to save question' });
      }
    } catch (error) {
      console.error('Error saving question:', error);
      setErrors({ submit: 'An error occurred while saving the question' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex gap-6">
        {/* Form Section */}
        <div className={`flex-1 ${showPreview ? 'w-1/2' : 'w-full'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Question' : 'New Question'}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Error message */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {errors.submit}
                </div>
              )}
              
              {/* Section 1: Classification */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Classification
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject */}
                  <div>
                    <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subject_id"
                      name="subject_id"
                      value={formData.subject_id}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        errors.subject_id ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {errors.subject_id && (
                      <p className="mt-1 text-sm text-red-500">{errors.subject_id}</p>
                    )}
                  </div>
                  
                  {/* Topic */}
                  <div>
                    <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Topic <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="topic_id"
                      name="topic_id"
                      value={formData.topic_id}
                      onChange={handleChange}
                      disabled={!formData.subject_id || isLoadingTopics}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 ${
                        errors.topic_id ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">
                        {isLoadingTopics ? 'Loading...' : 'Select topic'}
                      </option>
                      {topics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                    {errors.topic_id && (
                      <p className="mt-1 text-sm text-red-500">{errors.topic_id}</p>
                    )}
                  </div>
                  
                  {/* Exam Type */}
                  <div>
                    <label htmlFor="exam_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="exam_type"
                      name="exam_type"
                      value={formData.exam_type}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        errors.exam_type ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select exam type</option>
                      {EXAM_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.exam_type && (
                      <p className="mt-1 text-sm text-red-500">{errors.exam_type}</p>
                    )}
                  </div>
                  
                  {/* Year */}
                  <div>
                    <label htmlFor="exam_year" className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <select
                      id="exam_year"
                      name="exam_year"
                      value={formData.exam_year}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select year</option>
                      {YEARS.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Difficulty */}
                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="difficulty"
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        errors.difficulty ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select difficulty</option>
                      {DIFFICULTIES.map(diff => (
                        <option key={diff} value={diff}>
                          {diff}
                        </option>
                      ))}
                    </select>
                    {errors.difficulty && (
                      <p className="mt-1 text-sm text-red-500">{errors.difficulty}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Section 2: Passage/Context (Collapsible) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowPassageSection(!showPassageSection)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showPassageSection ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Passage/Context (Optional)
                </button>
                
                {showPassageSection && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="passage" className="block text-sm font-medium text-gray-700 mb-1">
                        Passage Text
                      </label>
                      <textarea
                        id="passage"
                        name="passage"
                        value={formData.passage}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Enter passage or context for comprehension questions..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        For comprehension-style questions. Multiple questions can share the same passage.
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="passage_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Passage ID (Optional)
                      </label>
                      <input
                        type="text"
                        id="passage_id"
                        name="passage_id"
                        value={formData.passage_id}
                        onChange={handleChange}
                        placeholder="e.g., passage-001"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Use the same ID for questions that share this passage. This helps group related questions together.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Section 2.5: Image (Collapsible) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowImageSection(!showImageSection)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showImageSection ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Question Image (Optional)
                </button>
                
                {showImageSection && (
                  <div className="space-y-4">
                    <ImageUpload
                      value={formData.question_image_url}
                      onChange={(data) => {
                        if (data) {
                          setFormData(prev => ({
                            ...prev,
                            question_image_url: data.url,
                            image_width: String(data.width),
                            image_height: String(data.height),
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            question_image_url: '',
                            image_alt_text: '',
                            image_width: '',
                            image_height: '',
                          }));
                        }
                        // Clear error when image changes
                        if (errors.image_alt_text) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.image_alt_text;
                            return newErrors;
                          });
                        }
                      }}
                      onAltTextChange={(altText) => {
                        setFormData(prev => ({ ...prev, image_alt_text: altText }));
                        // Clear error when alt text is edited
                        if (errors.image_alt_text) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.image_alt_text;
                            return newErrors;
                          });
                        }
                      }}
                      altText={formData.image_alt_text}
                      error={errors.image_alt_text}
                    />
                    
                    {/* Image Dimensions (Read-only, auto-filled) */}
                    {formData.question_image_url && formData.image_width && formData.image_height && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Image Dimensions</p>
                        <p className="text-sm text-gray-600">
                          {formData.image_width} × {formData.image_height} pixels
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Section 3: Question Content */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Question Content
                </h3>
                
                {/* Question Text */}
                <div>
                  <label htmlFor="question_text" className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="question_text"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter the question..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      errors.question_text ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.question_text && (
                    <p className="mt-1 text-sm text-red-500">{errors.question_text}</p>
                  )}
                </div>
                
                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D', 'E'].map((option) => {
                    const fieldName = `option_${option.toLowerCase()}` as keyof QuestionFormData;
                    const isRequired = option === 'A' || option === 'B';
                    
                    return (
                      <div key={option}>
                        <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
                          Option {option} {isRequired && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id={fieldName}
                            name={fieldName}
                            value={formData[fieldName] as string}
                            onChange={handleChange}
                            placeholder={`Enter option ${option}${!isRequired ? ' (optional)' : ''}`}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              errors[fieldName] ? 'border-red-500' : 'border-gray-200'
                            }`}
                          />
                          {formData.correct_answer === option && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                              <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        {errors[fieldName] && (
                          <p className="mt-1 text-sm text-red-500">{errors[fieldName]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {['A', 'B', 'C', 'D', 'E'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition-colors ${
                          formData.correct_answer === option
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="correct_answer"
                          value={option}
                          checked={formData.correct_answer === option}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  {errors.correct_answer && (
                    <p className="mt-1 text-sm text-red-500">{errors.correct_answer}</p>
                  )}
                </div>
              </div>
              
              {/* Section 4: Explanation (Collapsible) */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowExplanationSection(!showExplanationSection)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showExplanationSection ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Explanation (Optional)
                </button>
                
                {showExplanationSection && (
                  <div className="space-y-4">
                    {/* Hint */}
                    <div>
                      <label htmlFor="hint" className="block text-sm font-medium text-gray-700 mb-1">
                        Hint
                      </label>
                      <input
                        type="text"
                        id="hint"
                        name="hint"
                        value={formData.hint}
                        onChange={handleChange}
                        placeholder="Brief pointer to help the student..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    {/* Explanation */}
                    <div>
                      <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
                        Brief Explanation
                      </label>
                      <textarea
                        id="explanation"
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Short explanation of the answer..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    {/* Solution */}
                    <div>
                      <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-1">
                        Detailed Solution
                      </label>
                      <textarea
                        id="solution"
                        name="solution"
                        value={formData.solution}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Step-by-step worked solution..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    {/* Further Study Links */}
                    <div>
                      <label htmlFor="further_study_links" className="block text-sm font-medium text-gray-700 mb-1">
                        Further Study Links
                      </label>
                      <input
                        type="text"
                        id="further_study_links"
                        name="further_study_links"
                        value={formData.further_study_links}
                        onChange={handleChange}
                        placeholder="Comma-separated URLs..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Separate multiple URLs with commas
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Publish Question')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview Section */}
        {showPreview && (
          <div className="w-1/2">
            <QuestionPreview
              questionText={formData.question_text}
              passage={formData.passage}
              imageUrl={formData.question_image_url}
              imageAltText={formData.image_alt_text}
              options={{
                A: formData.option_a,
                B: formData.option_b,
                C: formData.option_c,
                D: formData.option_d,
                E: formData.option_e,
              }}
              correctAnswer={formData.correct_answer}
              hint={formData.hint}
              explanation={formData.explanation}
              solution={formData.solution}
              difficulty={formData.difficulty}
              examType={formData.exam_type}
              examYear={formData.exam_year}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionForm;
