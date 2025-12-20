/**
 * SABIPREP - Admin Components
 * 
 * This module exports all admin-specific components for the SabiPrep Admin Portal.
 */

// StatCard - Display statistics with icon and change indicator
export { 
  StatCard, 
  StatIcons,
  type StatCardProps,
  type StatCardVariant,
} from './StatCard';

// AlertCard - Display system alerts with severity and actions
export { 
  AlertCard, 
  AlertList,
  type AlertCardProps,
  type AlertSeverity,
  type AlertListProps,
} from './AlertCard';

// DataTable - Reusable data table with sorting, filtering, and pagination
export { 
  DataTable,
  type DataTableProps,
  type ColumnDef,
  type PaginationInfo,
} from './DataTable';

// AdminHeader - Page header with breadcrumbs and actions
export { 
  AdminHeader, 
  AdminPageWrapper,
  AdminPrimaryButton,
  AdminSecondaryButton,
  type AdminHeaderProps,
  type AdminPageWrapperProps,
  type BreadcrumbItem,
} from './AdminHeader';

// AdminSidebar - Collapsible navigation sidebar
export {
  AdminSidebar,
  defaultAdminNavItems,
  type AdminSidebarProps,
  type NavItem,
  type SidebarUserInfo,
} from './AdminSidebar';

// UserFormModal - Modal for creating and editing users
export {
  UserFormModal,
  type UserFormModalProps,
  type UserFormData,
} from './UserFormModal';

// SubjectFormModal - Modal for creating and editing subjects
export {
  SubjectFormModal,
  SUBJECT_ICONS,
  SUBJECT_COLORS,
  EXAM_TYPES,
  type SubjectFormModalProps,
  type SubjectFormData,
} from './SubjectFormModal';

// TopicFormModal - Modal for creating and editing topics
export {
  TopicFormModal,
  type TopicFormModalProps,
  type TopicFormData,
} from './TopicFormModal';

// DeleteConfirmModal - Confirmation dialog for safe deletion
export {
  DeleteConfirmModal,
  type DeleteConfirmModalProps,
} from './DeleteConfirmModal';

// QuestionForm - Form for creating and editing questions
export {
  QuestionForm,
  type QuestionFormData,
} from './QuestionForm';

// QuestionPreview - Preview component for questions
export {
  QuestionPreview,
} from './QuestionPreview';

// ImageUpload - Image upload component with drag-and-drop
export {
  ImageUpload,
} from './ImageUpload';

// FileDropzone - Drag-and-drop file upload component
export {
  FileDropzone,
} from './FileDropzone';

// ValidationResultsTable - Display validation errors in a table
export {
  ValidationResultsTable,
} from './ValidationResultsTable';

// ImportProgressBar - Display import progress with stages
export {
  ImportProgressBar,
} from './ImportProgressBar';

// ImportReportCard - Display import report summary card
export {
  ImportReportCard,
} from './ImportReportCard';

// BatchEditModal - Modal for editing import batch
export {
  BatchEditModal,
  type BatchEditModalProps,
} from './BatchEditModal';

// BatchDeleteModal - Modal for confirming batch deletion
export {
  BatchDeleteModal,
  type BatchDeleteModalProps,
} from './BatchDeleteModal';

// QuickEditModal - Quick edit modal for questions
export {
  QuickEditModal,
  type QuickEditModalProps,
} from './QuickEditModal';

// BulkActionBar - Bulk action bar for selected items
export {
  BulkActionBar,
} from './BulkActionBar';
