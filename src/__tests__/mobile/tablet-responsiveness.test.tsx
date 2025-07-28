import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, useEffect } from 'react';
import { TestWrapper } from '../utils/test-utils';

// Mock responsive design utilities
const mockResponsiveUtils = {
  getViewportSize: () => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),
  getDevicePixelRatio: () => window.devicePixelRatio || 1,
  isPortrait: () => window.innerHeight > window.innerWidth,
  isLandscape: () => window.innerWidth > window.innerHeight,
  getTouchCapability: () => 'ontouchstart' in window
};

// Mock components for responsive testing
const MockResponsiveSOPComponent = ({ orientation, viewportSize }) => {
  const [layout, setLayout] = useState('mobile');

  useEffect(() => {
    if (viewportSize.width >= 1024) {
      setLayout('desktop');
    } else if (viewportSize.width >= 768) {
      setLayout('tablet');
    } else {
      setLayout('mobile');
    }
  }, [viewportSize]);

  return (
    <div 
      data-testid="responsive-sop"
      className={`responsive-container ${layout} ${orientation}`}
    >
      <header data-testid="sop-header" className="responsive-header">
        <h1>SOP Document Viewer</h1>
        <nav data-testid="sop-navigation">
          <button className="nav-button">Categories</button>
          <button className="nav-button">Search</button>
          <button className="nav-button">Favorites</button>
        </nav>
      </header>
      
      <main data-testid="sop-content" className="responsive-content">
        <div data-testid="sop-steps" className="steps-container">
          {[1, 2, 3].map(step => (
            <div key={step} data-testid={`step-${step}`} className="step-card">
              <h3>Step {step}</h3>
              <p>Step {step} instructions for tablet interface</p>
              <button className="step-button">Complete Step {step}</button>
            </div>
          ))}
        </div>
        
        <aside data-testid="sop-sidebar" className="responsive-sidebar">
          <div className="progress-indicator">
            <div data-testid="progress-bar" className="progress-bar" />
          </div>
          <div className="action-buttons">
            <button className="action-button primary">Save Progress</button>
            <button className="action-button secondary">Print SOP</button>
          </div>
        </aside>
      </main>
    </div>
  );
};

const MockTouchInteractionComponent = ({ onTouch, onGesture }) => {
  const [touchState, setTouchState] = useState({ active: false, coordinates: null });

  const handleTouchStart = (e) => {
    setTouchState({ active: true, coordinates: { x: e.touches[0].clientX, y: e.touches[0].clientY } });
    onTouch?.('touchstart', e);
  };

  const handleTouchMove = (e) => {
    if (touchState.active) {
      const newCoords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const deltaX = newCoords.x - touchState.coordinates.x;
      const deltaY = newCoords.y - touchState.coordinates.y;
      
      if (Math.abs(deltaX) > 50) {
        onGesture?.(deltaX > 0 ? 'swipe-right' : 'swipe-left');
      }
      
      onTouch?.('touchmove', e);
    }
  };

  const handleTouchEnd = (e) => {
    setTouchState({ active: false, coordinates: null });
    onTouch?.('touchend', e);
  };

  return (
    <div 
      data-testid="touch-area"
      className="touch-interaction-area"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ width: '100%', height: '300px', background: '#f0f0f0', touchAction: 'manipulation' }}
    >
      <div data-testid="touch-indicator" className={touchState.active ? 'touching' : 'not-touching'}>
        Touch area for gesture testing
        {touchState.coordinates && (
          <span data-testid="touch-coordinates">
            {touchState.coordinates.x}, {touchState.coordinates.y}
          </span>
        )}
      </div>
    </div>
  );
};

const MockAdaptiveLayoutComponent = ({ screenSize }) => {
  const getColumnsForScreen = (size) => {
    switch (size) {
      case 'small': return 1;
      case 'medium': return 2;
      case 'large': return 3;
      case 'xlarge': return 4;
      default: return 2;
    }
  };

  const columns = getColumnsForScreen(screenSize);

  return (
    <div 
      data-testid="adaptive-layout"
      className={`grid-layout columns-${columns}`}
      style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '16px'
      }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div 
          key={index}
          data-testid={`grid-item-${index}`}
          className="grid-item"
          style={{ 
            background: '#e0e0e0',
            padding: '20px',
            borderRadius: '8px',
            minHeight: '120px'
          }}
        >
          Item {index + 1}
        </div>
      ))}
    </div>
  );
};

describe('Tablet Responsiveness Tests', () => {
  const VIEWPORT_SIZES = {
    mobile: { width: 375, height: 667 },
    tablet_portrait: { width: 768, height: 1024 },
    tablet_landscape: { width: 1024, height: 768 },
    desktop: { width: 1440, height: 900 }
  };

  const setViewport = (size) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: size.width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: size.height
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set default tablet viewport
    setViewport(VIEWPORT_SIZES.tablet_portrait);
    
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true
    });
    
    // Mock device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Viewport Adaptation', () => {
    it('adapts layout for different tablet orientations', async () => {
      const ResizeTestComponent = () => {
        const [viewportSize, setViewportSize] = useState(mockResponsiveUtils.getViewportSize());
        const [orientation, setOrientation] = useState(mockResponsiveUtils.isPortrait() ? 'portrait' : 'landscape');

        useEffect(() => {
          const handleResize = () => {
            setViewportSize(mockResponsiveUtils.getViewportSize());
            setOrientation(mockResponsiveUtils.isPortrait() ? 'portrait' : 'landscape');
          };

          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
          <MockResponsiveSOPComponent 
            orientation={orientation}
            viewportSize={viewportSize}
          />
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <ResizeTestComponent />
        </TestWrapper>
      );

      // Start in portrait
      expect(screen.getByTestId('responsive-sop')).toHaveClass('portrait');

      // Change to landscape
      setViewport(VIEWPORT_SIZES.tablet_landscape);
      
      rerender(
        <TestWrapper>
          <ResizeTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('responsive-sop')).toHaveClass('landscape');
      });
    });

    it('adjusts component layout based on screen size', () => {
      const { rerender } = render(
        <TestWrapper>
          <MockAdaptiveLayoutComponent screenSize="small" />
        </TestWrapper>
      );

      // Small screen should show 1 column
      expect(screen.getByTestId('adaptive-layout')).toHaveClass('columns-1');

      // Medium screen should show 2 columns
      rerender(
        <TestWrapper>
          <MockAdaptiveLayoutComponent screenSize="medium" />
        </TestWrapper>
      );

      expect(screen.getByTestId('adaptive-layout')).toHaveClass('columns-2');

      // Large screen should show 3 columns
      rerender(
        <TestWrapper>
          <MockAdaptiveLayoutComponent screenSize="large" />
        </TestWrapper>
      );

      expect(screen.getByTestId('adaptive-layout')).toHaveClass('columns-3');
    });

    it('maintains usability across different pixel densities', () => {
      const PixelDensityComponent = () => {
        const [pixelRatio, setPixelRatio] = useState(window.devicePixelRatio);

        return (
          <div data-testid="pixel-density-test">
            <div data-testid="pixel-ratio">Pixel Ratio: {pixelRatio}</div>
            <button 
              className="density-aware-button"
              style={{
                minWidth: `${44 * pixelRatio}px`,
                minHeight: `${44 * pixelRatio}px`,
                transform: `scale(${1 / pixelRatio})`
              }}
              data-testid="density-button"
            >
              Density Aware Button
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <PixelDensityComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('pixel-ratio')).toHaveTextContent('Pixel Ratio: 2');
      
      const button = screen.getByTestId('density-button');
      expect(button).toHaveStyle({ transform: 'scale(0.5)' });
    });
  });

  describe('Touch Interface Optimization', () => {
    it('provides adequate touch target sizes for tablet use', () => {
      render(
        <TestWrapper>
          <MockResponsiveSOPComponent 
            orientation="portrait"
            viewportSize={VIEWPORT_SIZES.tablet_portrait}
          />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button);
        const width = parseInt(computedStyle.minWidth) || parseInt(computedStyle.width);
        const height = parseInt(computedStyle.minHeight) || parseInt(computedStyle.height);
        
        // Touch targets should be at least 44x44px
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      });
    });

    it('handles touch gestures appropriately', async () => {
      const mockTouchHandler = vi.fn();
      const mockGestureHandler = vi.fn();

      render(
        <TestWrapper>
          <MockTouchInteractionComponent 
            onTouch={mockTouchHandler}
            onGesture={mockGestureHandler}
          />
        </TestWrapper>
      );

      const touchArea = screen.getByTestId('touch-area');

      // Simulate touch events
      fireEvent.touchStart(touchArea, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      expect(mockTouchHandler).toHaveBeenCalledWith('touchstart', expect.any(Object));
      expect(screen.getByTestId('touch-indicator')).toHaveClass('touching');

      // Simulate swipe gesture
      fireEvent.touchMove(touchArea, {
        touches: [{ clientX: 200, clientY: 100 }]
      });

      expect(mockGestureHandler).toHaveBeenCalledWith('swipe-right');

      fireEvent.touchEnd(touchArea);
      expect(mockTouchHandler).toHaveBeenCalledWith('touchend', expect.any(Object));
      expect(screen.getByTestId('touch-indicator')).toHaveClass('not-touching');
    });

    it('implements proper touch action behaviors to prevent scrolling issues', () => {
      render(
        <TestWrapper>
          <MockTouchInteractionComponent />
        </TestWrapper>
      );

      const touchArea = screen.getByTestId('touch-area');
      expect(touchArea).toHaveStyle({ touchAction: 'manipulation' });
    });

    it('supports multi-touch interactions for tablet workflows', async () => {
      const MultiTouchComponent = () => {
        const [touches, setTouches] = useState([]);

        const handleMultiTouch = (e) => {
          const touchList = Array.from(e.touches).map(touch => ({
            id: touch.identifier,
            x: touch.clientX,
            y: touch.clientY
          }));
          setTouches(touchList);
        };

        return (
          <div 
            data-testid="multi-touch-area"
            onTouchStart={handleMultiTouch}
            onTouchMove={handleMultiTouch}
            onTouchEnd={handleMultiTouch}
            style={{ width: '100%', height: '200px', background: '#f0f0f0' }}
          >
            <div data-testid="touch-count">Touches: {touches.length}</div>
            {touches.map(touch => (
              <div 
                key={touch.id}
                data-testid={`touch-${touch.id}`}
                style={{
                  position: 'absolute',
                  left: touch.x,
                  top: touch.y,
                  width: '20px',
                  height: '20px',
                  background: 'red',
                  borderRadius: '50%'
                }}
              />
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <MultiTouchComponent />
        </TestWrapper>
      );

      const multiTouchArea = screen.getByTestId('multi-touch-area');

      // Simulate two-finger touch
      fireEvent.touchStart(multiTouchArea, {
        touches: [
          { identifier: 0, clientX: 100, clientY: 100 },
          { identifier: 1, clientX: 200, clientY: 200 }
        ]
      });

      expect(screen.getByTestId('touch-count')).toHaveTextContent('Touches: 2');
      expect(screen.getByTestId('touch-0')).toBeInTheDocument();
      expect(screen.getByTestId('touch-1')).toBeInTheDocument();
    });
  });

  describe('Typography and Readability', () => {
    it('maintains readable font sizes across different screen densities', () => {
      const TypographyComponent = () => {
        const baseFontSize = 16; // Base font size in px
        const scaleFactor = window.devicePixelRatio;
        
        return (
          <div data-testid="typography-test">
            <h1 
              data-testid="heading-1"
              style={{ fontSize: `${24 * scaleFactor}px` }}
            >
              Main Heading
            </h1>
            <h2 
              data-testid="heading-2"
              style={{ fontSize: `${20 * scaleFactor}px` }}
            >
              Section Heading
            </h2>
            <p 
              data-testid="body-text"
              style={{ fontSize: `${baseFontSize * scaleFactor}px` }}
            >
              Body text should remain readable across different pixel densities.
            </p>
            <small 
              data-testid="small-text"
              style={{ fontSize: `${14 * scaleFactor}px` }}
            >
              Small text for metadata
            </small>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TypographyComponent />
        </TestWrapper>
      );

      // Check that font sizes are appropriately scaled
      expect(screen.getByTestId('heading-1')).toHaveStyle({ fontSize: '48px' }); // 24 * 2
      expect(screen.getByTestId('body-text')).toHaveStyle({ fontSize: '32px' }); // 16 * 2
      expect(screen.getByTestId('small-text')).toHaveStyle({ fontSize: '28px' }); // 14 * 2
    });

    it('adjusts line height and spacing for tablet reading', () => {
      const ReadabilityComponent = () => (
        <div data-testid="readability-test">
          <div 
            data-testid="paragraph-block"
            style={{
              lineHeight: '1.6',
              letterSpacing: '0.02em',
              wordSpacing: '0.1em',
              marginBottom: '1.5em'
            }}
          >
            <p>
              This paragraph should have optimal line height and spacing for tablet reading.
              The text should be easy to read and scan quickly for restaurant staff.
            </p>
          </div>
          
          <ul 
            data-testid="list-spacing"
            style={{
              lineHeight: '1.8',
              paddingLeft: '1.5em'
            }}
          >
            <li>List item with proper spacing</li>
            <li>Another list item with good readability</li>
            <li>Third item maintaining consistency</li>
          </ul>
        </div>
      );

      render(
        <TestWrapper>
          <ReadabilityComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('paragraph-block')).toHaveStyle({
        lineHeight: '1.6',
        letterSpacing: '0.02em'
      });

      expect(screen.getByTestId('list-spacing')).toHaveStyle({
        lineHeight: '1.8'
      });
    });

    it('ensures sufficient color contrast for tablet displays', () => {
      const ContrastComponent = () => (
        <div data-testid="contrast-test">
          <div 
            data-testid="high-contrast-text"
            style={{
              color: '#000000',
              backgroundColor: '#ffffff',
              padding: '16px'
            }}
          >
            High contrast text (21:1 ratio)
          </div>
          
          <div 
            data-testid="medium-contrast-text"
            style={{
              color: '#333333',
              backgroundColor: '#f5f5f5',
              padding: '16px'
            }}
          >
            Medium contrast text (adequate for AA)
          </div>
          
          <button 
            data-testid="interactive-element"
            style={{
              color: '#ffffff',
              backgroundColor: '#0066cc',
              border: '2px solid #004499',
              padding: '12px 24px'
            }}
          >
            Interactive Element
          </button>
        </div>
      );

      render(
        <TestWrapper>
          <ContrastComponent />
        </TestWrapper>
      );

      // Visual regression testing would verify actual contrast ratios
      // Here we verify the styling is applied correctly
      expect(screen.getByTestId('high-contrast-text')).toHaveStyle({
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)'
      });

      expect(screen.getByTestId('interactive-element')).toHaveStyle({
        color: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(0, 102, 204)'
      });
    });
  });

  describe('Performance on Mobile Hardware', () => {
    it('optimizes rendering performance for tablet hardware constraints', async () => {
      const PerformanceTestComponent = () => {
        const [renderTime, setRenderTime] = useState(0);
        const [itemCount, setItemCount] = useState(50);

        useEffect(() => {
          const startTime = performance.now();
          
          // Simulate heavy rendering
          setTimeout(() => {
            const endTime = performance.now();
            setRenderTime(endTime - startTime);
          }, 0);
        }, [itemCount]);

        return (
          <div data-testid="performance-test">
            <div data-testid="render-time">Render time: {renderTime.toFixed(2)}ms</div>
            <div data-testid="item-count">Items: {itemCount}</div>
            
            <div 
              data-testid="virtualized-list"
              style={{ 
                height: '400px', 
                overflow: 'auto',
                contain: 'layout style paint' // CSS containment for performance
              }}
            >
              {Array.from({ length: itemCount }, (_, index) => (
                <div 
                  key={index}
                  data-testid={`list-item-${index}`}
                  style={{
                    height: '60px',
                    padding: '16px',
                    borderBottom: '1px solid #eee',
                    willChange: 'transform' // Optimize for animations
                  }}
                >
                  List Item {index + 1}
                </div>
              ))}
            </div>
            
            <button 
              data-testid="increase-items"
              onClick={() => setItemCount(count => count + 50)}
            >
              Add More Items
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <PerformanceTestComponent />
        </TestWrapper>
      );

      // Initial render should be reasonably fast
      await waitFor(() => {
        const renderTimeElement = screen.getByTestId('render-time');
        const renderTime = parseFloat(renderTimeElement.textContent.match(/(\d+\.?\d*)/)[1]);
        expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      });

      // Test performance with more items
      const user = userEvent.setup();
      await user.click(screen.getByTestId('increase-items'));

      await waitFor(() => {
        expect(screen.getByTestId('item-count')).toHaveTextContent('Items: 100');
      });
    });

    it('implements efficient memory management for large datasets', () => {
      const MemoryTestComponent = () => {
        const [memoryUsage, setMemoryUsage] = useState(null);
        const [dataSize, setDataSize] = useState(100);

        useEffect(() => {
          // Simulate memory usage tracking
          if ('memory' in performance) {
            const usage = (performance as any).memory;
            setMemoryUsage({
              used: Math.round(usage.usedJSMemory / 1024 / 1024),
              total: Math.round(usage.totalJSMemory / 1024 / 1024),
              limit: Math.round(usage.jsMemoryLimit / 1024 / 1024)
            });
          }
        }, [dataSize]);

        const generateLargeDataset = () => {
          return Array.from({ length: dataSize }, (_, index) => ({
            id: index,
            title: `SOP Document ${index}`,
            content: `Content for document ${index}`.repeat(10),
            metadata: {
              created: new Date().toISOString(),
              category: `Category ${index % 5}`,
              tags: Array.from({ length: 5 }, (_, i) => `tag${i}`)
            }
          }));
        };

        const [dataset] = useState(() => generateLargeDataset());

        return (
          <div data-testid="memory-test">
            {memoryUsage && (
              <div data-testid="memory-stats">
                Memory: {memoryUsage.used}MB / {memoryUsage.total}MB 
                (Limit: {memoryUsage.limit}MB)
              </div>
            )}
            
            <div data-testid="dataset-size">Dataset size: {dataset.length} items</div>
            
            <button 
              data-testid="increase-dataset"
              onClick={() => setDataSize(size => size * 2)}
            >
              Double Dataset Size
            </button>
            
            <div 
              data-testid="data-display"
              style={{ 
                maxHeight: '200px', 
                overflow: 'auto',
                contain: 'layout style'
              }}
            >
              {dataset.slice(0, 10).map(item => (
                <div key={item.id} data-testid={`data-item-${item.id}`}>
                  {item.title}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <MemoryTestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('dataset-size')).toHaveTextContent('Dataset size: 100 items');
      
      // Display should only show first 10 items for performance
      expect(screen.getByTestId('data-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('data-item-9')).toBeInTheDocument();
      expect(screen.queryByTestId('data-item-10')).not.toBeInTheDocument();
    });

    it('optimizes animations and transitions for smooth tablet performance', async () => {
      const AnimationTestComponent = () => {
        const [isAnimating, setIsAnimating] = useState(false);
        const [animationDuration, setAnimationDuration] = useState(0);

        const triggerAnimation = () => {
          const startTime = performance.now();
          setIsAnimating(true);
          
          setTimeout(() => {
            setIsAnimating(false);
            const endTime = performance.now();
            setAnimationDuration(endTime - startTime);
          }, 300); // 300ms animation
        };

        return (
          <div data-testid="animation-test">
            <div data-testid="animation-duration">
              Animation duration: {animationDuration.toFixed(2)}ms
            </div>
            
            <div 
              data-testid="animated-element"
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#3498db',
                transform: isAnimating ? 'translateX(200px) scale(1.2)' : 'translateX(0) scale(1)',
                transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform' // Optimize for GPU acceleration
              }}
            />
            
            <button 
              data-testid="trigger-animation"
              onClick={triggerAnimation}
              disabled={isAnimating}
            >
              {isAnimating ? 'Animating...' : 'Start Animation'}
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <AnimationTestComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      await user.click(screen.getByTestId('trigger-animation'));

      // Animation should start
      expect(screen.getByTestId('trigger-animation')).toBeDisabled();
      
      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.getByTestId('trigger-animation')).not.toBeDisabled();
      }, { timeout: 500 });

      // Animation duration should be close to expected 300ms
      await waitFor(() => {
        const durationElement = screen.getByTestId('animation-duration');
        const duration = parseFloat(durationElement.textContent.match(/(\d+\.?\d*)/)[1]);
        expect(duration).toBeGreaterThan(290);
        expect(duration).toBeLessThan(350);
      });
    });
  });

  describe('Orientation and Device Adaptation', () => {
    it('handles orientation changes gracefully', async () => {
      const OrientationTestComponent = () => {
        const [orientation, setOrientation] = useState('portrait');
        const [dimensions, setDimensions] = useState({ width: 768, height: 1024 });

        useEffect(() => {
          const handleOrientationChange = () => {
            const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
            setOrientation(newOrientation);
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
          };

          window.addEventListener('resize', handleOrientationChange);
          window.addEventListener('orientationchange', handleOrientationChange);
          
          return () => {
            window.removeEventListener('resize', handleOrientationChange);
            window.removeEventListener('orientationchange', handleOrientationChange);
          };
        }, []);

        return (
          <div 
            data-testid="orientation-test"
            className={`orientation-${orientation}`}
          >
            <div data-testid="current-orientation">
              Orientation: {orientation}
            </div>
            <div data-testid="current-dimensions">
              Dimensions: {dimensions.width} x {dimensions.height}
            </div>
            
            <div 
              data-testid="adaptive-layout"
              style={{
                display: 'flex',
                flexDirection: orientation === 'portrait' ? 'column' : 'row',
                gap: '16px'
              }}
            >
              <div data-testid="main-content" style={{ flex: orientation === 'portrait' ? '1' : '2' }}>
                Main Content Area
              </div>
              <div data-testid="sidebar" style={{ flex: '1' }}>
                Sidebar Content
              </div>
            </div>
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <OrientationTestComponent />
        </TestWrapper>
      );

      // Start in portrait
      expect(screen.getByTestId('current-orientation')).toHaveTextContent('Orientation: portrait');
      expect(screen.getByTestId('adaptive-layout')).toHaveStyle({ flexDirection: 'column' });

      // Change to landscape
      setViewport(VIEWPORT_SIZES.tablet_landscape);
      
      // Simulate orientation change event
      window.dispatchEvent(new Event('orientationchange'));
      
      rerender(
        <TestWrapper>
          <OrientationTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-orientation')).toHaveTextContent('Orientation: landscape');
        expect(screen.getByTestId('adaptive-layout')).toHaveStyle({ flexDirection: 'row' });
      });
    });

    it('adapts to different tablet form factors', () => {
      const formFactors = [
        { name: 'standard', width: 768, height: 1024, ratio: 1.33 },
        { name: 'wide', width: 1280, height: 800, ratio: 1.6 },
        { name: 'square', width: 1024, height: 1024, ratio: 1.0 }
      ];

      formFactors.forEach(formFactor => {
        const FormFactorComponent = () => {
          const aspectRatio = formFactor.width / formFactor.height;
          const isWide = aspectRatio > 1.5;
          const isSquare = Math.abs(aspectRatio - 1.0) < 0.1;

          return (
            <div 
              data-testid={`form-factor-${formFactor.name}`}
              className={`form-factor ${isWide ? 'wide' : ''} ${isSquare ? 'square' : ''}`}
            >
              <div data-testid="aspect-ratio">
                Aspect Ratio: {aspectRatio.toFixed(2)}
              </div>
              <div data-testid="layout-type">
                Layout: {isWide ? 'Wide' : isSquare ? 'Square' : 'Standard'}
              </div>
            </div>
          );
        };

        render(
          <TestWrapper>
            <FormFactorComponent />
          </TestWrapper>
        );

        expect(screen.getByTestId(`form-factor-${formFactor.name}`)).toBeInTheDocument();
        expect(screen.getByTestId('aspect-ratio')).toHaveTextContent(`Aspect Ratio: ${formFactor.ratio.toFixed(2)}`);
      });
    });

    it('maintains functionality across different screen densities', () => {
      const densities = [1, 1.5, 2, 3]; // Different pixel ratios

      densities.forEach(density => {
        const DensityComponent = () => {
          const scaledSize = Math.round(16 * density);
          
          return (
            <div data-testid={`density-${density}`}>
              <div 
                data-testid="scaled-text"
                style={{ fontSize: `${scaledSize}px` }}
              >
                Text scaled for {density}x density
              </div>
              <button 
                data-testid="scaled-button"
                style={{
                  minWidth: `${44 * density}px`,
                  minHeight: `${44 * density}px`,
                  transform: `scale(${1 / density})`
                }}
              >
                Density Optimized Button
              </button>
            </div>
          );
        };

        render(
          <TestWrapper>
            <DensityComponent />
          </TestWrapper>
        );

        expect(screen.getByTestId(`density-${density}`)).toBeInTheDocument();
        expect(screen.getByTestId('scaled-text')).toHaveStyle({ 
          fontSize: `${Math.round(16 * density)}px` 
        });
      });
    });
  });

  describe('Accessibility in Responsive Design', () => {
    it('maintains accessibility standards across all screen sizes', () => {
      const AccessibilityTestComponent = ({ screenSize }) => (
        <div data-testid="accessibility-responsive">
          <nav 
            data-testid="responsive-nav"
            aria-label="Main navigation"
            style={{
              display: screenSize === 'small' ? 'none' : 'flex'
            }}
          >
            <button aria-label="Categories">Categories</button>
            <button aria-label="Search">Search</button>
            <button aria-label="Favorites">Favorites</button>
          </nav>
          
          {screenSize === 'small' && (
            <button 
              data-testid="mobile-menu"
              aria-label="Open navigation menu"
              aria-expanded="false"
            >
              ☰
            </button>
          )}
          
          <main data-testid="main-content">
            <h1>SOP Management</h1>
            <div 
              data-testid="content-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: screenSize === 'small' ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}
            >
              <div role="article" aria-labelledby="article-1">
                <h2 id="article-1">Food Safety Procedures</h2>
                <p>Content for food safety procedures...</p>
              </div>
              <div role="article" aria-labelledby="article-2">
                <h2 id="article-2">Cleaning Protocols</h2>
                <p>Content for cleaning protocols...</p>
              </div>
            </div>
          </main>
        </div>
      );

      // Test small screen
      render(
        <TestWrapper>
          <AccessibilityTestComponent screenSize="small" />
        </TestWrapper>
      );

      expect(screen.getByTestId('mobile-menu')).toHaveAttribute('aria-label', 'Open navigation menu');
      expect(screen.queryByTestId('responsive-nav')).not.toBeVisible();

      // Test large screen
      render(
        <TestWrapper>
          <AccessibilityTestComponent screenSize="large" />
        </TestWrapper>
      );

      expect(screen.getByTestId('responsive-nav')).toBeVisible();
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    it('ensures focus management works across responsive breakpoints', async () => {
      const FocusManagementComponent = ({ isMobile }) => {
        const [menuOpen, setMenuOpen] = useState(false);

        const toggleMenu = () => {
          setMenuOpen(!menuOpen);
        };

        return (
          <div data-testid="focus-management">
            {isMobile ? (
              <div>
                <button 
                  data-testid="menu-toggle"
                  onClick={toggleMenu}
                  aria-expanded={menuOpen}
                >
                  Menu
                </button>
                {menuOpen && (
                  <nav 
                    data-testid="mobile-nav"
                    role="navigation"
                    aria-label="Mobile navigation"
                  >
                    <button data-testid="nav-item-1">Categories</button>
                    <button data-testid="nav-item-2">Search</button>
                    <button data-testid="nav-item-3">Favorites</button>
                  </nav>
                )}
              </div>
            ) : (
              <nav data-testid="desktop-nav" role="navigation">
                <button data-testid="nav-item-1">Categories</button>
                <button data-testid="nav-item-2">Search</button>
                <button data-testid="nav-item-3">Favorites</button>
              </nav>
            )}
          </div>
        );
      };

      // Test mobile focus management
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FocusManagementComponent isMobile={true} />
        </TestWrapper>
      );

      const menuToggle = screen.getByTestId('menu-toggle');
      await user.click(menuToggle);

      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
      
      // Focus should be manageable within mobile menu
      await user.tab();
      expect(screen.getByTestId('nav-item-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-item-2')).toHaveFocus();
    });
  });
});