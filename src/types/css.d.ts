/**
 * CSS Type Extensions for Touch Optimization
 * Restaurant Krong Thai SOP Management System
 */

declare module 'react' {
  interface CSSProperties {
    webkitOverflowScrolling?: 'auto' | 'touch';
    webkitTapHighlightColor?: string;
    webkitTouchCallout?: 'none' | 'default';
    webkitUserSelect?: 'none' | 'auto' | 'text';
    mozUserSelect?: 'none' | 'auto' | 'text';
    msUserSelect?: 'none' | 'auto' | 'text';
    touchAction?: 'auto' | 'none' | 'pan-x' | 'pan-y' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'pinch-zoom' | 'manipulation';
  }
}

// Extend CSSStyleDeclaration for direct DOM manipulation
declare global {
  interface CSSStyleDeclaration {
    webkitOverflowScrolling: string;
    webkitTapHighlightColor: string;
    webkitTouchCallout: string;
    webkitUserSelect: string;
    mozUserSelect: string;
    msUserSelect: string;
    touchAction: string;
  }
}

export {};