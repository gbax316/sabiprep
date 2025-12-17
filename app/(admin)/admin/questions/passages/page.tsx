'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Passage group type
 */
interface PassageGroup {
  passage_id: string;
  passage_text: string;
  question_count: number;
  subject_name?: string;
  topic_name?: string;
  created_at: string;
}

/**
 * Question in passage type
 */
interface PassageQuestion {
  id: string;
  question_text: string;
  difficulty?: string;
  status: string;
  created_at: string;
}

/**
 * Passages Management Page
 */
export default function PassagesPage() {
  const router = useRouter();
  const [passages, setPassages] = useState<PassageGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPassage, setSelectedPassage] = useState<PassageGroup | null>(null);
  const [passageQuestions, setPassageQuestions] = useState<PassageQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Fetch all passages
  useEffect(() => {
    const fetchPassages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/questions/by-passage');
        if (response.ok) {
          const data = await response.json();
          setPassages(data.data.passages || []);
        }
      } catch (error) {
        console.error('Failed to fetch passages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPassages();
  }, []);

  // Fetch questions for a specific passage
  const fetchPassageQuestions = async (passageId: string) => {
    setIsLoadingQuestions(true);
    try {
      const response = await fetch(`/api/admin/questions/by-passage?passageId=${passageId}`);
      if (response.ok) {
        const data = await response.json();
        setPassageQuestions(data.data.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch passage questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Handle passage selection
  const handlePassageClick = (passage: PassageGroup) => {
    setSelectedPassage(passage);
    fetchPassageQuestions(passage.passage_id);
  };

  // Get difficulty badge color
  const getDifficultyBadge = (difficulty: string): string => {
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
  };

  // Get status badge color
  const getStatusBadge = (status: string): string => {
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
  };

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
            <span className="text-gray-900">Passages</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Passage Management</h1>
          <p className="text-gray-600">Manage questions grouped by passages</p>
        </div>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Add Question
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Passages List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Passages ({passages.length})
            </h2>
            <p className="text-sm text-gray-600">Click a passage to view its questions</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[calc(100vh-300px)] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading passages...</p>
              </div>
            ) : passages.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-sm text-gray-500 mb-4">No passages found</p>
                <Link
                  href="/admin/questions/new"
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Create a question with a passage
                </Link>
              </div>
            ) : (
              passages.map((passage) => (
                <button
                  key={passage.passage_id}
                  onClick={() => handlePassageClick(passage)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedPassage?.passage_id === passage.passage_id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {passage.passage_id}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {passage.question_count} {passage.question_count === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {passage.passage_text}
                      </p>
                      {(passage.subject_name || passage.topic_name) && (
                        <p className="text-xs text-gray-500">
                          {passage.subject_name} {passage.topic_name && `/ ${passage.topic_name}`}
                        </p>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Passage Questions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {selectedPassage ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedPassage.passage_id}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedPassage.question_count} {selectedPassage.question_count === 1 ? 'question' : 'questions'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPassage(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedPassage.passage_text}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[calc(100vh-450px)] overflow-y-auto">
                {isLoadingQuestions ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading questions...</p>
                  </div>
                ) : passageQuestions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-500">No questions found</p>
                  </div>
                ) : (
                  passageQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/questions/${question.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                            {question.question_text}
                          </p>
                          <div className="flex items-center gap-2">
                            {question.difficulty && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(question.difficulty)}`}>
                                {question.difficulty}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(question.status)}`}>
                              {question.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link
                            href={`/admin/questions/${question.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/admin/questions/${question.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500">Select a passage to view its questions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}