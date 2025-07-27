/**
 * Restaurant Krong Thai SOP Management System
 * Tablet-optimized SOP navigation components
 * 
 * This module provides a complete SOP management interface optimized for:
 * - Tablet devices (iPad-sized screens)
 * - Touch-friendly interactions
 * - Bilingual content (EN/TH)
 * - Restaurant staff usability
 * - Offline-ready patterns
 */

// Main navigation component
export { default as SOPNavigationMain } from './sop-navigation-main';

// Core dashboard components
export { default as SOPCategoriesDashboard } from './sop-categories-dashboard';
export { default as SOPDocumentViewer } from './sop-document-viewer';
export { default as SOPFavoritesDashboard } from './sop-favorites-dashboard';

// Navigation and utility components
export { default as SOPBreadcrumb } from './sop-breadcrumb';
export { default as SOPSearch } from './sop-search';

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