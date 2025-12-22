'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminTable,
  AdminBadge,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminButton,
  type ColumnDef,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Play,
  List,
  Eye,
  HelpCircle,
  ArrowRight,
  Info,
  BookOpen,
  X,
  ChevronDown,
} from 'lucide-react';
import type { QuestionReview, ReviewStatus } from '@/types/database';

/**
 * Review with relations
 */
interface ReviewWithRelations extends QuestionReview {
  question?: {
    id: string;
    question_text: string;
    subject_id: string;
    topic_id: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Review statistics
 */
interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  failed: number;
}

/**
 * Get status badge component
 */
function StatusBadge({ status }: { status: ReviewStatus }) {
  const statusMap: Record<ReviewStatus, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default'> = {
    pending: 'pending',
    approved: 'success',
    rejected: 'error',
    failed: 'default',
  };
  
  const labels: Record<ReviewStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed',
  };
  
  const icons: Record<ReviewStatus, React.ReactNode> = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle2 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
  };
  
  return (
    <AdminBadge status={statusMap[status] || 'default'} className="flex items-center gap-1">
      {icons[status]}
      {labels[status] || status}
    </AdminBadge>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Review Dashboard Page
 */
export default function ReviewDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewWithRelations[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    failed: 0,
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [selectedQuestion, setSelectedQuestion] = useState<{ id: string; text: string; subject?: string; topic?: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewingBatch, setReviewingBatch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('');
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionTotalPages, setQuestionTotalPages] = useState(1);

  /**
   * Load review history and stats
   */
  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('page', '1');
      params.append('limit', '50');

      const response = await fetch(`/api/admin/questions/review/history?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load reviews: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both success response format and direct data format
      const reviewsData = data.success ? (data.data?.reviews || data.reviews || []) : (data.reviews || []);
      
      setReviews(reviewsData);
      
      // Calculate stats
      setStats({
        total: reviewsData.length,
        pending: reviewsData.filter((r: ReviewWithRelations) => r.status === 'pending').length,
        approved: reviewsData.filter((r: ReviewWithRelations) => r.status === 'approved').length,
        rejected: reviewsData.filter((r: ReviewWithRelations) => r.status === 'rejected').length,
        failed: reviewsData.filter((r: ReviewWithRelations) => r.status === 'failed').length,
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      // Set empty state on error
      setReviews([]);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        failed: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  /**
   * Review a single question
   */
  const handleReviewQuestion = async () => {
    if (!selectedQuestionId) {
      alert('Please enter a question ID');
      return;
    }

    try {
      setReviewing(true);
      const response = await fetch('/api/admin/questions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: selectedQuestionId }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Review created successfully! Check "Pending Reviews" section below to approve it.');
        setSelectedQuestionId('');
        setSelectedQuestion(null);
        loadReviews();
        // Scroll to pending reviews section
        setTimeout(() => {
          document.getElementById('pending-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        alert(`Review failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Review failed: ${error.message}`);
    } finally {
      setReviewing(false);
    }
  };

  /**
   * Load subjects for filter
   */
  const loadSubjects = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data || []);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  }, []);

  /**
   * Load questions for browser
   */
  const loadQuestions = useCallback(async (page: number = 1, search: string = '', subjectId: string = '') => {
    try {
      setLoadingQuestions(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (search) {
        params.append('search', search);
      }
      if (subjectId) {
        params.append('subjectId', subjectId);
      }

      const response = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        // API returns questions directly or in data.questions
        const questionsList = data.questions || data.data?.questions || [];
        setQuestions(questionsList);
        const pagination = data.pagination || data.data?.pagination;
        setQuestionTotalPages(pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  /**
   * Select a question from browser (single)
   */
  const handleSelectQuestion = (question: any) => {
    setSelectedQuestionId(question.id);
    setSelectedQuestion({
      id: question.id,
      text: question.question_text,
      subject: question.subject?.name,
      topic: question.topic?.name,
    });
    // Clear bulk selection when selecting single
    setSelectedQuestionIds(new Set());
  };

  /**
   * Toggle question selection for bulk review
   */
  const handleToggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
    // Clear single selection when using bulk
    if (selectedQuestionId) {
      setSelectedQuestionId('');
      setSelectedQuestion(null);
    }
  };

  /**
   * Select all questions on current page
   */
  const handleSelectAll = () => {
    if (selectedQuestionIds.size === questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(questions.map(q => q.id)));
    }
  };

  /**
   * Review multiple questions in batch
   */
  const handleBatchReview = async () => {
    if (selectedQuestionIds.size === 0) {
      alert('Please select at least one question');
      return;
    }

    if (!confirm(`Review ${selectedQuestionIds.size} question(s)? This may take several minutes.`)) {
      return;
    }

    try {
      setReviewingBatch(true);
      const response = await fetch('/api/admin/questions/review/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionIds: Array.from(selectedQuestionIds),
          batchSize: 10 
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Batch review initiated! ${data.data?.successful || 0} review(s) created. Check pending reviews below.`);
        setSelectedQuestionIds(new Set());
        loadReviews();
        // Scroll to pending reviews section
        setTimeout(() => {
          document.getElementById('pending-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        alert(`Batch review failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Batch review failed: ${error.message}`);
    } finally {
      setReviewingBatch(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (showQuestionBrowser) {
      loadQuestions(questionPage, questionSearchQuery, questionSubjectFilter);
    }
  }, [showQuestionBrowser, questionPage, questionSearchQuery, questionSubjectFilter]);

  // Filter reviews by search query
  const filteredReviews = reviews.filter(review => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.question?.question_text?.toLowerCase().includes(query) ||
      review.id.toLowerCase().includes(query) ||
      review.reviewer?.full_name?.toLowerCase().includes(query)
    );
  });

  // Table columns
  const columns: ColumnDef<ReviewWithRelations>[] = [
    {
      key: 'question',
      header: 'Question',
      render: (review) => {
        const question = review.question;
        if (!question) return 'N/A';
        return (
          <div className="max-w-md">
            <p className="text-sm text-gray-900 line-clamp-2">
              {question.question_text}
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (review) => <StatusBadge status={review.status} />,
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      render: (review) => {
        return review.reviewer ? review.reviewer.full_name : 'N/A';
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (review) => formatDate(review.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (review) => {
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/review/${review.question_id}`}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Question Reviewer</h1>
            <p className="text-gray-600 mt-1">
              Generate hints, solutions, and explanations for questions using AI
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metrics - Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminCard>
          <AdminCardContent>
            <div className="text-sm text-muted-foreground mb-1">Total Reviews</div>
            <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-2">All time reviews</div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent>
            <div className="text-sm text-muted-foreground mb-1">Pending</div>
            <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground mt-2">Awaiting approval</div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent>
            <div className="text-sm text-muted-foreground mb-1">Approved</div>
            <div className="text-3xl font-bold text-emerald-600">{stats.approved}</div>
            <div className="text-xs text-muted-foreground mt-2">Successfully applied</div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent>
            <div className="text-sm text-muted-foreground mb-1">Rejected</div>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-xs text-muted-foreground mt-2">Not approved</div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent>
            <div className="text-sm text-muted-foreground mb-1">Failed</div>
            <div className="text-3xl font-bold text-gray-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground mt-2">Processing errors</div>
          </AdminCardContent>
        </AdminCard>
      </div>

      {/* Pending Reviews - Prominent Section */}
      {stats.pending > 0 && (
        <AdminCard id="pending-reviews-section" className="border-2 border-amber-300 bg-amber-50">
          <AdminCardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <AdminCardTitle>Pending Reviews – {stats.pending}</AdminCardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats.pending} review{stats.pending !== 1 ? 's' : ''} waiting for your approval
                  </p>
                </div>
              </div>
              <AdminButton
                onClick={() => {
                  setFilterStatus('pending');
                  document.getElementById('review-history-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-amber-600 hover:bg-amber-700"
              >
                View All
              </AdminButton>
            </div>
          </AdminCardHeader>
          <AdminCardContent>
          <div className="space-y-2">
            {reviews
              .filter(r => r.status === 'pending')
              .slice(0, 3)
              .map((review) => (
                <div
                  key={review.id}
                  className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-1 font-medium">
                      {review.question?.question_text || 'Question not found'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {formatDate(review.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/review/${review.question_id}`}
                    className="ml-4 p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Review and approve"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            {stats.pending > 3 && (
              <p className="text-xs text-amber-700 text-center pt-2">
                +{stats.pending - 3} more pending review{stats.pending - 3 !== 1 ? 's' : ''}
              </p>
            )}
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Review Actions Card */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Review Questions</AdminCardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select questions to generate AI-powered hints, solutions, and explanations
          </p>
        </AdminCardHeader>
        <AdminCardContent>

        {/* Selected Question Preview */}
        {selectedQuestion && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">
                    Question Selected
                  </span>
                </div>
                <p className="text-sm text-gray-900 mb-1 line-clamp-2">
                  {selectedQuestion.text}
                </p>
                {(selectedQuestion.subject || selectedQuestion.topic) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedQuestion.subject && <span>{selectedQuestion.subject}</span>}
                    {selectedQuestion.subject && selectedQuestion.topic && <span> • </span>}
                    {selectedQuestion.topic && <span>{selectedQuestion.topic}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedQuestion(null);
                  setSelectedQuestionId('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Question Browser */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Browse Questions</h3>
            <button
              onClick={() => setShowQuestionBrowser(!showQuestionBrowser)}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              {showQuestionBrowser ? 'Hide' : 'Show'} Browser
              <ChevronDown className={`w-4 h-4 transition-transform ${showQuestionBrowser ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showQuestionBrowser && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={questionSearchQuery}
                      onChange={(e) => {
                        setQuestionSearchQuery(e.target.value);
                        setQuestionPage(1);
                      }}
                      placeholder="Search questions..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={questionSubjectFilter}
                    onChange={(e) => {
                      setQuestionSubjectFilter(e.target.value);
                      setQuestionPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedQuestionIds.size > 0 && (
                  <div className="flex items-center justify-between mt-3 p-3 bg-indigo-50 rounded-lg">
                    <span className="text-sm font-medium text-indigo-900">
                      {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedQuestionIds(new Set())}
                        className="px-3 py-1.5 text-sm text-gray-700 hover:bg-white rounded-lg border border-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleBatchReview}
                        disabled={reviewingBatch}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {reviewingBatch ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Reviewing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Review {selectedQuestionIds.size}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto bg-white">
                {loadingQuestions ? (
                  <div className="p-8 text-center text-gray-600">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading questions...
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No questions found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.size === questions.length && questions.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({questions.length})
                        </span>
                      </label>
                    </div>
                    {questions.map((question) => {
                      const isSelected = selectedQuestionIds.has(question.id);
                      const isSingleSelected = selectedQuestionId === question.id;
                      return (
                        <div
                          key={question.id}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            isSingleSelected || isSelected ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleQuestionSelection(question.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => handleSelectQuestion(question)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-sm text-gray-900 line-clamp-2 mb-1 font-medium">
                                {question.question_text}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {question.subject?.name && (
                                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                                    {question.subject.name}
                                  </span>
                                )}
                                {question.topic?.name && (
                                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                                    {question.topic.name}
                                  </span>
                                )}
                              </div>
                            </button>
                            {isSingleSelected && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {!loadingQuestions && questions.length > 0 && (
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Page {questionPage} of {questionTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuestionPage(p => Math.max(1, p - 1))}
                        disabled={questionPage === 1}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setQuestionPage(p => Math.min(questionTotalPages, p + 1))}
                        disabled={questionPage >= questionTotalPages}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manual Question ID Input */}
        <div className="mb-6 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or enter Question ID manually
          </label>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={selectedQuestionId}
                onChange={(e) => {
                  setSelectedQuestionId(e.target.value);
                  if (e.target.value !== selectedQuestion?.id) {
                    setSelectedQuestion(null);
                  }
                }}
                placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleReviewQuestion}
              disabled={reviewing || !selectedQuestionId}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {reviewing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Review
                </>
              )}
            </button>
          </div>
        </div>

        {reviewing && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  AI is analyzing the question...
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This may take 10-30 seconds. Generating hints, solution, and explanation.
                </p>
              </div>
            </div>
          </div>
        )}
        </AdminCardContent>
      </AdminCard>

      {/* Review History Table */}
      <AdminCard id="review-history-section">
        <AdminCardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <AdminCardTitle>Review History</AdminCardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All past reviews and their current status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reviews..."
                  className="pl-10 w-64"
                />
              </div>
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as ReviewStatus | 'all')}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <AdminButton
                variant="ghost"
                size="icon"
                onClick={loadReviews}
              >
                <RefreshCw className="w-4 h-4" />
              </AdminButton>
            </div>
          </div>
        </AdminCardHeader>
        <AdminCardContent>

        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <Sparkles className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600 mb-1">No reviews found</p>
            <p className="text-sm text-gray-500">
              {filterStatus !== 'all' 
                ? `No reviews with status "${filterStatus}"`
                : 'Start by reviewing a question above'}
            </p>
          </div>
        ) : (
          <AdminTable
            data={filteredReviews}
            columns={columns}
            keyAccessor={(item) => item.id}
          />
        )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
