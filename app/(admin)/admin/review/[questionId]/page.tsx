'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardContent,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminButton,
  AdminBadge,
} from '@/components/admin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  Lightbulb,
  BookOpen,
  FileText,
} from 'lucide-react';
import type { QuestionReview, Question } from '@/types/database';

/**
 * Review with question data
 */
interface ReviewWithQuestion extends QuestionReview {
  question?: Question;
}

/**
 * Review Results Page
 */
export default function ReviewResultsPage({ params }: { params: Promise<{ questionId: string }> }) {
  const router = useRouter();
  const [questionId, setQuestionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [review, setReview] = useState<QuestionReview | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    params.then(({ questionId: id }) => {
      setQuestionId(id);
      loadData(id);
    });
  }, [params]);

  /**
   * Load question and latest review
   */
  const loadData = async (id: string) => {
    try {
      setLoading(true);

      // Load question
      const questionResponse = await fetch(`/api/admin/questions/${id}`);
      const questionData = await questionResponse.json();
      if (questionData.success) {
        setQuestion(questionData.data.question);
      }

      // Load latest review
      const reviewResponse = await fetch(`/api/admin/questions/review/history?questionId=${id}&limit=1`);
      const reviewData = await reviewResponse.json();
      if (reviewData.success && reviewData.data.reviews.length > 0) {
        setReview(reviewData.data.reviews[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle approval
   */
  const handleApprove = async () => {
    if (!review) return;

    if (!confirm('Are you sure you want to approve this review? The question will be updated with the proposed content.')) {
      return;
    }

    try {
      setApproving(true);
      const response = await fetch(`/api/admin/questions/review/${review.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Review approved successfully!');
        loadData(questionId);
      } else {
        alert(`Approval failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Approval failed: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  /**
   * Handle rejection
   */
  const handleReject = async () => {
    if (!review) return;

    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Are you sure you want to reject this review?')) {
      return;
    }

    try {
      setRejecting(true);
      const response = await fetch(`/api/admin/questions/review/${review.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: false,
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Review rejected');
        loadData(questionId);
        setRejectionReason('');
      } else {
        alert(`Rejection failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Rejection failed: ${error.message}`);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="space-y-8 pb-8">
        <Link href="/admin/review" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Reviews
        </Link>
        <AdminCard>
          <AdminCardContent>
            <p className="text-muted-foreground">Question not found</p>
          </AdminCardContent>
        </AdminCard>
      </div>
    );
  }

  if (!review || review.status !== 'pending') {
    return (
      <div className="space-y-8 pb-8">
        <Link href="/admin/review" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Reviews
        </Link>
        <AdminCard>
          <AdminCardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <h2 className="text-lg font-semibold mb-2">No Pending Review</h2>
                <p className="text-sm">
                  {review 
                    ? `This review has been ${review.status}.`
                    : 'No review found for this question. Create a new review from the review dashboard.'}
                </p>
              </AlertDescription>
            </Alert>
            <Link href="/admin/review">
              <AdminButton className="bg-indigo-600 hover:bg-indigo-700">
                Go to Review Dashboard
              </AdminButton>
            </Link>
          </AdminCardContent>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <div>
        <Link href="/admin/review" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Reviews
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Question</h1>
            <p className="text-gray-600 mt-1">
              Compare AI-generated content with current content and approve or reject
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Alert className="bg-indigo-50 border-indigo-200">
        <Info className="h-4 w-4 text-indigo-600" />
        <AlertDescription>
          <p className="font-medium mb-1">Review Process:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Review the AI-generated hints, solution, and explanation below</li>
            <li>Compare with current content (left = current, right = proposed)</li>
            <li>Check for accuracy, clarity, and educational value</li>
            <li>Approve to apply changes or reject with feedback</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Question Preview */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Question</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="space-y-4">
            <div>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {question.question_text}
              </p>
            </div>
            {question.passage && (
              <div className="bg-muted p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {question.passage}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {['A', 'B', 'C', 'D'].map((option) => {
                const isCorrect = question.correct_answer === option;
                const optionText = question[`option_${option.toLowerCase()}` as keyof Question] as string;
                return (
                  <div
                    key={option}
                    className={`p-3 rounded-lg border ${
                      isCorrect
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-muted border'
                    }`}
                  >
                    <span className="font-medium text-foreground">{option})</span>{' '}
                    <span className="text-muted-foreground">{optionText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Hints Comparison */}
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <AdminCardTitle>Progressive Hints</AdminCardTitle>
          </div>
        </AdminCardHeader>
        <AdminCardContent>
        <div className="space-y-6">
          {[1, 2, 3].map((level) => {
            const currentHint = question[`hint${level}` as keyof Question] as string | undefined;
            const proposedHint = review[`proposed_hint${level}` as keyof QuestionReview] as string | undefined;
            
            return (
              <div key={level} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                    Hint {level}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Current</div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-900 min-h-[80px]">
                      {currentHint || <span className="text-gray-400 italic">No hint</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-indigo-600 mb-2 uppercase tracking-wide">Proposed</div>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-sm text-gray-900 min-h-[80px]">
                      {proposedHint || <span className="text-gray-400 italic">No hint</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </AdminCardContent>
      </AdminCard>

      {/* Solution Comparison */}
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <AdminCardTitle>Solution</AdminCardTitle>
          </div>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Current</div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-900 whitespace-pre-wrap min-h-[200px]">
                {question.solution || <span className="text-gray-400 italic">No solution</span>}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-indigo-600 mb-2 uppercase tracking-wide">Proposed</div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-sm text-gray-900 whitespace-pre-wrap min-h-[200px]">
                {review.proposed_solution || <span className="text-gray-400 italic">No solution</span>}
              </div>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Explanation Comparison */}
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <AdminCardTitle>Explanation</AdminCardTitle>
          </div>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Current</div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-900 whitespace-pre-wrap min-h-[200px]">
                {question.explanation || <span className="text-gray-400 italic">No explanation</span>}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-indigo-600 mb-2 uppercase tracking-wide">Proposed</div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-sm text-gray-900 whitespace-pre-wrap min-h-[200px]">
                {review.proposed_explanation || <span className="text-gray-400 italic">No explanation</span>}
              </div>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Approval Actions */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Review Actions</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>What happens when you approve?</strong> The question will be updated with the AI-generated hints (hint1, hint2, hint3), solution, and explanation. 
            The review will be marked as approved and logged in the audit trail.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (if rejecting)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional: Provide a reason for rejection (e.g., 'Solution is incorrect', 'Hints are too vague', etc.)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Providing a reason helps improve future AI reviews
            </p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {approving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Review
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {rejecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Reject Review
                </>
              )}
            </button>
          </div>
        </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
