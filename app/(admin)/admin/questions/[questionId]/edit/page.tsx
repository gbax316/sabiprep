'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuestionForm, type QuestionFormData } from '@/components/admin';

/**
 * Subject type
 */
interface Subject {
  id: string;
  name: string;
  slug: string;
}

/**
 * Question type
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
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string;
  hint?: string;
  solution?: string;
  further_study_links?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  exam_type?: string;
  exam_year?: number;
  status: 'draft' | 'published' | 'archived';
}

interface PageProps {
  params: Promise<{
    questionId: string;
  }>;
}

/**
 * Edit Question Page
 */
export default function EditQuestionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { questionId } = resolvedParams;
  const router = useRouter();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch subjects and question
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch subjects
        const subjectsResponse = await fetch('/api/admin/subjects');
        if (subjectsResponse.ok) {
          const subjectsData = await subjectsResponse.json();
          setSubjects(subjectsData.subjects || []);
        }
        
        // Fetch question
        const questionResponse = await fetch(`/api/admin/questions/${questionId}`);
        if (questionResponse.ok) {
          const questionData = await questionResponse.json();
          setQuestion(questionData.data.question);
        } else if (questionResponse.status === 404) {
          setError('Question not found');
        } else {
          setError('Failed to load question');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load question');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [questionId]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded" />
        </div>
        <div className="h-96 bg-gray-200 rounded-xl" />
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
  
  // Transform question to form data format
  const initialData: Partial<QuestionFormData> = {
    subject_id: question.subject_id,
    topic_id: question.topic_id,
    question_text: question.question_text,
    passage: question.passage || '',
    passage_id: question.passage_id || '',
    question_image_url: question.question_image_url || '',
    image_alt_text: question.image_alt_text || '',
    image_width: question.image_width?.toString() || '',
    image_height: question.image_height?.toString() || '',
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c || '',
    option_d: question.option_d || '',
    option_e: question.option_e || '',
    correct_answer: question.correct_answer,
    explanation: question.explanation || '',
    hint: question.hint || '',
    solution: question.solution || '',
    further_study_links: question.further_study_links?.join(', ') || '',
    difficulty: question.difficulty || '',
    exam_type: question.exam_type || '',
    exam_year: question.exam_year?.toString() || '',
    status: question.status === 'archived' ? 'draft' : question.status,
  };
  
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
              <Link href={`/admin/questions/${questionId}`} className="hover:text-gray-700">
                View
              </Link>
              <span>/</span>
              <span className="text-gray-900">Edit</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <QuestionForm 
        subjects={subjects} 
        initialData={initialData} 
        isEditing 
        questionId={questionId}
      />
    </div>
  );
}
