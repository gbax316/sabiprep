'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable, type ColumnDef, type PaginationInfo } from '@/components/admin';
import { Modal } from '@/components/common';

/**
 * Question with relations type
 */
interface QuestionWithRelations {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage?: string;
  passage_id?: string;
  question_image_url?: string;
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
  subject?: { name: string; slug: string };
  topic?: { name: string; slug: string };
  creator?: { full_name: string };
}

/**
 * Subject type
 */
interface Subject {
  id: string;
  name: string;
  slug: string;
}

/**
 * Topic type
 */
interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'GCE'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const STATUSES = ['draft', 'published', 'archived'];
const PAGE_SIZES = [10, 25, 50, 100];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);

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

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Questions Management Page
 */
export default function QuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: searchParams?.get('search') || '',
    subjectId: searchParams?.get('subjectId') || '',
    topicId: searchParams?.get('topicId') || '',
    examType: searchParams?.get('examType') || '',
    year: searchParams?.get('year') || '',
    difficulty: searchParams?.get('difficulty') || '',
    status: searchParams?.get('status') || '',
    hasPassage: searchParams?.get('hasPassage') || '',
    hasImage: searchParams?.get('hasImage') || '',
  });
  
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
      }
    };
    fetchSubjects();
  }, []);
  
  // Fetch topics when subject changes
  useEffect(() => {
    const fetchTopics = async () => {
      if (!filters.subjectId) {
        setTopics([]);
        return;
      }
      
      setIsLoadingTopics(true);
      try {
        const response = await fetch(`/api/admin/topics?subjectId=${filters.subjectId}`);
        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
        }
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setIsLoadingTopics(false);
      }
    };
    fetchTopics();
  }, [filters.subjectId]);
  
  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));
      
      if (filters.search) params.set('search', filters.search);
      if (filters.subjectId) params.set('subjectId', filters.subjectId);
      if (filters.topicId) params.set('topicId', filters.topicId);
      if (filters.examType) params.set('examType', filters.examType);
      if (filters.year) params.set('year', filters.year);
      if (filters.difficulty) params.set('difficulty', filters.difficulty);
      if (filters.status) params.set('status', filters.status);
      if (filters.hasPassage) params.set('hasPassage', filters.hasPassage);
      if (filters.hasImage) params.set('hasImage', filters.hasImage);
      
      const response = await fetch(`/api/admin/questions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);
  
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);
  
  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset topic when subject changes
      ...(key === 'subjectId' && { topicId: '' }),
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };
  
  // Handle selection change
  const handleSelectionChange = (selected: QuestionWithRelations[]) => {
    setSelectedQuestions(selected);
  };
  
  // Handle delete click
  const handleDeleteClick = (question: QuestionWithRelations) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };
  
  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/questions/${questionToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    }
  };
  
  // Handle bulk action
  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedQuestions.length === 0) return;
    
    setIsBulkActionLoading(true);
    try {
      const questionIds = selectedQuestions.map(q => q.id);
      
      if (action === 'delete') {
        const response = await fetch('/api/admin/questions/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_ids: questionIds }),
        });
        
        if (response.ok) {
          setSelectedQuestions([]);
          await fetchQuestions();
        }
      } else {
        const response = await fetch('/api/admin/questions/bulk', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_ids: questionIds, action }),
        });
        
        if (response.ok) {
          setSelectedQuestions([]);
          await fetchQuestions();
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} questions:`, error);
    } finally {
      setIsBulkActionLoading(false);
    }
  };
  
  // Table columns
  const columns: ColumnDef<QuestionWithRelations>[] = [
    {
      key: 'question_text',
      header: 'Question',
      render: (item) => (
        <div className="max-w-md">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {truncateText(item.question_text, 100)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {item.subject?.name} / {item.topic?.name}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {item.passage && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600" title="Has passage">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
              )}
              {item.question_image_url && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-100 text-purple-600" title="Has image">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              )}
              {item.passage_id && (
                <span className="inline-flex items-center justify-center px-1.5 h-6 rounded bg-indigo-100 text-indigo-600 text-xs font-medium" title={`Passage ID: ${item.passage_id}`}>
                  {item.passage_id.substring(0, 3)}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'exam_type',
      header: 'Exam',
      render: (item) => (
        <div className="flex flex-col gap-1">
          {item.exam_type && (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getExamTypeBadge(item.exam_type)}`}>
              {item.exam_type}
            </span>
          )}
          {item.exam_year && (
            <span className="text-xs text-gray-500">{item.exam_year}</span>
          )}
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (item) => (
        item.difficulty ? (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(item.difficulty)}`}>
            {item.difficulty}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusBadge(item.status)}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'creator',
      header: 'Created By',
      render: (item) => (
        <span className="text-sm text-gray-600">
          {item.creator?.full_name || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      accessor: (item) => item.created_at,
      render: (item) => (
        <span className="text-sm text-gray-600">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-600">Manage the question bank</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/questions/passages"
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Passages
          </Link>
          <Link
            href="/admin/content"
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Import CSV
          </Link>
          <Link
            href="/admin/questions/new"
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Add Question
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search questions..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject
            </label>
            <select
              value={filters.subjectId}
              onChange={(e) => handleFilterChange('subjectId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Topic */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Topic
            </label>
            <select
              value={filters.topicId}
              onChange={(e) => handleFilterChange('topicId', e.target.value)}
              disabled={!filters.subjectId || isLoadingTopics}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
            >
              <option value="">
                {isLoadingTopics ? 'Loading...' : 'All Topics'}
              </option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Exam Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Exam Type
            </label>
            <select
              value={filters.examType}
              onChange={(e) => handleFilterChange('examType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Exams</option>
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Years</option>
              {YEARS.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Difficulty
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(diff => (
                <option key={diff} value={diff}>
                  {diff}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(status => (
                <option key={status} value={status} className="capitalize">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Page Size */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Per Page
            </label>
            <select
              value={pagination.limit}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PAGE_SIZES.map(size => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
          
          {/* Has Passage Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Content Type
            </label>
            <select
              value={filters.hasPassage}
              onChange={(e) => handleFilterChange('hasPassage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Questions</option>
              <option value="true">With Passage</option>
              <option value="false">Without Passage</option>
            </select>
          </div>
          
          {/* Has Image Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Media
            </label>
            <select
              value={filters.hasImage}
              onChange={(e) => handleFilterChange('hasImage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Questions</option>
              <option value="true">With Image</option>
              <option value="false">Without Image</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {selectedQuestions.length > 0 && (
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
          <span className="text-sm text-emerald-700">
            {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Publish Selected
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              Archive Selected
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}
      
      {/* Questions Table */}
      <DataTable
        data={questions}
        columns={columns}
        isLoading={isLoading}
        selectable
        onSelectionChange={handleSelectionChange}
        keyAccessor={(item) => item.id}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No questions found"
        showSearch={false}
        onRowClick={(item) => router.push(`/admin/questions/${item.id}`)}
        rowActions={(item) => (
          <div className="flex gap-2">
            <Link
              href={`/admin/questions/${item.id}`}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
            <Link
              href={`/admin/questions/${item.id}/edit`}
              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(item);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setQuestionToDelete(null);
        }}
        title="Archive Question"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to archive this question? The question will be moved to archived status and won&apos;t be shown to students.
          </p>
          {questionToDelete && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 line-clamp-2">
                {truncateText(questionToDelete.question_text, 150)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setQuestionToDelete(null);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
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
