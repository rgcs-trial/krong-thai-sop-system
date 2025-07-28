/**
 * Restaurant Krong Thai SOP Management System
 * Tablet-optimized SOP navigation components
 * 
 * This module provides a complete SOP management interface optimized for:
 * - Tablet devices (iPad-sized screens)
 * - Touch-friendly interactions
 * - Bilingual content (EN/FR)
 * - Restaurant staff usability
 * - Offline-ready patterns
 */

// Core layout and navigation components
export { default as SOPBaseLayout } from './sop-base-layout';
export { default as SOPNavigationMain } from './sop-navigation-main';

// Dashboard and display components
export { default as SOPCategoryGrid } from './sop-category-grid';
export { default as SOPCategoriesDashboard } from './sop-categories-dashboard';
export { default as SOPDocumentViewer } from './sop-document-viewer';
export { default as SOPDocumentHeader } from './sop-document-header';
export { default as SOPFavoritesDashboard } from './sop-favorites-dashboard';

// Interactive workflow components
export { default as SOPStepChecklist } from './sop-step-checklist';
export { default as PhotoCaptureModal } from './photo-capture-modal';
export { default as CompletionConfirmationDialog } from './completion-confirmation-dialog';

// Search and discovery components
export { default as SOPSearchAdvanced } from './sop-search-advanced';
export { default as SOPSearch } from './sop-search';
export { default as QRScannerOverlay } from './qr-scanner-overlay';

// Status and indicator components
export { default as TaskStatusIndicators } from './task-status-indicators';
export { default as DifficultyLevelBadges } from './difficulty-level-badges';
export { default as TimeEstimationDisplay } from './time-estimation-display';

// Utility and verification components
export { default as EquipmentChecklist } from './equipment-checklist';
export { default as SafetyWarningsAlerts } from './safety-warnings-alerts';

// User experience components
export { default as SOPFavoritesSystem } from './sop-favorites-system';
export { default as RecentViewedCarousel } from './recent-viewed-carousel';
export { default as SOPSharingComponent } from './sop-sharing-component';
export { default as SOPPrintViewQR } from './sop-print-view-qr';

// Navigation and utility components
export { default as SOPBreadcrumb } from './sop-breadcrumb';

// Bilingual content management components
export { 
  BilingualContentEditor, 
  BilingualTitleEditor, 
  QuickBilingualInput 
} from './bilingual-content-editor';
export { 
  BilingualContentRenderer, 
  BilingualContentSummary 
} from './bilingual-content-renderer';
export { default as TranslationManagementDashboard } from './translation-management-dashboard';

// Types and interfaces
export type { SOPCategory } from './sop-categories-dashboard';
export type { SOPDocument } from './sop-document-viewer';
export type { BreadcrumbItem } from './sop-breadcrumb';

// Hooks
export { useFavorites } from '../../hooks/use-favorites';
export type { FavoriteItem } from '../../hooks/use-favorites';

/**
 * Usage Example:
 * 
 * import { SOPNavigationMain } from '@/components/sop';
 * 
 * export default function SOPPage({ params }: { params: { locale: string } }) {
 *   return (
 *     <SOPNavigationMain 
 *       locale={params.locale}
 *       initialView={{ type: 'categories' }}
 *     />
 *   );
 * }
 * 
 * Features included:
 * - 16 SOP categories with visual category cards
 * - Touch-friendly grid and list views
 * - Bilingual search with filters and sorting
 * - Favorites system with local storage persistence
 * - Breadcrumb navigation with touch targets
 * - Document viewer with step-by-step procedures
 * - Thai typography and proper text rendering
 * - Restaurant brand colors and styling
 * - Tablet-optimized responsive design
 * - Offline-ready interface patterns
 */