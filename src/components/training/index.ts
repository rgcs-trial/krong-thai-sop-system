/**
 * Training Components Index
 * Comprehensive training module system for Restaurant Krong Thai
 */

// Core Training Components
export { default as TrainingSession } from './training-session';
export { default as TrainingAssessment } from './training-assessment';
export { default as TrainingAnalyticsDashboard } from './training-analytics-dashboard';
export { default as TrainingCertificates } from './training-certificates';
export { default as TrainingContentManager } from './training-content-manager';

// Re-export store hooks for convenience
export {
  useTraining,
  useTrainingNavigation,
  useTrainingAssessment,
  useTrainingProgress,
  useTrainingCertificates,
  useTrainingGamification
} from '@/lib/stores/training-store';