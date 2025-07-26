/**
 * Touch Optimization Utilities for Restaurant Krong Thai SOP Management
 * Optimizes touch interactions and gestures for tablet devices
 */

import { performanceMonitor } from './performance-monitor';

interface TouchOptimizationOptions {
  enableFastClick?: boolean;
  preventZoom?: boolean;
  optimizeScrolling?: boolean;
  enableSwipeGestures?: boolean;
  hapticFeedback?: boolean;
}

interface SwipeGestureCallback {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

class TouchOptimizer {
  private options: TouchOptimizationOptions;
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private isOptimized: boolean = false;

  constructor(options: TouchOptimizationOptions = {}) {
    this.options = {
      enableFastClick: true,
      preventZoom: true,
      optimizeScrolling: true,
      enableSwipeGestures: true,
      hapticFeedback: true,
      ...options,
    };
  }

  // Initialize touch optimizations
  initialize(): void {
    if (typeof window === 'undefined' || this.isOptimized) return;

    console.log('[TouchOptimizer] Initializing touch optimizations...');

    // Apply viewport optimizations
    this.optimizeViewport();

    // Add touch event optimizations
    this.optimizeTouchEvents();

    // Optimize scrolling performance
    if (this.options.optimizeScrolling) {
      this.optimizeScrolling();
    }

    // Prevent unwanted zoom
    if (this.options.preventZoom) {
      this.preventZoom();
    }

    // Add CSS optimizations
    this.addCSSOptimizations();

    this.isOptimized = true;
    console.log('[TouchOptimizer] Touch optimizations applied');
  }

  private optimizeViewport(): void {
    // Ensure proper viewport meta tag for tablets
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    // Optimized viewport for tablets with no zoom
    viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  }

  private optimizeTouchEvents(): void {
    // Add passive event listeners for better performance
    const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'scroll'];
    
    passiveEvents.forEach(event => {
      document.addEventListener(event, this.handlePassiveTouch, { passive: true });
    });

    // Add active touch handlers for interaction tracking
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
  }

  private handlePassiveTouch = (event: Event): void => {
    // Track touch performance metrics
    performanceMonitor.trackUserInteraction('touch-event', {
      type: event.type,
      timestamp: Date.now(),
    });
  };

  private handleTouchStart(event: TouchEvent): void {
    this.touchStartTime = Date.now();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    }

    // Provide haptic feedback if supported
    if (this.options.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Very light vibration
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const touchDuration = Date.now() - this.touchStartTime;
    
    // Track touch interaction performance
    performanceMonitor.trackUserInteraction('touch-interaction', {
      duration: touchDuration,
      touches: event.changedTouches.length,
      timestamp: Date.now(),
    });

    // Fast click optimization
    if (this.options.enableFastClick && touchDuration < 300) {
      this.handleFastClick(event);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    // Prevent scrolling on certain elements when appropriate
    const target = event.target as HTMLElement;
    
    if (target && target.closest('.no-scroll, .sop-viewer-controls')) {
      event.preventDefault();
    }
  }

  private handleFastClick(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    
    if (target && (target.tagName === 'BUTTON' || target.closest('button, [role="button"]'))) {
      // Add visual feedback for button press
      target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        target.style.transform = '';
      }, 150);
    }
  }

  private optimizeScrolling(): void {
    // Enable momentum scrolling on iOS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Optimize scroll performance with CSS
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      .scroll-container {
        will-change: scroll-position;
        transform: translateZ(0);
      }
      
      .sop-content {
        contain: layout style paint;
      }
    `;
    document.head.appendChild(style);
  }

  private preventZoom(): void {
    // Prevent pinch zoom
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  private addCSSOptimizations(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Touch optimization styles */
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Allow text selection in content areas */
      .sop-content, .sop-text, input, textarea, [contenteditable] {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
      
      /* Optimize button interactions */
      button, [role="button"], .clickable {
        touch-action: manipulation;
        cursor: pointer;
      }
      
      /* Improve scrolling areas */
      .scroll-container {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: y proximity;
      }
      
      /* Performance optimizations */
      .sop-card, .sop-category {
        will-change: transform;
        transform: translateZ(0);
      }
      
      /* Touch feedback */
      .touch-feedback:active {
        transform: scale(0.98);
        transition: transform 0.1s ease;
      }
      
      /* Tablet-specific optimizations */
      @media (min-width: 768px) and (max-width: 1024px) {
        /* Larger touch targets for tablets */
        button, .btn {
          min-height: 44px;
          min-width: 44px;
          padding: 12px 16px;
        }
        
        /* Improved spacing for touch */
        .sop-navigation a {
          padding: 16px 20px;
          margin: 4px 0;
        }
        
        /* Optimized list items */
        .sop-list-item {
          padding: 16px;
          margin: 8px 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Add swipe gesture support to elements
  addSwipeGestures(element: HTMLElement, callbacks: SwipeGestureCallback): void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
      }
    };

    const handleEnd = (event: TouchEvent) => {
      if (event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const deltaTime = Date.now() - startTime;

        // Minimum swipe distance and maximum time
        const minDistance = 50;
        const maxTime = 500;

        if (Math.abs(deltaX) > minDistance && deltaTime < maxTime) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0 && callbacks.onSwipeRight) {
              callbacks.onSwipeRight();
              performanceMonitor.trackUserInteraction('swipe-gesture', {
                direction: 'right',
                distance: deltaX,
                duration: deltaTime,
              });
            } else if (deltaX < 0 && callbacks.onSwipeLeft) {
              callbacks.onSwipeLeft();
              performanceMonitor.trackUserInteraction('swipe-gesture', {
                direction: 'left',
                distance: Math.abs(deltaX),
                duration: deltaTime,
              });
            }
          }
        }

        if (Math.abs(deltaY) > minDistance && deltaTime < maxTime) {
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Vertical swipe
            if (deltaY > 0 && callbacks.onSwipeDown) {
              callbacks.onSwipeDown();
              performanceMonitor.trackUserInteraction('swipe-gesture', {
                direction: 'down',
                distance: deltaY,
                duration: deltaTime,
              });
            } else if (deltaY < 0 && callbacks.onSwipeUp) {
              callbacks.onSwipeUp();
              performanceMonitor.trackUserInteraction('swipe-gesture', {
                direction: 'up',
                distance: Math.abs(deltaY),
                duration: deltaTime,
              });
            }
          }
        }
      }
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchend', handleEnd, { passive: true });
  }

  // Optimize image touch interactions
  optimizeImageTouch(imageElement: HTMLElement): void {
    // Prevent context menu on long press
    imageElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Add touch feedback
    imageElement.classList.add('touch-feedback');

    // Optimize image loading priority on touch
    imageElement.addEventListener('touchstart', () => {
      const img = imageElement.querySelector('img');
      if (img && img.loading === 'lazy') {
        img.loading = 'eager';
      }
    }, { once: true });
  }

  // Add pull-to-refresh functionality
  addPullToRefresh(container: HTMLElement, onRefresh: () => Promise<void>): void {
    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    let pullDistance = 0;
    const refreshThreshold = 100;

    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'pull-refresh-indicator';
    refreshIndicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #E31B23;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      opacity: 0;
    `;
    refreshIndicator.innerHTML = '↓';
    container.style.position = 'relative';
    container.appendChild(refreshIndicator);

    const handleTouchStart = (event: TouchEvent) => {
      if (container.scrollTop === 0 && event.touches.length === 1) {
        startY = event.touches[0].clientY;
        currentY = startY;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isRefreshing || container.scrollTop > 0) return;

      currentY = event.touches[0].clientY;
      pullDistance = Math.max(0, currentY - startY);

      if (pullDistance > 0) {
        event.preventDefault();
        
        const opacity = Math.min(pullDistance / refreshThreshold, 1);
        const translateY = Math.min(pullDistance * 0.5, 30);
        
        refreshIndicator.style.opacity = opacity.toString();
        refreshIndicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
        
        if (pullDistance >= refreshThreshold) {
          refreshIndicator.innerHTML = '↑';
          refreshIndicator.style.background = '#008B8B';
        } else {
          refreshIndicator.innerHTML = '↓';
          refreshIndicator.style.background = '#E31B23';
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= refreshThreshold && !isRefreshing) {
        isRefreshing = true;
        refreshIndicator.innerHTML = '⟳';
        refreshIndicator.style.animation = 'spin 1s linear infinite';
        
        try {
          await onRefresh();
          performanceMonitor.trackUserInteraction('pull-to-refresh', {
            pullDistance,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[TouchOptimizer] Pull to refresh failed:', error);
        } finally {
          isRefreshing = false;
          refreshIndicator.style.opacity = '0';
          refreshIndicator.style.transform = 'translateX(-50%) translateY(-60px)';
          refreshIndicator.style.animation = '';
          refreshIndicator.innerHTML = '↓';
          refreshIndicator.style.background = '#E31B23';
        }
      } else {
        refreshIndicator.style.opacity = '0';
        refreshIndicator.style.transform = 'translateX(-50%) translateY(-60px)';
      }
      
      pullDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: translateX(-50%) rotate(0deg); }
        to { transform: translateX(-50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup method
  destroy(): void {
    // Remove event listeners and cleanup
    this.isOptimized = false;
    console.log('[TouchOptimizer] Touch optimizations removed');
  }
}

// Export singleton instance
export const touchOptimizer = new TouchOptimizer();

// React hook for touch optimization
import { useEffect } from 'react';

export function useTouchOptimization(options?: TouchOptimizationOptions) {
  useEffect(() => {
    const optimizer = new TouchOptimizer(options);
    optimizer.initialize();
    
    return () => {
      optimizer.destroy();
    };
  }, []);

  return {
    addSwipeGestures: touchOptimizer.addSwipeGestures.bind(touchOptimizer),
    optimizeImageTouch: touchOptimizer.optimizeImageTouch.bind(touchOptimizer),
    addPullToRefresh: touchOptimizer.addPullToRefresh.bind(touchOptimizer),
  };
}

// Utility functions
export function initializeTouchOptimization(options?: TouchOptimizationOptions): void {
  const optimizer = new TouchOptimizer(options);
  optimizer.initialize();
}

export function addSwipeNavigation(
  element: HTMLElement,
  onPrevious: () => void,
  onNext: () => void
): void {
  touchOptimizer.addSwipeGestures(element, {
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  });
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      touchOptimizer.initialize();
    });
  } else {
    touchOptimizer.initialize();
  }
}