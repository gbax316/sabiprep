'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminHeader,
  AdminPrimaryButton,
  SubjectFormModal,
  TopicFormModal,
  DeleteConfirmModal,
  DataTable,
  SUBJECT_ICONS,
  type SubjectFormData,
  type TopicFormData,
  type ColumnDef,
} from '@/components/admin';
import { Badge } from '@/components/common';
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  BookOpen,
  MessageSquare,
  LayoutGrid,
  List,
  RefreshCcw,
} from 'lucide-react';

// Types for subjects and topics
interface Subject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  exam_types: string[];
  status: 'active' | 'inactive';
  display_order: number;
  topic_count: number;
  question_count: number;
  created_at: string;
  updated_at: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | null;
  status: 'active' | 'inactive';
  display_order: number;
  subject_id: string;
  subject_name: string;
  subject_color?: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'subjects' | 'topics';

export default function ContentManagementPage() {
  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('subjects');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  
  // Loading states
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  
  // Modal states
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectModalMode, setSubjectModalMode] = useState<'create' | 'edit'>('create');
  const [topicModalMode, setTopicModalMode] = useState<'create' | 'edit'>('create');
  
  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'topic';
    item: Subject | Topic;
    canDelete: boolean;
    canArchive: boolean;
    counts: { topicCount?: number; questionCount?: number };
  } | null>(null);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await fetch('/api/admin/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, []);

  // Fetch topics
  const fetchTopics = useCallback(async (subjectId?: string) => {
    setIsLoadingTopics(true);
    try {
      const url = subjectId 
        ? `/api/admin/topics?subjectId=${subjectId}`
        : '/api/admin/topics';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTopics(data.topics);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchSubjects();
    fetchTopics();
  }, [fetchSubjects, fetchTopics]);

  // Re-fetch topics when filter changes
  useEffect(() => {
    fetchTopics(filterSubjectId || undefined);
  }, [filterSubjectId, fetchTopics]);

  // Get icon component by name
  const getIconComponent = (iconName?: string) => {
    const found = SUBJECT_ICONS.find(i => i.name === iconName);
    return found?.icon || BookOpen;
  };

  // Handle subject form submit
  const handleSubjectSubmit = async (data: SubjectFormData) => {
    const url = data.id 
      ? `/api/admin/subjects/${data.id}`
      : '/api/admin/subjects';
    const method = data.id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save subject');
    }
    
    await fetchSubjects();
    await fetchTopics();
  };

  // Handle topic form submit
  const handleTopicSubmit = async (data: TopicFormData) => {
    const url = data.id 
      ? `/api/admin/topics/${data.id}`
      : '/api/admin/topics';
    const method = data.id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save topic');
    }
    
    await fetchSubjects();
    await fetchTopics(filterSubjectId || undefined);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (archive?: boolean) => {
    if (!deleteTarget) return;
    
    const { type, item } = deleteTarget;
    const url = type === 'subject'
      ? `/api/admin/subjects/${item.id}${archive ? '?archive=true' : ''}`
      : `/api/admin/topics/${item.id}${archive ? '?archive=true' : ''}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete');
    }
    
    await fetchSubjects();
    await fetchTopics(filterSubjectId || undefined);
  };

  // Open delete modal with pre-check
  const openDeleteModal = async (type: 'subject' | 'topic', item: Subject | Topic) => {
    // First, try to delete to check if we can
    const url = type === 'subject'
      ? `/api/admin/subjects/${item.id}`
      : `/api/admin/topics/${item.id}`;
    
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    
    if (response.status === 409) {
      // Cannot delete directly, show options
      setDeleteTarget({
        type,
        item,
        canDelete: false,
        canArchive: data.canArchive || true,
        counts: data.details || {},
      });
    } else if (response.ok) {
      // Was deleted, refresh
      await fetchSubjects();
      await fetchTopics(filterSubjectId || undefined);
      return;
    } else {
      // Can delete, show confirmation
      setDeleteTarget({
        type,
        item,
        canDelete: true,
        canArchive: true,
        counts: {},
      });
    }
    
    setIsDeleteModalOpen(true);
  };

  // Subject card component
  const SubjectCard = ({ subject }: { subject: Subject }) => {
    const IconComponent = getIconComponent(subject.icon);
    
    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          subject.status === 'inactive' ? 'opacity-60' : ''
        }`}
        style={{ borderLeftColor: subject.color || '#6B7280' }}
        onClick={() => {
          setSelectedSubject(subject);
          setSubjectModalMode('edit');
          setIsSubjectModalOpen(true);
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: (subject.color || '#6B7280') + '20' }}
            >
              <IconComponent className="w-5 h-5" style={{ color: subject.color || '#6B7280' }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{subject.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {subject.topic_count} topics · {subject.question_count} questions
              </p>
              {subject.exam_types && subject.exam_types.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {subject.exam_types.map(exam => (
                    <span 
                      key={exam}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                    >
                      {exam}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={subject.status === 'active' ? 'success' : 'neutral'}>
              {subject.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubject(subject);
              setSubjectModalMode('edit');
              setIsSubjectModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterSubjectId(subject.id);
              setViewMode('topics');
            }}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="View Topics"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal('subject', subject);
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Topic table columns
  const topicColumns: ColumnDef<Topic>[] = [
    {
      key: 'name',
      header: 'Topic',
      sortable: true,
      render: (topic) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: topic.subject_color || '#6B7280' }}
          />
          <span className="font-medium text-gray-900 dark:text-white">{topic.name}</span>
        </div>
      ),
    },
    {
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      render: (topic) => (
        <span className="text-gray-600 dark:text-gray-400">{topic.subject_name}</span>
      ),
    },
    {
      key: 'question_count',
      header: 'Questions',
      sortable: true,
      render: (topic) => (
        <div className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span>{topic.question_count}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (topic) => (
        <Badge variant={topic.status === 'active' ? 'success' : 'neutral'}>
          {topic.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (topic) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedTopic(topic);
              setTopicModalMode('edit');
              setIsTopicModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal('topic', topic)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Content Management"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Content' },
        ]}
      />

      {/* View Mode Tabs (Mobile) */}
      <div className="md:hidden mb-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('subjects')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'subjects'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Subjects
            </span>
          </button>
          <button
            onClick={() => setViewMode('topics')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'topics'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <List className="w-4 h-4" />
              Topics
            </span>
          </button>
        </div>
      </div>

      {/* Desktop Two-Column Layout */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {/* Subjects Column */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h2>
              <span className="text-sm text-gray-500">({subjects.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSubjects()}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoadingSubjects ? 'animate-spin' : ''}`} />
              </button>
              <AdminPrimaryButton
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectModalMode('create');
                  setIsSubjectModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </AdminPrimaryButton>
            </div>
          </div>

          {isLoadingSubjects ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No subjects yet</p>
              <button
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectModalMode('create');
                  setIsSubjectModalOpen(true);
                }}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create your first subject
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {subjects.map(subject => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}
        </div>

        {/* Topics Column */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topics</h2>
              <span className="text-sm text-gray-500">({topics.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTopics(filterSubjectId || undefined)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoadingTopics ? 'animate-spin' : ''}`} />
              </button>
              <AdminPrimaryButton
                onClick={() => {
                  setSelectedTopic(null);
                  setTopicModalMode('create');
                  setIsTopicModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Topic
              </AdminPrimaryButton>
            </div>
          </div>

          {/* Subject Filter */}
          <div className="mb-4">
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {isLoadingTopics ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <DataTable
                data={topics}
                columns={topicColumns}
                keyAccessor={(topic) => topic.id}
                isLoading={isLoadingTopics}
                emptyMessage="No topics found"
                showSearch={false}
                onRowClick={(topic) => {
                  setSelectedTopic(topic);
                  setTopicModalMode('edit');
                  setIsTopicModalOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {viewMode === 'subjects' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">{subjects.length} subjects</span>
              <AdminPrimaryButton
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectModalMode('create');
                  setIsSubjectModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </AdminPrimaryButton>
            </div>

            {isLoadingSubjects ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map(subject => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 mr-2">
                <select
                  value={filterSubjectId}
                  onChange={(e) => setFilterSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <AdminPrimaryButton
                onClick={() => {
                  setSelectedTopic(null);
                  setTopicModalMode('create');
                  setIsTopicModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add
              </AdminPrimaryButton>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <DataTable
                data={topics}
                columns={topicColumns}
                keyAccessor={(topic) => topic.id}
                isLoading={isLoadingTopics}
                emptyMessage="No topics found"
                showSearch={false}
                onRowClick={(topic) => {
                  setSelectedTopic(topic);
                  setTopicModalMode('edit');
                  setIsTopicModalOpen(true);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SubjectFormModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSelectedSubject(null);
        }}
        onSubmit={handleSubjectSubmit}
        initialData={selectedSubject || undefined}
        mode={subjectModalMode}
      />

      <TopicFormModal
        isOpen={isTopicModalOpen}
        onClose={() => {
          setIsTopicModalOpen(false);
          setSelectedTopic(null);
        }}
        onSubmit={handleTopicSubmit}
        initialData={selectedTopic ? {
          id: selectedTopic.id,
          name: selectedTopic.name,
          subject_id: selectedTopic.subject_id,
          description: selectedTopic.description || '',
          difficulty: selectedTopic.difficulty,
          status: selectedTopic.status,
        } : undefined}
        mode={topicModalMode}
        subjects={subjects.map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color }))}
        preselectedSubjectId={filterSubjectId || undefined}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${deleteTarget.type === 'subject' ? 'Subject' : 'Topic'}`}
          itemName={deleteTarget.item.name}
          itemType={deleteTarget.type}
          canDelete={deleteTarget.canDelete}
          canArchive={deleteTarget.canArchive}
          counts={deleteTarget.counts}
        />
      )}
    </div>
  );
}
