'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuestionPreview } from '@/components/admin';
import { Modal } from '@/components/common';

/**
 * Question type with full details
 */
interface QuestionDetail {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage?: string;
  passage_id?: string;
  question_image_url?: string;
  image_alt_text?: string;
  image_width?: number;
  image_height?: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string;
  correct_answer: string;
  explanation?: string;
  hint?: string;
  solution?: string;
  further_study_links?: string[];
  difficulty?: string;
  exam_type?: string;
  exam_year?: number;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  subject?: { id: string; name: string; slug: string };
  topic?: { id: string; name: string; slug: string };
  creator?: { id: string; full_name: string; email: string };
  usage_stats?: {
    times_answered: number;
    times_correct: number;
    accuracy: number;
  };
}

/**
 * Get difficulty badge classes
 */
function getDifficultyBadge(difficulty: string): string {
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
 * Get status badge classes
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'published':
      return 'bg-green-100 text-green-700';
    case 'archived':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get exam type badge classes
 */
function getExamTypeBadge(examType: string): string {
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

interface PageProps {
  params: Promise<{
    questionId: string;
  }>;
}

/**
 * Question Detail Page
 */
export default function QuestionDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { questionId } = resolvedParams;
  
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch question
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const response = await fetch(`/api/admin/questions/${questionId}`);
        if (response.ok) {
          const data = await response.json();
          setQuestion(data.data.question);
        } else if (response.status === 404) {
          setError('Question not found');
        } else {
          setError('Failed to load question');
        }
      } catch (err) {
        console.error('Failed to fetch question:', err);
        setError('Failed to load question');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestion();
  }, [questionId]);
  
  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/admin/questions');
      } else {
        setError('Failed to delete question');
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
      setError('Failed to delete question');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };
  
  // Handle duplicate
  const handleDuplicate = () => {
    if (question) {
      // Store question data in sessionStorage for the new form
      sessionStorage.setItem('duplicateQuestion', JSON.stringify({
        subject_id: question.subject_id,
        topic_id: question.topic_id,
        question_text: question.question_text,
        passage: question.passage,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        option_e: question.option_e,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        hint: question.hint,
        solution: question.solution,
        further_study_links: question.further_study_links?.join(', '),
        difficulty: question.difficulty,
        exam_type: question.exam_type,
        exam_year: question.exam_year?.toString(),
      }));
      router.push('/admin/questions/new');
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-24 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-xl" />
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !question) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Question not found'}</h2>
        <Link href="/admin/questions" className="text-emerald-600 hover:text-emerald-700">
          Back to Questions
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
            title="Go back"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin/questions" className="hover:text-gray-700">
                Questions
              </Link>
              <span>/</span>
              <span className="text-gray-900">View Question</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Question Details</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <Link
            href={`/admin/questions/${questionId}/edit`}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Archive
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Question Details */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Metadata
            </h2>
            
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(question.status)}`}>
                  {question.status}
                </span>
              </div>
              
              {/* Subject */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subject</span>
                <span className="text-sm font-medium text-gray-900">{question.subject?.name || '-'}</span>
              </div>
              
              {/* Topic */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Topic</span>
                <span className="text-sm font-medium text-gray-900">{question.topic?.name || '-'}</span>
              </div>
              
              {/* Exam Type */}
              {question.exam_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Exam Type</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getExamTypeBadge(question.exam_type)}`}>
                    {question.exam_type}
                  </span>
                </div>
              )}
              
              {/* Year */}
              {question.exam_year && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Year</span>
                  <span className="text-sm font-medium text-gray-900">{question.exam_year}</span>
                </div>
              )}
              
              {/* Difficulty */}
              {question.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Difficulty</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(question.difficulty)}`}>
                    {question.difficulty}
                  </span>
                </div>
              )}
            </div>
            
            {/* Passage Info */}
            {(question.passage || question.passage_id) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Passage Information
                </h3>
                {question.passage_id && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Passage ID</span>
                    <Link
                      href={`/admin/questions/passages?selected=${question.passage_id}`}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      {question.passage_id}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                )}
                {question.passage && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Passage Text:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{question.passage}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Image Info */}
            {question.question_image_url && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Image Information
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Has Image</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Yes
                    </span>
                  </div>
                  {question.image_width && question.image_height && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Dimensions</span>
                      <span className="text-gray-900 font-medium">
                        {question.image_width} × {question.image_height}px
                      </span>
                    </div>
                  )}
                  {question.image_alt_text && (
                    <div className="text-sm">
                      <span className="text-gray-600 block mb-1">Alt Text:</span>
                      <p className="text-gray-900 italic">&quot;{question.image_alt_text}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Usage Statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Usage Statistics
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {question.usage_stats?.times_answered || 0}
                </p>
                <p className="text-xs text-gray-500">Times Used</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {question.usage_stats?.times_correct || 0}
                </p>
                <p className="text-xs text-gray-500">Correct</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">
                  {question.usage_stats?.accuracy || 0}%
                </p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </div>
          </div>
          
          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Activity
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created</span>
                <span className="text-gray-900">
                  {new Date(question.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Updated</span>
                <span className="text-gray-900">
                  {new Date(question.updated_at).toLocaleString()}
                </span>
              </div>
              {question.creator && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created By</span>
                  <span className="text-gray-900">{question.creator.full_name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Further Study Links */}
          {question.further_study_links && question.further_study_links.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Further Study Links
              </h2>
              
              <div className="space-y-2">
                {question.further_study_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-emerald-600 hover:text-emerald-700 truncate"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column - Preview */}
        <div>
          <QuestionPreview
            questionText={question.question_text}
            passage={question.passage}
            imageUrl={question.question_image_url}
            imageAltText={question.image_alt_text}
            options={{
              A: question.option_a,
              B: question.option_b,
              C: question.option_c,
              D: question.option_d,
              E: question.option_e || '',
            }}
            correctAnswer={question.correct_answer}
            hint={question.hint}
            explanation={question.explanation}
            solution={question.solution}
            difficulty={question.difficulty}
            examType={question.exam_type}
            examYear={question.exam_year?.toString()}
          />
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Archive Question"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to archive this question? The question will be moved to archived status and won&apos;t be shown to students.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Archiving...' : 'Archive Question'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
