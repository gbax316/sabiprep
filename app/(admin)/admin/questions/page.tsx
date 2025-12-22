'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  AdminTable,
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminHeader,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminButton,
  AdminBadge,
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogDescription,
  AdminDialogFooter,
  type ColumnDef,
  type PaginationInfo,
} from '@/components/admin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
 * Get difficulty badge status
 */
function getDifficultyStatus(difficulty: string): 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default' {
  switch (difficulty) {
    case 'Easy':
      return 'success';
    case 'Medium':
      return 'warning';
    case 'Hard':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Get status badge status
 */
function getStatusBadgeStatus(status: string): 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default' {
  switch (status) {
    case 'draft':
      return 'pending';
    case 'published':
      return 'success';
    case 'archived':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get exam type badge classes
 */
function getExamTypeBadge(examType: string): string {
  switch (examType) {
    case 'WAEC':
      return 'bg-blue-600 text-white';
    case 'JAMB':
      return 'bg-purple-600 text-white';
    case 'NECO':
      return 'bg-orange-600 text-white';
    case 'GCE':
      return 'bg-teal-600 text-white';
    default:
      return 'bg-gray-600 text-white';
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
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                {truncateText(item.question_text, 100)}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                {item.subject?.name} / {item.topic?.name}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {item.passage && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white shadow-sm" title="Has passage">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              )}
              {item.question_image_url && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-purple-600 text-white shadow-sm" title="Has image">
                  <Image className="w-3.5 h-3.5" />
                </span>
              )}
              {item.passage_id && (
                <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-sm" title={`Passage ID: ${item.passage_id}`}>
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
            <span className="text-xs text-muted-foreground font-medium">{item.exam_year}</span>
          )}
        </div>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (item) => (
        item.difficulty ? (
          <AdminBadge status={getDifficultyStatus(item.difficulty)}>
            {item.difficulty}
          </AdminBadge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <AdminBadge status={getStatusBadgeStatus(item.status)}>
          {item.status}
        </AdminBadge>
      ),
    },
    {
      key: 'creator',
      header: 'Created By',
      render: (item) => (
        <span className="text-sm text-muted-foreground">
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
        <span className="text-sm text-muted-foreground">
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
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Filter className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <AdminCardTitle>Filters</AdminCardTitle>
                <p className="text-xs text-muted-foreground mt-1">Refine your question search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <AdminButton
                  variant="destructive"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  <X className="w-4 h-4" />
                  Clear All
                </AdminButton>
              )}
              <AdminSecondaryButton
                size="sm"
                onClick={fetchQuestions}
                disabled={isLoading}
              >
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </AdminSecondaryButton>
            </div>
          </div>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 xl:col-span-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search questions..."
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={filters.subjectId || 'all'}
                onValueChange={(value) => handleFilterChange('subjectId', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="subject" className="mt-2">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id} className="text-gray-900">
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Topic */}
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Select
                value={filters.topicId || 'all'}
                onValueChange={(value) => handleFilterChange('topicId', value === 'all' ? '' : value)}
                disabled={!filters.subjectId || isLoadingTopics}
              >
                <SelectTrigger id="topic" className="mt-2">
                  <SelectValue placeholder={isLoadingTopics ? 'Loading...' : 'All Topics'} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Topics</SelectItem>
                  {topics.map(topic => (
                    <SelectItem key={topic.id} value={topic.id} className="text-gray-900">
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Exam Type */}
            <div>
              <Label htmlFor="examType">Exam Type</Label>
              <Select
                value={filters.examType || 'all'}
                onValueChange={(value) => handleFilterChange('examType', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="examType" className="mt-2">
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Exams</SelectItem>
                  {EXAM_TYPES.map(type => (
                    <SelectItem key={type} value={type} className="text-gray-900">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Year */}
            <div>
              <Label htmlFor="year">Year</Label>
              <Select
                value={filters.year || 'all'}
                onValueChange={(value) => handleFilterChange('year', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="year" className="mt-2">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()} className="text-gray-900">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Difficulty */}
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={filters.difficulty || 'all'}
                onValueChange={(value) => handleFilterChange('difficulty', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="difficulty" className="mt-2">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Difficulties</SelectItem>
                  {DIFFICULTIES.map(diff => (
                    <SelectItem key={diff} value={diff} className="text-gray-900">
                      {diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="status" className="mt-2">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status} className="text-gray-900">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Has Passage Filter */}
            <div>
              <Label htmlFor="hasPassage">Content Type</Label>
              <Select
                value={filters.hasPassage || 'all'}
                onValueChange={(value) => handleFilterChange('hasPassage', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="hasPassage" className="mt-2">
                  <SelectValue placeholder="All Questions" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all" className="text-gray-900">All Questions</SelectItem>
                  <SelectItem value="true" className="text-gray-900">With Passage</SelectItem>
                  <SelectItem value="false" className="text-gray-900">Without Passage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Has Image Filter */}
            <div>
              <Label htmlFor="hasImage">Media</Label>
              <Select
                value={filters.hasImage || 'all'}
                onValueChange={(value) => handleFilterChange('hasImage', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="hasImage" className="mt-2">
                  <SelectValue placeholder="All Questions" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="all" className="text-gray-900">All Questions</SelectItem>
                  <SelectItem value="true" className="text-gray-900">With Image</SelectItem>
                  <SelectItem value="false" className="text-gray-900">Without Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>
      
      {/* Bulk Actions Bar */}
      {selectedQuestions.length > 0 && (
        <AdminCard className="bg-emerald-50 border-emerald-200">
          <AdminCardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-700">
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  onClick={() => handleBulkAction('publish')}
                  disabled={isBulkActionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Publish
                </AdminButton>
                <AdminButton
                  onClick={() => handleBulkAction('archive')}
                  disabled={isBulkActionLoading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </AdminButton>
                <AdminButton
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                  disabled={isBulkActionLoading}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </AdminButton>
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}
      
      {/* Questions Table */}
      <AdminCard>
        <AdminCardContent className="p-0">
          <AdminTable
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
                <AdminButton
                  variant="default"
                  size="icon"
                  href={`/admin/questions/${item.id}`}
                  onClick={(e) => e.stopPropagation()}
                  title="View"
                >
                  <Eye className="w-4 h-4 text-gray-900" />
                </AdminButton>
                <AdminButton
                  variant="default"
                  size="icon"
                  href={`/admin/questions/${item.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  title="Edit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </AdminButton>
                <AdminButton
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(item);
                  }}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-gray-900" />
                </AdminButton>
              </div>
            )}
          />
        </AdminCardContent>
      </AdminCard>
      
      {/* Delete Confirmation Modal */}
      <AdminDialog open={showDeleteModal} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteModal(false);
          setQuestionToDelete(null);
        }
      }}>
        <AdminDialogContent size="md">
          <AdminDialogHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center flex-shrink-0">
                <Archive className="w-6 h-6 text-destructive-foreground" />
              </div>
              <div>
                <AdminDialogTitle>Archive Question</AdminDialogTitle>
                <AdminDialogDescription className="mt-2">
                  Are you sure you want to archive this question? The question will be moved to archived status and won&apos;t be shown to students.
                </AdminDialogDescription>
              </div>
            </div>
          </AdminDialogHeader>
          {questionToDelete && (
            <div className="p-4 bg-muted rounded-xl border">
              <p className="text-sm text-foreground line-clamp-3">
                {truncateText(questionToDelete.question_text, 150)}
              </p>
            </div>
          )}
          <AdminDialogFooter>
            <AdminSecondaryButton
              onClick={() => {
                setShowDeleteModal(false);
                setQuestionToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AdminSecondaryButton>
            <AdminButton
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Question
                </>
              )}
            </AdminButton>
          </AdminDialogFooter>
        </AdminDialogContent>
      </AdminDialog>
    </div>
  );
}
