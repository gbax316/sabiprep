'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader, ImportReportCard } from '@/components/admin';
import { BatchEditModal } from '@/components/admin/BatchEditModal';
import { BatchDeleteModal } from '@/components/admin/BatchDeleteModal';

interface ImportReport {
  id: string;
  filename: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  admin?: {
    full_name: string;
    email: string;
  };
}

export default function ImportHistoryPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ImportReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingReport, setEditingReport] = useState<ImportReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    // Check for success message from batch deletion
    if (typeof window !== 'undefined') {
      const batchDeleted = sessionStorage.getItem('batch_deleted');
      if (batchDeleted) {
        setSuccessMessage(batchDeleted);
        sessionStorage.removeItem('batch_deleted');
      }
    }
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/import/reports?page=${page}&limit=12`);
      if (!response.ok) {
        throw new Error('Failed to fetch import reports');
      }

      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setEditingReport(report);
    }
  };

  const handleDelete = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setDeletingReport(report);
    }
  };

  const handleSaveEdit = async (data: { filename: string; status?: string }) => {
    if (!editingReport) return;

    try {
      const response = await fetch(`/api/admin/import/reports/${editingReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to update batch');
      }

      // Success - refresh the reports list
      await fetchReports();
      setEditingReport(null);
      setSuccessMessage('Batch updated successfully');
      
      // Set flag to refresh dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('refresh_dashboard', 'true');
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleConfirmDelete = async (deleteQuestions: boolean) => {
    if (!deletingReport) return;

    try {
      const params = new URLSearchParams();
      if (deleteQuestions) {
        params.append('delete_questions', 'true');
      }

      const response = await fetch(`/api/admin/import/reports/${deletingReport.id}?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to delete batch');
      }

      const data = await response.json();
      
      // Success - refresh the reports list
      await fetchReports();
      setDeletingReport(null);
      setSuccessMessage(data.message || 'Batch deleted successfully');
      
      // Set flag to refresh dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('refresh_dashboard', 'true');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  return (
    <div>
      <AdminHeader
        title="Import History"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Import', href: '/admin/import' },
          { label: 'History', href: '/admin/import/history' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReports()}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <Link
              href="/admin/import"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Import
            </Link>
          </div>
        }
      />

      <div className="p-6">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-lg mb-4">
              No import history yet
            </div>
            <Link
              href="/admin/import"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Your First Import
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {reports.map((report) => (
                <ImportReportCard
                  key={report.id}
                  report={report}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {editingReport && (
        <BatchEditModal
          isOpen={!!editingReport}
          onClose={() => setEditingReport(null)}
          batch={editingReport}
          onSave={handleSaveEdit}
        />
      )}

      {deletingReport && (
        <BatchDeleteModal
          isOpen={!!deletingReport}
          onClose={() => setDeletingReport(null)}
          batch={deletingReport}
          onDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
}
