'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy page - redirects to new unified configure page or subjects
 * This page is deprecated as of the learning flow optimization
 */
function PracticeConfirmRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Try to get subject ID from search params
    const subjectId = searchParams?.get('subjectId');
    
    if (subjectId) {
      router.replace(`/learn/configure/${subjectId}`);
    } else {
      router.replace('/subjects');
    }
  }, [searchParams, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}

export default function PracticeConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <PracticeConfirmRedirect />
    </Suspense>
  );
}
