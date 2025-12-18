'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AdminHeader,
  AdminPrimaryButton,
  AdminSecondaryButton,
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
  Search,
  Filter,
  X,
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
  const [allTopics, setAllTopics] = useState<Topic[]>([]); // Store all topics for filtering
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('subjects');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterTopicId, setFilterTopicId] = useState<string>('');
  
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
        // Store all topics if fetching without filter
        if (!subjectId) {
          setAllTopics(data.topics);
        }
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

  // Re-fetch topics when subject filter changes
  useEffect(() => {
    fetchTopics(filterSubjectId || undefined);
    // Reset topic filter when subject changes
    setFilterTopicId('');
  }, [filterSubjectId, fetchTopics]);

  // Get filtered topics based on both subject and topic filters
  const filteredTopics = React.useMemo(() => {
    let result = topics;
    
    // Apply topic filter if set
    if (filterTopicId) {
      result = result.filter(topic => topic.id === filterTopicId);
    }
    
    return result;
  }, [topics, filterTopicId]);

  // Get topics for the selected subject (for topic dropdown)
  const subjectTopics = React.useMemo(() => {
    if (!filterSubjectId) return [];
    return allTopics.filter(topic => topic.subject_id === filterSubjectId);
  }, [filterSubjectId, allTopics]);

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
    const isSelected = filterSubjectId === subject.id;
    
    return (
      <div
        className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
          subject.status === 'inactive' ? 'opacity-60' : ''
        } ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 border-emerald-500' : 'hover:border-gray-300 dark:hover:border-gray-600'}`}
        onClick={() => {
          setSelectedSubject(subject);
          setSubjectModalMode('edit');
          setIsSubjectModalOpen(true);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: (subject.color || '#6B7280') + '15' }}
            >
              <IconComponent className="w-6 h-6" style={{ color: subject.color || '#6B7280' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                  {subject.name}
                </h3>
                {isSelected && (
                  <Badge variant="success" className="text-xs px-2 py-0.5 flex-shrink-0">
                    Active Filter
                  </Badge>
                )}
                <Badge 
                  variant={subject.status === 'active' ? 'success' : 'neutral'} 
                  className="text-xs px-2 py-0.5 flex-shrink-0"
                >
                  {subject.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">{subject.topic_count}</span>
                  <span className="text-gray-500">{subject.topic_count === 1 ? 'topic' : 'topics'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">{subject.question_count}</span>
                  <span className="text-gray-500">{subject.question_count === 1 ? 'question' : 'questions'}</span>
                </span>
              </div>
              {subject.exam_types && subject.exam_types.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {subject.exam_types.map(exam => (
                    <span 
                      key={exam}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md font-medium"
                    >
                      {exam}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSubject(subject);
              setSubjectModalMode('edit');
              setIsSubjectModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
            title="Edit Subject"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (filterSubjectId === subject.id) {
                setFilterSubjectId('');
                setFilterTopicId('');
              } else {
                setFilterSubjectId(subject.id);
                setFilterTopicId('');
                setViewMode('topics');
              }
            }}
            className={`p-2 rounded-lg transition-all duration-200 ${
              filterSubjectId === subject.id
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
            title={filterSubjectId === subject.id ? 'Clear Filter' : 'View Topics'}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal('subject', subject);
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            title="Delete Subject"
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
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: topic.subject_color || '#6B7280' }}
          />
          <span className="font-semibold text-gray-900 dark:text-white">{topic.name}</span>
        </div>
      ),
    },
    {
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      render: (topic) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{topic.subject_name}</span>
      ),
    },
    {
      key: 'question_count',
      header: 'Questions',
      sortable: true,
      render: (topic) => (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{topic.question_count}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (topic) => (
        <Badge variant={topic.status === 'active' ? 'success' : 'neutral'} className="text-xs">
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
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTopic(topic);
              setTopicModalMode('edit');
              setIsTopicModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
            title="Edit Topic"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal('topic', topic);
            }}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            title="Delete Topic"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Content Management"
        subtitle="Manage subjects and topics for your question bank"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Content' },
        ]}
      />

      {/* View Mode Tabs (Mobile) */}
      <div className="md:hidden">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 shadow-inner">
          <button
            onClick={() => setViewMode('subjects')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'subjects'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Subjects
            </span>
          </button>
          <button
            onClick={() => setViewMode('topics')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'topics'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
                  </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSubjects()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
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
          </div>

          <div className="p-6">
          {isLoadingSubjects ? (
              <div className="space-y-4">
              {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : subjects.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No subjects yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Get started by creating your first subject. Subjects help organize your topics and questions.
                </p>
                <AdminPrimaryButton
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectModalMode('create');
                  setIsSubjectModalOpen(true);
                }}
              >
                  <Plus className="w-4 h-4" />
                  Create Your First Subject
                </AdminPrimaryButton>
            </div>
          ) : (
              <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
              {subjects.map(subject => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Topics Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topics</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
                    {filterSubjectId && ` in ${subjects.find(s => s.id === filterSubjectId)?.name}`}
                  </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTopics(filterSubjectId || undefined)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
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

          {/* Hierarchical Filters */}
            <div className="space-y-3">
            {/* Subject Filter */}
            <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Subject
              </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterSubjectId}
                onChange={(e) => {
                  setFilterSubjectId(e.target.value);
                      setFilterTopicId('');
                }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.topic_count} topics)
                  </option>
                ))}
              </select>
                </div>
            </div>

            {/* Topic Filter - Only show when a subject is selected */}
            {filterSubjectId && subjectTopics.length > 0 && (
              <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Topic
                </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterTopicId}
                  onChange={(e) => setFilterTopicId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                >
                  <option value="">All Topics in {subjects.find(s => s.id === filterSubjectId)?.name}</option>
                  {subjectTopics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name} ({topic.question_count} questions)
                    </option>
                  ))}
                </select>
                  </div>
              </div>
            )}

            {/* Active Filter Display */}
            {(filterSubjectId || filterTopicId) && (
                <div className="flex items-center flex-wrap gap-2 pt-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Active filters:</span>
                {filterSubjectId && (
                  <button
                    onClick={() => {
                      setFilterSubjectId('');
                      setFilterTopicId('');
                    }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all duration-200"
                  >
                      <span>{subjects.find(s => s.id === filterSubjectId)?.name}</span>
                      <X className="w-3 h-3" />
                  </button>
                )}
                {filterTopicId && (
                  <button
                    onClick={() => setFilterTopicId('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                  >
                      <span>{subjectTopics.find(t => t.id === filterTopicId)?.name}</span>
                      <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            </div>
          </div>

          <div className="p-6">
          {isLoadingTopics ? (
              <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-full" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <DataTable
                data={filteredTopics}
                columns={topicColumns}
                keyAccessor={(topic) => topic.id}
                isLoading={isLoadingTopics}
                emptyMessage={
                  filterSubjectId
                      ? `No topics found in ${subjects.find(s => s.id === filterSubjectId)?.name || 'this subject'}. Create your first topic to get started.`
                      : "No topics found. Create your first topic to get started."
                }
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
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-6">
        {viewMode === 'subjects' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
          <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
                  </p>
                </div>
              <AdminPrimaryButton
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectModalMode('create');
                  setIsSubjectModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                  Add
              </AdminPrimaryButton>
              </div>
            </div>

            <div className="p-4">
            {isLoadingSubjects ? (
                <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                        </div>
                      </div>
                  </div>
                ))}
              </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    No subjects yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Create your first subject to get started.
                  </p>
                  <AdminPrimaryButton
                    onClick={() => {
                      setSelectedSubject(null);
                      setSubjectModalMode('create');
                      setIsSubjectModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Create Subject
                  </AdminPrimaryButton>
                </div>
              ) : (
                <div className="space-y-4">
                {subjects.map(subject => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
          <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topics</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
                  </p>
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

            {/* Mobile Filters */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Subject
                  </label>
              <select
                value={filterSubjectId}
                onChange={(e) => {
                  setFilterSubjectId(e.target.value);
                  setFilterTopicId('');
                }}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.topic_count})
                  </option>
                ))}
              </select>
                </div>

              {filterSubjectId && subjectTopics.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Topic
                    </label>
                <select
                  value={filterTopicId}
                  onChange={(e) => setFilterTopicId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                >
                  <option value="">All Topics</option>
                  {subjectTopics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name} ({topic.question_count})
                    </option>
                  ))}
                </select>
            </div>
                )}

                {/* Active Filters */}
                {(filterSubjectId || filterTopicId) && (
                  <div className="flex items-center flex-wrap gap-2 pt-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Active:</span>
                    {filterSubjectId && (
                      <button
                onClick={() => {
                          setFilterSubjectId('');
                          setFilterTopicId('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg"
                      >
                        {subjects.find(s => s.id === filterSubjectId)?.name}
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {filterTopicId && (
                      <button
                        onClick={() => setFilterTopicId('')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                      >
                        {subjectTopics.find(t => t.id === filterTopicId)?.name}
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              {isLoadingTopics ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-full" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <DataTable
                data={filteredTopics}
                columns={topicColumns}
                keyAccessor={(topic) => topic.id}
                isLoading={isLoadingTopics}
                emptyMessage={
                  filterSubjectId
                        ? `No topics in ${subjects.find(s => s.id === filterSubjectId)?.name || 'this subject'}. Create your first topic.`
                        : "No topics found. Create your first topic to get started."
                }
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
