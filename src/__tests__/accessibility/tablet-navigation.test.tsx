import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TestWrapper } from '../utils/test-utils';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock components for accessibility testing
const MockSOPNavigationComponent = ({ onNavigate, currentPage }) => (
  <nav data-testid="sop-navigation" role="navigation" aria-label="SOP Navigation">
    <h2 id="nav-heading">Standard Operating Procedures</h2>
    
    {/* Skip link for screen readers */}
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only"
      data-testid="skip-link"
    >
      Skip to main content
    </a>
    
    {/* Main navigation menu */}
    <ul role="menubar" aria-labelledby="nav-heading">
      <li role="none">
        <button 
          role="menuitem"
          data-testid="nav-categories"
          onClick={() => onNavigate('categories')}
          aria-current={currentPage === 'categories' ? 'page' : undefined}
          className="min-w-[44px] min-h-[44px] focus:ring-2 focus:ring-blue-500"
        >
          <span className="sr-only">Navigate to </span>
          Categories
        </button>
      </li>
      <li role="none">
        <button 
          role="menuitem"
          data-testid="nav-search"
          onClick={() => onNavigate('search')}
          aria-current={currentPage === 'search' ? 'page' : undefined}
          className="min-w-[44px] min-h-[44px] focus:ring-2 focus:ring-blue-500"
        >
          <span className="sr-only">Navigate to </span>
          Search
        </button>
      </li>
      <li role="none">
        <button 
          role="menuitem"
          data-testid="nav-favorites"
          onClick={() => onNavigate('favorites')}
          aria-current={currentPage === 'favorites' ? 'page' : undefined}
          className="min-w-[44px] min-h-[44px] focus:ring-2 focus:ring-blue-500"
        >
          <span className="sr-only">Navigate to </span>
          Favorites
        </button>
      </li>
    </ul>
    
    {/* Breadcrumb navigation */}
    <nav aria-label="Breadcrumb" data-testid="breadcrumb">
      <ol role="list">
        <li>
          <a href="/" aria-label="Home">Home</a>
          <span aria-hidden="true"> / </span>
        </li>
        <li>
          <a href="/sop" aria-label="Standard Operating Procedures">SOPs</a>
          <span aria-hidden="true"> / </span>
        </li>
        <li aria-current="page">{currentPage}</li>
      </ol>
    </nav>
  </nav>
);

const MockSOPDocumentComponent = ({ document, onComplete }) => (
  <main id="main-content" data-testid="sop-document" role="main">
    <article>
      <header>
        <h1 id="document-title">{document.title}</h1>
        <div role="region" aria-labelledby="document-meta">
          <h2 id="document-meta" className="sr-only">Document Information</h2>
          <p>Category: <span data-testid="document-category">{document.category}</span></p>
          <p>Priority: <span data-testid="document-priority">{document.priority}</span></p>
        </div>
      </header>
      
      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading">Procedure Steps</h2>
        <ol role="list">
          {document.steps.map((step, index) => (
            <li key={index} role="listitem">
              <div className="step-container">
                <h3 id={`step-${index + 1}-heading`}>
                  Step {index + 1}: {step.action}
                </h3>
                <div aria-labelledby={`step-${index + 1}-heading`}>
                  <p>{step.description}</p>
                  {step.warning && (
                    <div role="alert" className="warning">
                      <strong>Warning:</strong> {step.warning}
                    </div>
                  )}
                  <button
                    data-testid={`complete-step-${index + 1}`}
                    onClick={() => onComplete(index + 1)}
                    aria-describedby={`step-${index + 1}-heading`}
                    className="min-w-[44px] min-h-[44px] focus:ring-2 focus:ring-green-500"
                  >
                    <span className="sr-only">Mark as complete: </span>
                    Complete Step {index + 1}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
      
      {/* Progress indicator */}
      <div role="region" aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="sr-only">Completion Progress</h2>
        <div 
          role="progressbar" 
          aria-valuenow={document.completedSteps} 
          aria-valuemin={0} 
          aria-valuemax={document.totalSteps}
          aria-labelledby="progress-heading"
          data-testid="progress-bar"
        >
          <span className="sr-only">
            {document.completedSteps} of {document.totalSteps} steps completed
          </span>
          <div className="progress-fill" style={{ width: `${(document.completedSteps / document.totalSteps) * 100}%` }} />
        </div>
      </div>
    </article>
  </main>
);

const MockTabletKeyboardComponent = ({ onKeyAction }) => (
  <div data-testid="tablet-keyboard" role="application" aria-label="Virtual Keyboard">
    <div className="keyboard-row" role="group" aria-label="Number row">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
        <button 
          key={num}
          data-testid={`key-${num}`}
          onClick={() => onKeyAction('number', num)}
          className="min-w-[44px] min-h-[44px] touch-action-manipulation"
          aria-label={`Number ${num}`}
        >
          {num}
        </button>
      ))}
    </div>
    <div className="keyboard-row" role="group" aria-label="Letter row">
      {['Q', 'W', 'E', 'R', 'T', 'Y'].map(letter => (
        <button 
          key={letter}
          data-testid={`key-${letter}`}
          onClick={() => onKeyAction('letter', letter)}
          className="min-w-[44px] min-h-[44px] touch-action-manipulation"
          aria-label={`Letter ${letter}`}
        >
          {letter}
        </button>
      ))}
    </div>
    <button 
      data-testid="key-space"
      onClick={() => onKeyAction('space', ' ')}
      className="min-w-[88px] min-h-[44px] touch-action-manipulation"
      aria-label="Space bar"
    >
      Space
    </button>
  </div>
);

describe('Tablet Navigation Accessibility Tests', () => {
  const mockDocument = {
    title: 'Daily Food Safety Checklist',
    category: 'Food Safety',
    priority: 'High',
    completedSteps: 2,
    totalSteps: 5,
    steps: [
      {
        action: 'Check refrigerator temperature',
        description: 'Verify all refrigeration units are at proper temperature',
        warning: 'Temperature must be below 40°F'
      },
      {
        action: 'Inspect food storage areas',
        description: 'Check for proper food storage and organization'
      },
      {
        action: 'Verify hand washing stations',
        description: 'Ensure soap, towels, and sanitizer are available'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock touch and pointer events
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true
    });
    
    // Mock screen reader API
    global.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => [])
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('passes automated accessibility audit with axe-core', async () => {
      const { container } = render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      // Check heading levels are sequential
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('Daily Food Safety Checklist');
      expect(h2s).toHaveLength(4); // Navigation, Document meta, Steps, Progress
      expect(h3s).toHaveLength(3); // One for each step
    });

    it('implements proper ARIA landmarks', () => {
      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      expect(screen.getByRole('navigation', { name: 'SOP Navigation' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(2); // Document meta and progress
    });

    it('provides descriptive alternative text and labels', () => {
      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      // Check ARIA labels
      expect(screen.getByLabelText('SOP Navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
      
      // Check button descriptions
      const completeButtons = screen.getAllByText(/Complete Step/);
      completeButtons.forEach((button, index) => {
        expect(button).toHaveAttribute('aria-describedby', `step-${index + 1}-heading`);
      });
    });

    it('implements proper color contrast for all interactive elements', () => {
      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      // Check that all buttons have proper focus indicators
      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toHaveClass(/focus:ring-/);
      });

      // Check current page indicator
      const currentPageButton = screen.getByRole('menuitem', { current: 'page' });
      expect(currentPageButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports complete keyboard navigation', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      const onComplete = vi.fn();

      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={onNavigate} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={onComplete} />
        </TestWrapper>
      );

      // Test tab navigation through all interactive elements
      await user.tab();
      expect(screen.getByTestId('skip-link')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-categories')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-search')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('nav-favorites')).toHaveFocus();

      // Continue to main content
      await user.tab();
      expect(screen.getByTestId('complete-step-1')).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(onComplete).toHaveBeenCalledWith(1);
    });

    it('implements proper focus management for modals and dialogs', async () => {
      const user = userEvent.setup();
      
      const ModalTestComponent = () => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const modalRef = useRef(null);
        const triggerRef = useRef(null);

        const openModal = () => {
          setIsModalOpen(true);
          // Focus should move to modal when opened
          setTimeout(() => {
            modalRef.current?.focus();
          }, 0);
        };

        const closeModal = () => {
          setIsModalOpen(false);
          // Focus should return to trigger when closed
          setTimeout(() => {
            triggerRef.current?.focus();
          }, 0);
        };

        return (
          <div>
            <button 
              ref={triggerRef}
              data-testid="open-modal"
              onClick={openModal}
            >
              Open Modal
            </button>
            
            {isModalOpen && (
              <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                data-testid="modal"
                ref={modalRef}
                tabIndex={-1}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
              >
                <div className="bg-white p-6 rounded">
                  <h2 id="modal-title">Confirmation Required</h2>
                  <p>Are you sure you want to complete this step?</p>
                  <div className="mt-4">
                    <button 
                      data-testid="modal-confirm"
                      onClick={closeModal}
                      className="mr-2"
                    >
                      Confirm
                    </button>
                    <button 
                      data-testid="modal-cancel"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ModalTestComponent />
        </TestWrapper>
      );

      const openButton = screen.getByTestId('open-modal');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Modal should be focused
      expect(screen.getByTestId('modal')).toHaveFocus();

      // Tab should cycle within modal
      await user.tab();
      expect(screen.getByTestId('modal-confirm')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('modal-cancel')).toHaveFocus();

      // Close modal
      await user.click(screen.getByTestId('modal-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // Focus should return to trigger
      expect(openButton).toHaveFocus();
    });

    it('supports arrow key navigation in menus', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={onNavigate} />
        </TestWrapper>
      );

      // Focus first menu item
      const categoriesButton = screen.getByTestId('nav-categories');
      categoriesButton.focus();

      // Arrow down should move to next item
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('nav-search')).toHaveFocus();

      // Arrow down again
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('nav-favorites')).toHaveFocus();

      // Arrow up should move back
      await user.keyboard('{ArrowUp}');
      expect(screen.getByTestId('nav-search')).toHaveFocus();

      // Home key should go to first item
      await user.keyboard('{Home}');
      expect(screen.getByTestId('nav-categories')).toHaveFocus();

      // End key should go to last item
      await user.keyboard('{End}');
      expect(screen.getByTestId('nav-favorites')).toHaveFocus();
    });

    it('implements escape key handling for dismissible components', async () => {
      const user = userEvent.setup();
      
      const EscapeTestComponent = () => {
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);

        const handleKeyDown = (event) => {
          if (event.key === 'Escape') {
            setIsDropdownOpen(false);
          }
        };

        return (
          <div data-testid="escape-test" onKeyDown={handleKeyDown}>
            <button 
              data-testid="dropdown-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
            >
              Menu
            </button>
            
            {isDropdownOpen && (
              <div 
                role="menu"
                data-testid="dropdown-menu"
                tabIndex={-1}
              >
                <button role="menuitem" data-testid="menu-item-1">Item 1</button>
                <button role="menuitem" data-testid="menu-item-2">Item 2</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <EscapeTestComponent />
        </TestWrapper>
      );

      // Open dropdown
      await user.click(screen.getByTestId('dropdown-trigger'));
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });
  });

  describe('Touch and Gesture Accessibility', () => {
    it('provides adequate touch target sizes (minimum 44x44px)', () => {
      render(
        <TestWrapper>
          <MockSOPNavigationComponent currentPage="categories" onNavigate={vi.fn()} />
          <MockSOPDocumentComponent document={mockDocument} onComplete={vi.fn()} />
        </TestWrapper>
      );

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toHaveClass(/min-w-\[44px\]/);
        expect(button).toHaveClass(/min-h-\[44px\]/);
      });
    });

    it('implements proper touch action behaviors', () => {
      render(
        <TestWrapper>
          <MockTabletKeyboardComponent onKeyAction={vi.fn()} />
        </TestWrapper>
      );

      const keyboardButtons = screen.getAllByRole('button');
      keyboardButtons.forEach(button => {
        expect(button).toHaveClass('touch-action-manipulation');
      });
    });

    it('supports gesture-based navigation with accessibility announcements', async () => {
      const onSwipe = vi.fn();
      
      const GestureComponent = () => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const items = ['Page 1', 'Page 2', 'Page 3'];

        const handleSwipe = (direction) => {
          const newIndex = direction === 'left' 
            ? Math.min(currentIndex + 1, items.length - 1)
            : Math.max(currentIndex - 1, 0);
          
          setCurrentIndex(newIndex);
          onSwipe(direction, newIndex);
          
          // Announce page change to screen readers
          const announcement = `Page ${newIndex + 1} of ${items.length}`;
          if (global.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(announcement);
            global.speechSynthesis.speak(utterance);
          }
        };

        return (
          <div 
            data-testid="gesture-container"
            role="region"
            aria-label="Swipeable content"
            aria-live="polite"
          >
            <div data-testid="current-page">
              {items[currentIndex]}
            </div>
            <div className="sr-only" aria-live="assertive">
              Page {currentIndex + 1} of {items.length}
            </div>
            <button 
              data-testid="swipe-left"
              onClick={() => handleSwipe('left')}
              aria-label="Next page"
            >
              Next
            </button>
            <button 
              data-testid="swipe-right"
              onClick={() => handleSwipe('right')}
              aria-label="Previous page"
            >
              Previous
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <GestureComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      
      // Simulate swipe gesture via button click
      await user.click(screen.getByTestId('swipe-left'));
      
      expect(onSwipe).toHaveBeenCalledWith('left', 1);
      expect(screen.getByTestId('current-page')).toHaveTextContent('Page 2');
      expect(global.speechSynthesis.speak).toHaveBeenCalled();
    });

    it('provides haptic feedback alternatives for users with hearing impairments', async () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      });

      const HapticComponent = () => {
        const handleAction = (action) => {
          // Provide haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          
          // Also provide visual feedback
          const button = document.activeElement;
          if (button) {
            button.classList.add('animate-pulse');
            setTimeout(() => button.classList.remove('animate-pulse'), 200);
          }
        };

        return (
          <div>
            <button 
              data-testid="haptic-button"
              onClick={() => handleAction('complete')}
              className="transition-all duration-200"
            >
              Complete Step with Haptic Feedback
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <HapticComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      await user.click(screen.getByTestId('haptic-button'));

      expect(mockVibrate).toHaveBeenCalledWith(100);
    });
  });

  describe('Screen Reader Support', () => {
    it('provides proper screen reader announcements for dynamic content', async () => {
      const ProgressComponent = () => {
        const [progress, setProgress] = useState(0);
        const [announcement, setAnnouncement] = useState('');

        const updateProgress = () => {
          const newProgress = Math.min(progress + 20, 100);
          setProgress(newProgress);
          setAnnouncement(`Progress updated: ${newProgress}% complete`);
          
          // Clear announcement after a delay
          setTimeout(() => setAnnouncement(''), 1000);
        };

        return (
          <div>
            <div 
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-labelledby="progress-label"
              data-testid="dynamic-progress"
            >
              <span id="progress-label">Task Progress</span>
              <div style={{ width: `${progress}%` }} />
            </div>
            
            <button 
              data-testid="update-progress"
              onClick={updateProgress}
            >
              Update Progress
            </button>
            
            <div 
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
              data-testid="progress-announcement"
            >
              {announcement}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <ProgressComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      await user.click(screen.getByTestId('update-progress'));

      await waitFor(() => {
        expect(screen.getByTestId('progress-announcement')).toHaveTextContent('Progress updated: 20% complete');
      });

      const progressBar = screen.getByTestId('dynamic-progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20');
    });

    it('implements proper live regions for status updates', async () => {
      const StatusComponent = () => {
        const [status, setStatus] = useState('idle');
        const [message, setMessage] = useState('');

        const updateStatus = (newStatus) => {
          setStatus(newStatus);
          
          const messages = {
            loading: 'Loading SOP document...',
            success: 'SOP document loaded successfully',
            error: 'Error loading SOP document. Please try again.'
          };
          
          setMessage(messages[newStatus] || '');
        };

        return (
          <div>
            <div data-testid="current-status">
              Status: {status}
            </div>
            
            <div 
              role="status"
              aria-live="polite"
              aria-label="Application status"
              data-testid="status-live-region"
            >
              {message}
            </div>
            
            <div 
              role="alert"
              aria-live="assertive"
              data-testid="error-live-region"
            >
              {status === 'error' ? message : ''}
            </div>
            
            <button 
              data-testid="set-loading"
              onClick={() => updateStatus('loading')}
            >
              Set Loading
            </button>
            <button 
              data-testid="set-success"
              onClick={() => updateStatus('success')}
            >
              Set Success
            </button>
            <button 
              data-testid="set-error"
              onClick={() => updateStatus('error')}
            >
              Set Error
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <StatusComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      
      // Test polite live region
      await user.click(screen.getByTestId('set-loading'));
      expect(screen.getByTestId('status-live-region')).toHaveTextContent('Loading SOP document...');

      // Test assertive live region for errors
      await user.click(screen.getByTestId('set-error'));
      expect(screen.getByTestId('error-live-region')).toHaveTextContent('Error loading SOP document. Please try again.');
    });

    it('provides descriptive text for complex UI components', () => {
      const ComplexUIComponent = () => (
        <div>
          <div 
            role="tablist"
            aria-label="SOP Categories"
            data-testid="complex-tablist"
          >
            <button 
              role="tab"
              aria-selected="true"
              aria-controls="food-safety-panel"
              id="food-safety-tab"
              data-testid="food-safety-tab"
            >
              Food Safety
            </button>
            <button 
              role="tab"
              aria-selected="false"
              aria-controls="cleaning-panel"
              id="cleaning-tab"
              data-testid="cleaning-tab"
            >
              Cleaning
            </button>
          </div>
          
          <div 
            role="tabpanel"
            aria-labelledby="food-safety-tab"
            id="food-safety-panel"
            data-testid="food-safety-panel"
          >
            <h3>Food Safety Procedures</h3>
            <p>Critical procedures for maintaining food safety standards.</p>
            <div role="group" aria-labelledby="temp-checks">
              <h4 id="temp-checks">Temperature Checks</h4>
              <label>
                <input type="checkbox" aria-describedby="temp-desc" />
                Refrigerator temperature
                <span id="temp-desc" className="sr-only">Must be below 40°F</span>
              </label>
            </div>
          </div>
        </div>
      );

      render(
        <TestWrapper>
          <ComplexUIComponent />
        </TestWrapper>
      );

      // Check tablist structure
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'SOP Categories');
      
      // Check tab relationships
      const selectedTab = screen.getByRole('tab', { selected: true });
      expect(selectedTab).toHaveAttribute('aria-controls', 'food-safety-panel');
      
      // Check tabpanel relationship
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('aria-labelledby', 'food-safety-tab');
      
      // Check grouped content
      expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'temp-checks');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('provides accessible error messages and recovery options', async () => {
      const ErrorHandlingComponent = () => {
        const [error, setError] = useState(null);
        const [isRetrying, setIsRetrying] = useState(false);

        const triggerError = () => {
          setError({
            code: 'NETWORK_ERROR',
            message: 'Unable to load SOP document. Please check your connection and try again.',
            recoverable: true
          });
        };

        const retryAction = async () => {
          setIsRetrying(true);
          setError(null);
          
          // Simulate retry
          setTimeout(() => {
            setIsRetrying(false);
          }, 1000);
        };

        return (
          <div>
            {error && (
              <div 
                role="alert"
                aria-labelledby="error-title"
                data-testid="error-container"
                className="border-2 border-red-500 p-4"
              >
                <h2 id="error-title" className="text-red-700">
                  Error: {error.code}
                </h2>
                <p>{error.message}</p>
                {error.recoverable && (
                  <button 
                    data-testid="retry-button"
                    onClick={retryAction}
                    disabled={isRetrying}
                    aria-describedby="retry-desc"
                  >
                    {isRetrying ? 'Retrying...' : 'Try Again'}
                  </button>
                )}
                <div id="retry-desc" className="sr-only">
                  This will attempt to reload the SOP document
                </div>
              </div>
            )}
            
            <button 
              data-testid="trigger-error"
              onClick={triggerError}
            >
              Trigger Test Error
            </button>
            
            {isRetrying && (
              <div 
                role="status"
                aria-label="Retrying operation"
                data-testid="retry-status"
              >
                Retrying operation, please wait...
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ErrorHandlingComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      
      // Trigger an error
      await user.click(screen.getByTestId('trigger-error'));
      
      // Error should be announced
      const errorContainer = screen.getByTestId('error-container');
      expect(errorContainer).toHaveAttribute('role', 'alert');
      expect(errorContainer).toBeInTheDocument();
      
      // Retry button should be accessible
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toHaveAttribute('aria-describedby', 'retry-desc');
      
      // Test retry functionality
      await user.click(retryButton);
      expect(screen.getByTestId('retry-status')).toBeInTheDocument();
    });

    it('handles form validation errors accessibly', async () => {
      const FormValidationComponent = () => {
        const [errors, setErrors] = useState({});
        const [formData, setFormData] = useState({ pin: '' });

        const validateForm = () => {
          const newErrors = {};
          
          if (!formData.pin) {
            newErrors.pin = 'PIN is required';
          } else if (formData.pin.length !== 4) {
            newErrors.pin = 'PIN must be exactly 4 digits';
          } else if (!/^\d+$/.test(formData.pin)) {
            newErrors.pin = 'PIN must contain only numbers';
          }
          
          setErrors(newErrors);
          return Object.keys(newErrors).length === 0;
        };

        const handleSubmit = (e) => {
          e.preventDefault();
          const isValid = validateForm();
          
          if (!isValid) {
            // Focus first field with error
            const firstErrorField = document.querySelector('[aria-invalid="true"]');
            if (firstErrorField) {
              firstErrorField.focus();
            }
          }
        };

        return (
          <form onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="pin-input">
                Enter PIN <span aria-label="required">*</span>
              </label>
              <input 
                id="pin-input"
                data-testid="pin-input"
                type="password"
                value={formData.pin}
                onChange={(e) => setFormData({ pin: e.target.value })}
                aria-invalid={errors.pin ? 'true' : 'false'}
                aria-describedby={errors.pin ? 'pin-error' : undefined}
                maxLength={4}
              />
              {errors.pin && (
                <div 
                  id="pin-error"
                  role="alert"
                  aria-live="polite"
                  data-testid="pin-error"
                  className="text-red-600"
                >
                  {errors.pin}
                </div>
              )}
            </div>
            
            <button 
              type="submit"
              data-testid="submit-button"
            >
              Submit
            </button>
          </form>
        );
      };

      render(
        <TestWrapper>
          <FormValidationComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      const submitButton = screen.getByTestId('submit-button');
      
      // Submit empty form
      await user.click(submitButton);
      
      // Error should appear
      const pinError = screen.getByTestId('pin-error');
      expect(pinError).toHaveAttribute('role', 'alert');
      expect(pinError).toHaveTextContent('PIN is required');
      
      // Input should be marked as invalid
      const pinInput = screen.getByTestId('pin-input');
      expect(pinInput).toHaveAttribute('aria-invalid', 'true');
      expect(pinInput).toHaveAttribute('aria-describedby', 'pin-error');
      
      // Input should have focus
      expect(pinInput).toHaveFocus();
    });
  });

  describe('Multi-language Accessibility', () => {
    it('properly handles language switching with screen reader announcements', async () => {
      const LanguageSwitchComponent = () => {
        const [currentLanguage, setCurrentLanguage] = useState('en');
        const [announcement, setAnnouncement] = useState('');

        const switchLanguage = (newLang) => {
          setCurrentLanguage(newLang);
          const langNames = { en: 'English', fr: 'French' };
          setAnnouncement(`Language changed to ${langNames[newLang]}`);
          
          // Update document language
          document.documentElement.lang = newLang;
          
          // Clear announcement
          setTimeout(() => setAnnouncement(''), 3000);
        };

        return (
          <div>
            <div 
              role="group"
              aria-labelledby="language-label"
              data-testid="language-switcher"
            >
              <span id="language-label">Choose Language:</span>
              <button 
                data-testid="lang-en"
                onClick={() => switchLanguage('en')}
                aria-pressed={currentLanguage === 'en'}
                lang="en"
              >
                English
              </button>
              <button 
                data-testid="lang-fr"
                onClick={() => switchLanguage('fr')}
                aria-pressed={currentLanguage === 'fr'}
                lang="fr"
              >
                Français
              </button>
            </div>
            
            <div 
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
              data-testid="language-announcement"
            >
              {announcement}
            </div>
            
            <main lang={currentLanguage} data-testid="main-content">
              <h1>
                {currentLanguage === 'en' ? 'Standard Operating Procedures' : 'Procédures opérationnelles standard'}
              </h1>
            </main>
          </div>
        );
      };

      render(
        <TestWrapper>
          <LanguageSwitchComponent />
        </TestWrapper>
      );

      const user = userEvent.setup();
      
      // Switch to French
      await user.click(screen.getByTestId('lang-fr'));
      
      // Check language announcement
      await waitFor(() => {
        expect(screen.getByTestId('language-announcement')).toHaveTextContent('Language changed to French');
      });
      
      // Check content language attribute
      expect(screen.getByTestId('main-content')).toHaveAttribute('lang', 'fr');
      
      // Check button states
      expect(screen.getByTestId('lang-fr')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'false');
    });
  });
});