'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { BottomNav } from '@/components/common/BottomNav';
import { SearchInput } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { getSubject, getTopics, getUserProgress } from '@/lib/api';
import type { Subject, Topic, UserProgress } from '@/types/database';
import Link from 'next/link';
import { ArrowLeft, Play, TrendingUp, Clock } from 'lucide-react';
import { getDifficultyColor } from '@/lib/api';

export default function TopicsPage({ params }: { params: { subjectId: string } }) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock user ID - Replace with actual auth user ID
  const userId = 'mock-user-id';

  useEffect(() => {
    loadTopics();
  }, [params.subjectId]);

  async function loadTopics() {
    try {
      setLoading(true);
      const [subjectData, topicsData, userProgress] = await Promise.all([
        getSubject(params.subjectId),
        getTopics(params.subjectId),
        getUserProgress(userId),
      ]);

      setSubject(subjectData);
      setTopics(topicsData);
      setProgress(userProgress.filter(p => p.subject_id === params.subjectId));
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get progress for a topic
  const getTopicProgress = (topicId: string) => {
    return progress.find(p => p.topic_id === topicId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading topics...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-900">Subject not found</p>
          <Link href="/subjects" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/subjects"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="text-4xl">{subject.icon || '📚'}</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
                <p className="text-sm text-gray-600">{topics.length} topics available</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <SearchInput
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Topics List */}
        {filteredTopics.map((topic) => {
          const topicProgress = getTopicProgress(topic.id);

          return (
            <Link key={topic.id} href={`/mode-select/${topic.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  {/* Topic Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{topic.name}</h3>
                        {topic.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{topic.description}</p>
                        )}
                      </div>
                      {topic.difficulty && (
                        <Badge variant={
                          topic.difficulty === 'Easy' ? 'success' :
                          topic.difficulty === 'Medium' ? 'warning' :
                          'error'
                        } size="sm">
                          {topic.difficulty}
                        </Badge>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{topic.total_questions} questions</span>
                      </div>
                      
                      {topicProgress && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">
                            {Math.round(topicProgress.accuracy_percentage)}% accuracy
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {topicProgress && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${topicProgress.accuracy_percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {topicProgress.questions_correct} / {topicProgress.questions_attempted} correct
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Start Button */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center transition-colors">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}

        {/* Empty State */}
        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No topics found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search query
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
