'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy page - redirects to new unified configure page
 * This page is deprecated as of the learning flow optimization
 */
export default function TestTopicMixPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = use(params);
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new unified configure page
    router.replace(`/learn/configure/${subjectId}`);
  }, [subjectId, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
