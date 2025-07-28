/**
 * Restaurant Krong Thai Task Management System
 * Comprehensive task management components for restaurant operations
 * 
 * This module provides a complete task management interface optimized for:
 * - Tablet devices (iPad-sized screens)
 * - Touch-friendly interactions
 * - Bilingual content (EN/FR)
 * - Restaurant staff workflow management
 * - Real-time collaboration and notifications
 * - Performance tracking and analytics
 */

// Core dashboard and overview components
export { default as PersonalTaskDashboard } from './personal-task-dashboard';
export { default as TaskCalendarView } from './task-calendar-view';

// Notification and communication components
export { default as TaskNotificationSystem, useTaskNotifications } from './task-notification-system';
export { default as TaskCommentSystem } from './task-comment-system';
export { default as TaskCollaborationPanel } from './task-collaboration-panel';

// Time tracking and productivity components
export { default as TaskTimerComponent } from './task-timer-component';

// Workflow and dependency management components
export { default as TaskDependencyVisualization } from './task-dependency-visualization';

// Types and interfaces
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskRecurrence,
  EscalationLevel,
  DifficultyRating,
  TaskTemplate,
  TaskChecklistItem,
  TaskComment,
  TaskNotification,
  TaskNotificationType,
  TaskTimeEntry,
  TaskDependency,
  TaskAssignment,
  TaskCalendarEvent,
  TaskDashboardStats,
  TaskPerformanceMetrics,
  TaskAnalytics,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskBulkOperation,
  TaskSearchParams,
  TaskCalendarParams
} from '@/types/database';

/**
 * Usage Examples:
 * 
 * // Personal Task Dashboard
 * import { PersonalTaskDashboard } from '@/components/tasks';
 * 
 * <PersonalTaskDashboard 
 *   locale="fr"
 *   userId="user-123"
 *   restaurantId="restaurant-456"
 *   className="max-w-6xl mx-auto"
 * />
 * 
 * // Task Calendar View
 * import { TaskCalendarView } from '@/components/tasks';
 * 
 * <TaskCalendarView
 *   locale="en"
 *   userId="user-123"
 *   restaurantId="restaurant-456"
 *   onTaskClick={(task) => console.log('Task clicked:', task)}
 *   onDateSelect={(date) => console.log('Date selected:', date)}
 * />
 * 
 * // Task Notifications
 * import { TaskNotificationSystem } from '@/components/tasks';
 * 
 * <TaskNotificationSystem
 *   locale="fr"
 *   userId="user-123"
 *   restaurantId="restaurant-456"
 *   onNotificationClick={(notification) => handleNotificationClick(notification)}
 * />
 * 
 * // Task Timer for Time Tracking
 * import { TaskTimerComponent } from '@/components/tasks';
 * 
 * <TaskTimerComponent
 *   task={selectedTask}
 *   locale="en"
 *   userId="user-123"
 *   onTimeUpdate={(timeEntry) => saveTimeEntry(timeEntry)}
 *   onTaskComplete={(task, totalTime) => markTaskComplete(task, totalTime)}
 * />
 * 
 * // Task Collaboration
 * import { TaskCollaborationPanel } from '@/components/tasks';
 * 
 * <TaskCollaborationPanel
 *   task={teamTask}
 *   locale="fr"
 *   currentUserId="user-123"
 *   onTeamMemberAdd={(userId) => addTeamMember(userId)}
 *   onCommentAdd={(comment) => addComment(comment)}
 * />
 * 
 * // Task Comments and Feedback
 * import { TaskCommentSystem } from '@/components/tasks';
 * 
 * <TaskCommentSystem
 *   task={currentTask}
 *   locale="en"
 *   currentUser={currentUser}
 *   onCommentAdd={(comment) => saveComment(comment)}
 *   onCommentEdit={(id, text) => updateComment(id, text)}
 * />
 * 
 * // Task Dependencies
 * import { TaskDependencyVisualization } from '@/components/tasks';
 * 
 * <TaskDependencyVisualization
 *   task={complexTask}
 *   locale="fr"
 *   onDependencyAdd={(dependency) => createDependency(dependency)}
 *   onDependencyRemove={(id) => removeDependency(id)}
 *   onTaskClick={(taskId) => navigateToTask(taskId)}
 * />
 */

/**
 * Key Features Included:
 * 
 * 1. Personal Task Dashboard:
 *    - Priority-based task sorting and filtering
 *    - Real-time status updates and progress tracking
 *    - Tablet-optimized grid and list views
 *    - Quick stats and performance metrics
 *    - Integration with SOP system
 * 
 * 2. Task Calendar View:
 *    - Month, week, and day views
 *    - Drag-and-drop task scheduling
 *    - Visual priority and status indicators
 *    - Team task visualization
 *    - Scheduling conflict detection
 * 
 * 3. Notification System:
 *    - Real-time task assignment notifications
 *    - Due date and overdue alerts
 *    - Team collaboration notifications
 *    - Manager feedback alerts
 *    - Escalation notifications
 * 
 * 4. Time Tracking:
 *    - Accurate task timing with break tracking
 *    - Performance metrics and efficiency scoring
 *    - Overtime detection and reporting
 *    - Break reason categorization
 *    - Completion time estimation
 * 
 * 5. Team Collaboration:
 *    - Real-time team member coordination
 *    - Task sharing and delegation
 *    - Voice and video call integration
 *    - Activity feed and status updates
 *    - Role-based permissions
 * 
 * 6. Comment System:
 *    - Manager feedback and instructions
 *    - Staff questions and clarifications
 *    - Internal notes and documentation
 *    - Reaction and engagement features
 *    - Priority-based message types
 * 
 * 7. Dependency Management:
 *    - Visual task dependency mapping
 *    - Prerequisite checking and validation
 *    - Critical path identification
 *    - Timeline and workflow visualization
 *    - Dependency conflict resolution
 */

/**
 * Component Architecture:
 * 
 * - All components are tablet-first responsive
 * - Bilingual support with EN/FR translations
 * - Touch-optimized interfaces with minimum 44px targets
 * - Consistent with Krong Thai brand colors and typography
 * - Real-time WebSocket integration for live updates
 * - Offline-capable with intelligent sync
 * - Accessibility compliant with ARIA labels
 * - Performance optimized for 100+ concurrent users
 */

/**
 * Integration Points:
 * 
 * - SOP Management System: Direct linking to procedure documents
 * - Training System: Automatic training requirement checking
 * - Analytics System: Performance data collection and reporting
 * - Authentication System: Role-based access and permissions
 * - Translation System: Dynamic content localization
 * - Notification System: Multi-channel alert delivery
 */