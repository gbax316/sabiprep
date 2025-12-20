'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader, AdminPrimaryButton, AdminSecondaryButton, DataTable, type ColumnDef } from '@/components/admin';
import { BatchEditModal } from '@/components/admin/BatchEditModal';
import { BatchDeleteModal } from '@/components/admin/BatchDeleteModal';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Pencil,
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
  difficulty?: string;
  exam_type?: string;
  exam_year?: number;
  status: string;
  created_at: string;
  subject?: string;
  topic?: string;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  useEffect(() => {
    fetchQuestions();
  }, [reportId, page, statusFilter, searchQuery]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/import/reports/${reportId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch import report');
      }
      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setIsLoading(false);
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
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/import/reports/${reportId}/questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data = await response.json();
      setQuestions(data.questions);
      setTotalPages(data.pagination.totalPages);
      setTotalQuestions(data.pagination.total);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleEdit = async (data: { filename: string; status?: string }) => {
    const response = await fetch(`/api/admin/import/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update batch');
    }

    await fetchReport();
  };

  const handleDelete = async (deleteQuestions: boolean) => {
    const params = new URLSearchParams();
    if (deleteQuestions) {
      params.append('delete_questions', 'true');
    }

    const response = await fetch(`/api/admin/import/reports/${reportId}?${params}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete batch');
    }

    router.push('/admin/import/history');
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
      key: 'subject',
      header: 'Subject',
      render: (q) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{q.subject || 'N/A'}</span>
      ),
    },
    {
      key: 'topic',
      header: 'Topic',
      render: (q) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{q.topic || 'N/A'}</span>
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
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/questions/${q.id}`}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/questions/${q.id}/edit`}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
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
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {report.total_rows > 0
                      ? Math.round((report.successful_rows / report.total_rows) * 100)
                      : 0}%
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Questions ({totalQuestions})</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Questions imported in this batch
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchQuestions();
                      }
                    }}
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
            onSave={handleEdit}
          />
          <BatchDeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            batch={report}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
