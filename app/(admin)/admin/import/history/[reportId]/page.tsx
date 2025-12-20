'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader, AdminPrimaryButton, AdminSecondaryButton, DataTable, type ColumnDef } from '@/components/admin';
import { BatchEditModal } from '@/components/admin/BatchEditModal';
import { BatchDeleteModal } from '@/components/admin/BatchDeleteModal';
import { QuickEditModal } from '@/components/admin/QuickEditModal';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  Pencil,
  RefreshCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  Database,
  X,
} from 'lucide-react';

interface ImportReport {
  id: string;
  filename: string;
  file_size_bytes?: number;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  import_type: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  admin?: {
    full_name: string;
    email: string;
  };
}

interface BatchQuestion {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage?: string;
  passage_id?: string;
  question_image_url?: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer: string;
  hint?: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  solution?: string;
  explanation?: string;
  difficulty?: string;
  exam_type?: string;
  exam_year?: number;
  status: string;
  created_at: string;
  subject?: string;
  topic?: string;
}

interface MigrationStatus {
  migrationApplied: boolean;
  stats?: {
    totalQuestions: number;
    linkedQuestions: number;
    unlinkedQuestions: number;
  };
}

interface PageProps {
  params: Promise<{
    reportId: string;
  }>;
}

export default function BatchDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { reportId } = resolvedParams;
  const router = useRouter();
  
  const [report, setReport] = useState<ImportReport | null>(null);
  const [questions, setQuestions] = useState<BatchQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuestionEditModal, setShowQuestionEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BatchQuestion | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  
  // Quick edit state
  const [quickEditQuestion, setQuickEditQuestion] = useState<BatchQuestion | null>(null);
  
  // Migration status
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  useEffect(() => {
    fetchReport(true);
    checkMigrationStatus();
  }, [reportId]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (reportId) {
      fetchQuestions();
    }
  }, [reportId, page, statusFilter, debouncedSearchQuery]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/import/check-migration');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus({
          migrationApplied: data.migrationApplied,
          stats: data.stats
        });
      }
    } catch (err) {
      console.error('Error checking migration status:', err);
    }
  };

  const fetchReport = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const response = await fetch(`/api/admin/import/reports/${reportId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch import report');
      }
      const data = await response.json();
      setReport(data.report);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const fetchQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }

      const response = await fetch(`/api/admin/import/reports/${reportId}/questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data = await response.json();
      setQuestions(data.questions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalQuestions(data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setQuestions([]);
      setTotalQuestions(0);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleEdit = async (data: { filename: string; status?: string }) => {
    try {
      const response = await fetch(`/api/admin/import/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to update batch');
      }

      await fetchReport(false);
      setSuccessMessage('Batch updated successfully');
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('refresh_dashboard', 'true');
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  };

  const handleDelete = async (deleteQuestions: boolean) => {
    try {
      const params = new URLSearchParams();
      if (deleteQuestions) {
        params.append('delete_questions', 'true');
      }

      const response = await fetch(`/api/admin/import/reports/${reportId}?${params}`, {
        method: 'DELETE',
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete batch');
      }

      // Set success message and refresh flags before navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('refresh_dashboard', 'true');
        sessionStorage.setItem('refresh_import_history', 'true');
        sessionStorage.setItem('batch_deleted', responseData.message || 'Batch deleted successfully');
      }

      // Show success message briefly before navigating
      setSuccessMessage(responseData.message || 'Batch deleted successfully');
      
      // Navigate back to history after a brief delay
      setTimeout(() => {
        router.push('/admin/import/history');
      }, 1000);
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleQuickSave = async (questionId: string, updates: Partial<BatchQuestion>) => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}/quick-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update question');
      }

      await fetchQuestions();
      setSuccessMessage('Question updated successfully');
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'draft' | 'delete') => {
    try {
      const questionIds = Array.from(selectedQuestions);
      
      const response = await fetch(`/api/admin/import/reports/${reportId}/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, questionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk action failed');
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedQuestions(new Set());
      await fetchQuestions();
      await fetchReport(false);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw error;
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      await fetchQuestions();
      setSuccessMessage('Question archived successfully');
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestions(newSelected);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-600 bg-green-100 dark:bg-green-900/20', icon: CheckCircle, text: 'Completed' };
      case 'failed':
        return { color: 'text-red-600 bg-red-100 dark:bg-red-900/20', icon: XCircle, text: 'Failed' };
      case 'processing':
        return { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20', icon: Clock, text: 'Processing' };
      default:
        return { color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20', icon: Clock, text: 'Pending' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const columns: ColumnDef<BatchQuestion>[] = [
    {
      key: 'select',
      header: '',
      render: (q) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(q.id);
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          {selectedQuestions.has(q.id) ? (
            <CheckSquare className="w-4 h-4 text-blue-600" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
        </button>
      ),
    },
    {
      key: 'question_text',
      header: 'Question',
      render: (q) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
            {q.question_text}
          </p>
          {q.passage && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Has passage
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'correct_answer',
      header: 'Answer',
      render: (q) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-sm">
          {q.correct_answer}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (q) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{q.subject || 'N/A'}</span>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (q) => {
        const difficultyColors: Record<string, string> = {
          Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
          Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
          Hard: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[q.difficulty || ''] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
            {q.difficulty || 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (q) => {
        const statusColors: Record<string, string> = {
          published: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
          archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[q.status] || 'bg-gray-100 text-gray-700'}`}>
            {q.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (q) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/questions/${q.id}`}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setQuickEditQuestion(q)}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Quick Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <Link
            href={`/admin/questions/${q.id}/edit`}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Full Edit"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={async () => {
              if (confirm(`Archive question "${q.question_text.substring(0, 50)}..."?`)) {
                await handleDeleteQuestion(q.id);
              }
            }}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Archive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-green-800 dark:text-green-300 text-sm">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <AdminHeader
          title="Import Batch"
          breadcrumbs={[
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'Import', href: '/admin/import' },
            { label: 'History', href: '/admin/import/history' },
            { label: 'Details' },
          ]}
        />
        <div className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error || 'Batch not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(report.status);

  return (
    <div>
      <AdminHeader
        title="Import Batch Details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Import', href: '/admin/import' },
          { label: 'History', href: '/admin/import/history' },
          { label: 'Details' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/import/history">
              <AdminSecondaryButton>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </AdminSecondaryButton>
            </Link>
            <button
              onClick={async () => {
                await fetchReport(false);
                await fetchQuestions();
                setSuccessMessage('Data refreshed');
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Batch
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Migration Warning */}
        {migrationStatus && !migrationStatus.migrationApplied && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Migration Required</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                The import_report_id column is missing from the questions table. 
                Questions imported before the migration won&apos;t be linked to this batch.
                Please run the migration to enable batch-question linking.
              </p>
            </div>
          </div>
        )}

        {/* Batch Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Batch Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Filename</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{report.filename}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">File Size</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatFileSize(report.file_size_bytes)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                      <statusConfig.icon className="w-4 h-4" />
                      {statusConfig.text}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Imported By</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {report.admin?.full_name || 'Unknown'} ({report.admin?.email || 'N/A'})
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Rows</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{report.total_rows}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful</dt>
                  <dd className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{report.successful_rows}</dd>
                </div>
                {report.failed_rows > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</dt>
                    <dd className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{report.failed_rows}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Questions in Batch</dt>
                  <dd className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    {totalQuestions}
                    <Database className="w-5 h-5" />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Started</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{formatDate(report.started_at)}</dd>
              </div>
              {report.completed_at && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Completed</dt>
                  <dd className="mt-1 text-gray-900 dark:text-gray-100">{formatDate(report.completed_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{formatDate(report.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title={selectedQuestions.size === questions.length && questions.length > 0 ? 'Deselect all' : 'Select all'}
                >
                  {selectedQuestions.size === questions.length && questions.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Questions ({totalQuestions})
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {migrationStatus?.migrationApplied 
                      ? 'Questions linked to this batch' 
                      : 'Showing questions from this batch'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            {questions.length === 0 && !isLoadingQuestions ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No questions found
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {migrationStatus?.migrationApplied 
                    ? 'No questions are linked to this batch. Questions imported before the migration won\'t appear here.'
                    : 'The migration needs to be applied to link questions to batches.'}
                </p>
              </div>
            ) : (
              <DataTable
                data={questions}
                columns={columns}
                isLoading={isLoadingQuestions}
                keyAccessor={(q) => q.id}
                emptyMessage="No questions found in this batch"
                pagination={{
                  page,
                  limit: 20,
                  total: totalQuestions,
                  totalPages,
                }}
                onPageChange={setPage}
                skeletonRows={5}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {report && (
        <>
          <BatchEditModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            batch={report}
            onSave={async (data) => {
              await handleEdit(data);
              setShowEditModal(false);
            }}
          />
          <BatchDeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            batch={report}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* Quick Edit Modal */}
      <QuickEditModal
        isOpen={!!quickEditQuestion}
        onClose={() => setQuickEditQuestion(null)}
        question={quickEditQuestion}
        onSave={handleQuickSave}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedQuestions.size}
        onAction={handleBulkAction}
        onClear={() => setSelectedQuestions(new Set())}
      />
    </div>
  );
}
