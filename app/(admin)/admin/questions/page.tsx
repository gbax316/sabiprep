'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable, type ColumnDef, type PaginationInfo, AdminHeader, AdminPrimaryButton, AdminSecondaryButton } from '@/components/admin';
import { Modal } from '@/components/common';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  Image,
  FileText,
  RefreshCcw,
  X,
  ChevronDown,
  Archive,
  CheckCircle,
} from 'lucide-react';

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
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);

/**
 * Get difficulty badge classes
 */
function getDifficultyBadge(difficulty: string): string {
  switch (difficulty) {
    case 'Easy':
      return 'bg-emerald-600 dark:bg-emerald-700 text-white';
    case 'Medium':
      return 'bg-amber-600 dark:bg-amber-700 text-white';
    case 'Hard':
      return 'bg-red-600 dark:bg-red-700 text-white';
    default:
      return 'bg-gray-600 dark:bg-gray-700 text-white';
  }
}

/**
 * Get status badge classes
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-600 dark:bg-gray-700 text-white';
    case 'published':
      return 'bg-emerald-600 dark:bg-emerald-700 text-white';
    case 'archived':
      return 'bg-amber-600 dark:bg-amber-700 text-white';
    default:
      return 'bg-gray-600 dark:bg-gray-700 text-white';
  }
}

/**
 * Get exam type badge classes
 */
function getExamTypeBadge(examType: string): string {
  switch (examType) {
    case 'WAEC':
      return 'bg-blue-600 dark:bg-blue-700 text-white';
    case 'JAMB':
      return 'bg-purple-600 dark:bg-purple-700 text-white';
    case 'NECO':
      return 'bg-orange-600 dark:bg-orange-700 text-white';
    case 'GCE':
      return 'bg-teal-600 dark:bg-teal-700 text-white';
    default:
      return 'bg-gray-600 dark:bg-gray-700 text-white';
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
              <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                {truncateText(item.question_text, 100)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {item.subject?.name} / {item.topic?.name}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {item.passage && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 dark:bg-blue-700 text-white shadow-sm" title="Has passage">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              )}
              {item.question_image_url && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-600 dark:bg-purple-700 text-white shadow-sm" title="Has image">
                  <Image className="w-3.5 h-3.5" />
                </span>
              )}
              {item.passage_id && (
                <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white text-xs font-semibold shadow-sm" title={`Passage ID: ${item.passage_id}`}>
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
            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm ${getExamTypeBadge(item.exam_type)}`}>
              {item.exam_type}
            </span>
          )}
          {item.exam_year && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.exam_year}</span>
          )}
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (item) => (
        item.difficulty ? (
          <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm ${getDifficultyBadge(item.difficulty)}`}>
            {item.difficulty}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">-</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg capitalize shadow-sm ${getStatusBadge(item.status)}`}>
          <span className="w-2 h-2 rounded-full bg-white" />
          {item.status}
        </span>
      ),
    },
    {
      key: 'creator',
      header: 'Created By',
      render: (item) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
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
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];
  
  // Check if filters are active
  const hasActiveFilters = filters.search || filters.subjectId || filters.topicId || 
    filters.examType || filters.year || filters.difficulty || filters.status || 
    filters.hasPassage || filters.hasImage;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      subjectId: '',
      topicId: '',
      examType: '',
      year: '',
      difficulty: '',
      status: '',
      hasPassage: '',
      hasImage: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminHeader
        title="Questions"
        subtitle={`Manage your question bank (${pagination.total.toLocaleString()} total)`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Questions' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AdminSecondaryButton href="/admin/questions/passages">
              <BookOpen className="w-4 h-4" />
              Passages
            </AdminSecondaryButton>
            <AdminSecondaryButton href="/admin/import">
              Import CSV
            </AdminSecondaryButton>
            <AdminPrimaryButton href="/admin/questions/new">
              <Plus className="w-4 h-4" />
              Add Question
            </AdminPrimaryButton>
          </div>
        }
      />
      
      {/* Filters Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-700 flex items-center justify-center shadow-sm">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Refine your question search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
              <button
                onClick={fetchQuestions}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 xl:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search questions..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            
            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={filters.subjectId}
                onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Topic
              </label>
              <select
                value={filters.topicId}
                onChange={(e) => handleFilterChange('topicId', e.target.value)}
                disabled={!filters.subjectId || isLoadingTopics}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Exam Type
              </label>
              <select
                value={filters.examType}
                onChange={(e) => handleFilterChange('examType', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status} className="capitalize">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Has Passage Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Content Type
              </label>
              <select
                value={filters.hasPassage}
                onChange={(e) => handleFilterChange('hasPassage', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="">All Questions</option>
                <option value="true">With Passage</option>
                <option value="false">Without Passage</option>
              </select>
            </div>
            
            {/* Has Image Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Media
              </label>
              <select
                value={filters.hasImage}
                onChange={(e) => handleFilterChange('hasImage', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option value="">All Questions</option>
                <option value="true">With Image</option>
                <option value="false">Without Image</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {selectedQuestions.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
            </span>
          </div>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              disabled={isBulkActionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50 font-medium transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Publish
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              disabled={isBulkActionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 font-medium transition-colors shadow-sm"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkActionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-50 font-medium transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
      
      {/* Questions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <DataTable
          data={questions}
          columns={columns}
          isLoading={isLoading}
          selectable
          onSelectionChange={handleSelectionChange}
          keyAccessor={(item) => item.id}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          emptyMessage="No questions found"
          showSearch={false}
          onRowClick={(item) => router.push(`/admin/questions/${item.id}`)}
          rowActions={(item) => (
            <div className="flex gap-1">
              <Link
                href={`/admin/questions/${item.id}`}
                className="p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-all duration-200 shadow-sm"
                onClick={(e) => e.stopPropagation()}
                title="View"
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                href={`/admin/questions/${item.id}/edit`}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-all duration-200 shadow-sm"
                onClick={(e) => e.stopPropagation()}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(item);
                }}
                className="p-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-sm"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setQuestionToDelete(null);
        }}
        title="Archive Question"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-600 dark:bg-red-700 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Archive className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to archive this question? The question will be moved to archived status and won&apos;t be shown to students.
              </p>
            </div>
          </div>
          {questionToDelete && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {truncateText(questionToDelete.question_text, 150)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setQuestionToDelete(null);
              }}
              className="px-4 py-2.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors shadow-sm"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm"
            >
              {isDeleting ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Archive Question
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
