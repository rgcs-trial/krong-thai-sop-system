import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SOPDocumentViewer } from '@/components/sop/sop-document-viewer';
import { TestWrapper } from '@/src/__tests__/utils/test-utils';

// Mock the hooks and utilities
vi.mock('@/lib/hooks/use-sop-queries', () => ({
  useSOPDocument: vi.fn()
}));

vi.mock('@/hooks/use-favorites', () => ({
  useFavorites: vi.fn()
}));

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}));

// Import mocked hooks
import { useSOPDocument } from '@/lib/hooks/use-sop-queries';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from '@/hooks/use-toast';

const mockUseSOPDocument = useSOPDocument as any;
const mockUseFavorites = useFavorites as any;
const mockUseAuthStore = useAuthStore as any;
const mockToast = toast as any;

describe('SOPDocumentViewer - Enhanced Features', () => {
  const defaultProps = {
    locale: 'en',
    documentId: 'test-doc-id',
    categoryId: 'test-category-id',
    onBack: vi.fn(),
    onNavigate: vi.fn(),
    canNavigate: { prev: true, next: true }
  };

  const mockDocument = {
    id: 'test-doc-id',
    category_id: 'test-category-id',
    restaurant_id: 'test-restaurant-id',
    title: 'Test SOP Document',
    title_fr: 'Document SOP Test',
    content: 'This is a test SOP document content.',
    content_fr: 'Ceci est un contenu de document SOP de test.',
    steps: [
      {
        step: 1,
        action: 'First step action',
        note: 'First step note',
        duration: '5 minutes',
        warning: 'Be careful with this step',
        tools: ['Tool 1', 'Tool 2'],
        image: '/test-image.jpg',
        required_photo: true,
        required_signature: false
      },
      {
        step: 2,
        action: 'Second step action',
        note: 'Second step note',
        required_photo: false,
        required_signature: true
      },
      {
        step: 3,
        action: 'Third step action',
        note: 'Third step note',
        required_photo: true,
        required_signature: true
      }
    ],
    attachments: [
      {
        id: 'attachment-1',
        name: 'test-file.pdf',
        size: 1024000
      }
    ],
    tags: ['tag1', 'tag2'],
    tags_fr: ['tag1 Fr', 'tag2 Fr'],
    version: 1,
    status: 'approved' as const,
    priority: 'high' as const,
    security_level: 'standard' as const,
    requires_pin_verification: false,
    effective_date: '2024-01-01',
    review_date: '2024-12-31',
    created_by: 'user-1',
    updated_by: 'user-2',
    approved_by: 'manager-1',
    approved_at: '2024-01-01T10:00:00Z',
    is_active: true,
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    category: {
      id: 'test-category-id',
      name: 'Test Category',
      name_fr: 'Catégorie Test'
    },
    creator: {
      id: 'user-1',
      full_name: 'John Doe',
      full_name_fr: 'Jean Dupont'
    },
    approver: {
      id: 'manager-1',
      full_name: 'Manager Smith',
      full_name_fr: 'Gestionnaire Dupuis'
    }
  };

  const mockUser = {
    id: 'current-user-id',
    email: 'test@example.com',
    role: 'staff'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseSOPDocument.mockReturnValue({
      data: mockDocument,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    mockUseFavorites.mockReturnValue({
      isFavorite: false,
      toggleFavorite: vi.fn(),
      isLoading: false
    });

    mockUseAuthStore.mockReturnValue(mockUser);
    mockToast.mockImplementation(() => {});

    // Mock APIs
    global.fetch = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      },
      share: vi.fn(() => Promise.resolve()),
      onLine: true,
      vibrate: vi.fn()
    });

    Object.defineProperty(window, 'print', {
      value: vi.fn(),
      writable: true
    });

    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Task Management Integration', () => {
    it('creates related tasks when SOP requires follow-up', async () => {
      const user = userEvent.setup();
      
      // Mock task creation API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'task-123',
          title: 'Follow-up task',
          status: 'pending'
        })
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const createTaskButton = screen.getByRole('button', { name: /sop.createTask/i });
      await user.click(createTaskButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Follow-up: Test SOP Document',
            sop_document_id: 'test-doc-id',
            priority: 'high',
            type: 'sop_follow_up'
          })
        });
      });
    });

    it('displays linked tasks for SOP document', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Daily equipment check',
          status: 'pending',
          priority: 'high',
          assigned_to: 'staff-1'
        },
        {
          id: 'task-2', 
          title: 'Weekly deep clean',
          status: 'completed',
          priority: 'medium',
          assigned_to: 'staff-2'
        }
      ];

      // Mock the API to return linked tasks
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockTasks })
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Daily equipment check')).toBeInTheDocument();
        expect(screen.getByText('Weekly deep clean')).toBeInTheDocument();
      });
    });

    it('updates task status when SOP is completed', async () => {
      const user = userEvent.setup();
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const completeButton = screen.getByRole('button', { name: /sop.markComplete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/tasks/update-from-sop',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              sop_document_id: 'test-doc-id',
              completed_at: expect.any(String)
            })
          })
        );
      });
    });
  });

  describe('Enhanced Security Features', () => {
    it('validates user permissions for sensitive SOPs', async () => {
      const sensitiveDocument = {
        ...mockDocument,
        security_level: 'restricted',
        required_role: 'manager'
      };

      mockUseSOPDocument.mockReturnValue({
        data: sensitiveDocument,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      // Mock staff user without manager role
      mockUseAuthStore.mockReturnValue({
        ...mockUser,
        role: 'staff'
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('sop.accessRestricted')).toBeInTheDocument();
      expect(screen.queryByText('Test SOP Document')).not.toBeInTheDocument();
    });

    it('logs access attempts for audit trail', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/security/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sop_document_viewed',
            document_id: 'test-doc-id',
            user_id: 'current-user-id',
            timestamp: expect.any(String)
          })
        });
      });
    });

    it('enforces PIN re-verification for critical SOPs', async () => {
      const user = userEvent.setup();
      const criticalDocument = {
        ...mockDocument,
        requires_pin_verification: true,
        security_level: 'critical'
      };

      mockUseSOPDocument.mockReturnValue({
        data: criticalDocument,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const accessButton = screen.getByRole('button', { name: /sop.verifyAccess/i });
      await user.click(accessButton);

      expect(screen.getByText('auth.pinVerification')).toBeInTheDocument();
      expect(screen.getByLabelText('auth.enterPin')).toBeInTheDocument();
    });
  });

  describe('Real-time Features', () => {
    it('updates document content when changes are made remotely', async () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn()
      };

      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Simulate remote update
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'sop_document_updated',
          document_id: 'test-doc-id',
          updated_content: 'Updated SOP content'
        })
      });

      // Trigger the websocket message event
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(([event]) => event === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler(messageEvent);
      }

      await waitFor(() => {
        expect(mockUseSOPDocument().refetch).toHaveBeenCalled();
      });
    });

    it('shows real-time collaboration indicators', async () => {
      const mockActiveUsers = [
        { id: 'user-1', name: 'John Doe', viewing_since: '2024-01-15T08:00:00Z' },
        { id: 'user-2', name: 'Jane Smith', viewing_since: '2024-01-15T08:05:00Z' }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockActiveUsers })
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('sop.activeViewers')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('synchronizes completion progress across sessions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const stepButton = screen.getByRole('button', { name: /sop.completeStep/i });
      await user.click(stepButton);

      // Should broadcast progress update
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sop/progress/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: 'test-doc-id',
            step: 1,
            completed: true,
            user_id: 'current-user-id'
          })
        });
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('lazy loads large document content', async () => {
      const largeDocument = {
        ...mockDocument,
        content: 'Large content...'.repeat(1000),
        steps: Array.from({ length: 50 }, (_, i) => ({
          step: i + 1,
          action: `Step ${i + 1} action`,
          note: 'Step note'
        }))
      };

      mockUseSOPDocument.mockReturnValue({
        data: largeDocument,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render efficiently even with large content
      expect(renderTime).toBeLessThan(500); // 500ms threshold
      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();
    });

    it('implements virtual scrolling for long step lists', async () => {
      const documentWithManySteps = {
        ...mockDocument,
        steps: Array.from({ length: 100 }, (_, i) => ({
          step: i + 1,
          action: `Step ${i + 1} action`,
          note: `Step ${i + 1} note`
        }))
      };

      mockUseSOPDocument.mockReturnValue({
        data: documentWithManySteps,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Should only render visible steps initially
      expect(screen.getByText('Step 1 action')).toBeInTheDocument();
      expect(screen.queryByText('Step 100 action')).not.toBeInTheDocument();
    });

    it('caches frequently accessed documents', async () => {
      const cacheKey = `sop-document-${defaultProps.documentId}`;
      const mockCacheData = JSON.stringify(mockDocument);
      
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(() => mockCacheData),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Should check cache first
      expect(localStorageMock.getItem).toHaveBeenCalledWith(cacheKey);
      
      // Should cache new data
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          cacheKey,
          expect.any(String)
        );
      });
    });
  });

  describe('Advanced Error Handling', () => {
    it('retries failed operations with exponential backoff', async () => {
      const user = userEvent.setup();
      let attemptCount = 0;
      
      global.fetch = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['success'], { type: 'application/pdf' }))
        });
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /sop.downloadPdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(attemptCount).toBe(3);
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.success',
          description: 'sop.pdfDownloaded'
        });
      }, { timeout: 10000 });
    });

    it('provides fallback when real-time features fail', async () => {
      // Mock WebSocket failure
      global.WebSocket = vi.fn(() => {
        throw new Error('WebSocket not supported');
      }) as any;

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Should still render document without real-time features
      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();
      expect(screen.queryByText('sop.realTimeUnavailable')).toBeInTheDocument();
    });

    it('handles quota exceeded errors for photo uploads', async () => {
      const user = userEvent.setup();
      
      global.fetch = vi.fn().mockRejectedValue({
        name: 'QuotaExceededError',
        message: 'Storage quota exceeded'
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const addPhotoButton = screen.getByRole('button', { name: /sop.addPhoto/i });
      await user.click(addPhotoButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.error',
          description: 'errors.storageQuotaExceeded',
          variant: 'destructive'
        });
      });
    });

    it('validates document integrity and shows corruption warnings', async () => {
      const corruptedDocument = {
        ...mockDocument,
        steps: [
          { step: 1, action: null }, // Corrupted step
          { step: 'invalid', action: 'Valid action' }, // Invalid step number
          { step: 3, action: 'Valid step 3' }
        ]
      };

      mockUseSOPDocument.mockReturnValue({
        data: corruptedDocument,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('sop.dataIntegrityWarning')).toBeInTheDocument();
      expect(screen.getByText('Valid step 3')).toBeInTheDocument();
      expect(screen.queryByText('Valid action')).not.toBeInTheDocument();
    });
  });

  describe('Tablet-Specific Features', () => {
    it('supports gesture navigation for steps', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const stepsContainer = screen.getByTestId('steps-container');
      
      // Simulate swipe gesture
      await user.pointer([
        { keys: '[TouchA>]', target: stepsContainer, coords: { x: 100, y: 100 } },
        { keys: '[/TouchA]', target: stepsContainer, coords: { x: 300, y: 100 } }
      ]);

      // Should navigate to next step
      expect(screen.getByText('Step 2')).toBeVisible();
    });

    it('optimizes touch targets for finger navigation', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44); // Minimum touch target size
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });

    it('provides haptic feedback for completion actions', async () => {
      const user = userEvent.setup();
      const mockVibrate = vi.fn();
      
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const completeButton = screen.getByRole('button', { name: /sop.completeStep/i });
      await user.click(completeButton);

      expect(mockVibrate).toHaveBeenCalledWith([100]);
    });

    it('adjusts interface for landscape/portrait orientation', async () => {
      // Mock orientation change
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 },
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Simulate orientation change event
      window.dispatchEvent(new Event('orientationchange'));

      await waitFor(() => {
        const container = screen.getByTestId('document-container');
        expect(container).toHaveClass('landscape-layout');
      });
    });
  });

  describe('Offline Capabilities', () => {
    it('caches document for offline viewing', async () => {
      const mockIndexedDB = {
        open: vi.fn(() => Promise.resolve({
          transaction: () => ({
            objectStore: () => ({
              put: vi.fn(),
              get: vi.fn(() => Promise.resolve(mockDocument))
            })
          })
        }))
      };

      global.indexedDB = mockIndexedDB as any;

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Should cache document data
      await waitFor(() => {
        expect(mockIndexedDB.open).toHaveBeenCalledWith('sop-cache', 1);
      });
    });

    it('shows offline indicator when network is unavailable', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('common.offlineMode')).toBeInTheDocument();
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    });

    it('queues actions for sync when connection returns', async () => {
      const user = userEvent.setup();
      
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.addToFavorites/i });
      await user.click(favoriteButton);

      // Action should be queued
      expect(screen.getByText('common.actionQueued')).toBeInTheDocument();

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });
      
      window.dispatchEvent(new Event('online'));

      // Should attempt to sync queued actions
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sync/queued-actions', {
          method: 'POST',
          body: expect.any(String)
        });
      });
    });
  });

  describe('Analytics and Tracking', () => {
    it('tracks document viewing time for analytics', async () => {
      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Simulate viewing for 30 seconds
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Unmount component to trigger tracking
      render(<div />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/analytics/sop-viewing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: 'test-doc-id',
            user_id: 'current-user-id',
            viewing_duration: expect.any(Number),
            timestamp: expect.any(String)
          })
        });
      });
    });

    it('records step completion rates for improvement analysis', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const stepButton = screen.getByRole('button', { name: /sop.completeStep/i });
      await user.click(stepButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/analytics/step-completion', {
          method: 'POST',
          body: JSON.stringify({
            document_id: 'test-doc-id',
            step_number: 1,
            completion_time: expect.any(Number),
            user_role: 'staff'
          })
        });
      });
    });

    it('tracks user interactions for UX optimization', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Various user interactions
      await user.click(screen.getByRole('button', { name: /sop.addToFavorites/i }));
      await user.click(screen.getByRole('button', { name: /sop.printSop/i }));
      await user.click(screen.getByRole('button', { name: /sop.shareSop/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/analytics/user-interactions', {
          method: 'POST',
          body: JSON.stringify({
            document_id: 'test-doc-id',
            interactions: [
              { action: 'favorite_toggle', timestamp: expect.any(String) },
              { action: 'print_requested', timestamp: expect.any(String) },
              { action: 'share_initiated', timestamp: expect.any(String) }
            ]
          })
        });
      });
    });
  });

  describe('Concurrent Access and Load Testing', () => {
    it('handles multiple simultaneous document views', async () => {
      const promises = Array.from({ length: 10 }, (_, index) => 
        render(
          <TestWrapper key={index}>
            <SOPDocumentViewer {...defaultProps} documentId={`doc-${index}`} />
          </TestWrapper>
        )
      );

      // All components should render successfully
      expect(promises).toHaveLength(10);
      
      // Verify performance remains acceptable
      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // 2 second threshold
    });

    it('optimizes database queries for concurrent access', async () => {
      // Mock multiple concurrent requests
      let requestCount = 0;
      global.fetch = vi.fn(() => {
        requestCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDocument })
        });
      });

      // Render multiple instances simultaneously
      const instances = Array.from({ length: 5 }, (_, i) => (
        <TestWrapper key={i}>
          <SOPDocumentViewer {...defaultProps} documentId={`doc-${i}`} />
        </TestWrapper>
      ));

      instances.forEach(instance => render(instance));

      await waitFor(() => {
        // Should batch or optimize requests
        expect(requestCount).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Bilingual Support Edge Cases', () => {
    it('handles missing French translations gracefully', async () => {
      const documentWithMissingFrench = {
        ...mockDocument,
        title_fr: null,
        content_fr: null,
        steps_fr: null
      };

      mockUseSOPDocument.mockReturnValue({
        data: documentWithMissingFrench,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      // Should fall back to English content
      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();
      expect(screen.getByText('This is a test SOP document content.')).toBeInTheDocument();
    });

    it('switches language dynamically during viewing', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="en" />
        </TestWrapper>
      );

      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();

      // Switch to French
      rerender(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      expect(screen.getByText('Document SOP Test')).toBeInTheDocument();
    });
  });
});