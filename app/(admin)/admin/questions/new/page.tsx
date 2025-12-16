'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { QuestionForm } from '@/components/admin';

/**
 * Subject type
 */
interface Subject {
  id: string;
  name: string;
  slug: string;
}

/**
 * New Question Page
 */
export default function NewQuestionPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/admin/subjects');
        if (response.ok) {
          const data = await response.json();
          setSubjects(data.subjects || []);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);
  
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
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/questions" className="hover:text-gray-700">
              Questions
            </Link>
            <span>/</span>
            <span className="text-gray-900">New Question</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Question</h1>
        </div>
      </div>
      
      {/* Form */}
      <QuestionForm subjects={subjects} />
    </div>
  );
}
