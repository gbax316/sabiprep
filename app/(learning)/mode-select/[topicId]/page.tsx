'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getTopic } from '@/lib/api';

/**
 * Legacy page - redirects to new unified configure page
 * This page is deprecated as of the learning flow optimization
 */
export default function ModeSelectPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function redirect() {
      try {
        // Get the topic to find its subject ID
        const topic = await getTopic(topicId);
        if (topic) {
          router.replace(`/learn/configure/${topic.subject_id}`);
        } else {
          router.replace('/subjects');
        }
      } catch (error) {
        console.error('Error loading topic:', error);
        router.replace('/subjects');
      } finally {
        setLoading(false);
      }
    }
    
    redirect();
  }, [topicId, router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
