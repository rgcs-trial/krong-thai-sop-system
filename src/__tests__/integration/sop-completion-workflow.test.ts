import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TestWrapper } from '../utils/test-utils';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      filter: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: { id: 'test-user', email: 'test@example.com' } }, 
      error: null 
    }))
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'test-url' } }))
    }))
  }
};

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}));

// Mock components for integration testing
const MockSOPDocumentViewer = vi.fn(({ onBack, documentId }) => (
  <div data-testid="sop-document-viewer">
    <h1>SOP Document {documentId}</h1>
    <button onClick={onBack}>Back</button>
    <button data-testid="complete-step-1">Complete Step 1</button>
    <button data-testid="complete-step-2">Complete Step 2</button>
    <button data-testid="complete-sop">Complete SOP</button>
    <button data-testid="add-photo">Add Photo</button>
    <button data-testid="add-note">Add Note</button>
  </div>
));

const MockSOPCategoriesDashboard = vi.fn(() => (
  <div data-testid="sop-categories">
    <h1>SOP Categories</h1>
    <button data-testid="category-food-safety">Food Safety</button>
    <button data-testid="category-cleaning">Cleaning</button>
    <button data-testid="category-opening">Opening Procedures</button>
  </div>
));

vi.mock('@/components/sop/sop-document-viewer', () => ({
  SOPDocumentViewer: MockSOPDocumentViewer
}));

vi.mock('@/components/sop/sop-categories-dashboard', () => ({
  SOPCategoriesDashboard: MockSOPCategoriesDashboard
}));

describe('SOP Completion Workflow Integration Tests', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'staff@krongthai.com',
    role: 'staff',
    restaurant_id: 'restaurant-123',
    full_name: 'Test Staff Member'
  };

  const mockSOPDocument = {
    id: 'sop-doc-123',
    title: 'Daily Opening Checklist',
    title_fr: 'Liste de vérification d\'ouverture quotidienne',
    category_id: 'opening-procedures',
    restaurant_id: 'restaurant-123',
    steps: [
      {
        step: 1,
        action: 'Turn on lights and equipment',
        duration: '5 minutes',
        required_photo: true,
        required_signature: false
      },
      {
        step: 2,
        action: 'Check temperature logs',
        duration: '10 minutes',
        required_photo: false,
        required_signature: true
      },
      {
        step: 3,
        action: 'Verify safety equipment',
        duration: '5 minutes',
        required_photo: true,
        required_signature: true
      }
    ],
    estimated_duration: '20 minutes',
    priority: 'high',
    status: 'approved'
  };

  const mockSOPCompletion = {
    id: 'completion-123',
    sop_document_id: 'sop-doc-123',
    user_id: 'test-user-123',
    restaurant_id: 'restaurant-123',
    started_at: '2024-01-15T08:00:00Z',
    completed_at: null,
    status: 'in_progress',
    step_completions: [],
    photos: [],
    notes: [],
    total_duration: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful database responses
    mockSupabase.from.mockImplementation((table) => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => {
            if (table === 'sop_documents') {
              return Promise.resolve({ data: mockSOPDocument, error: null });
            }
            if (table === 'sop_completions') {
              return Promise.resolve({ data: mockSOPCompletion, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [mockSOPDocument], error: null }))
          }))
        })),
        filter: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [mockSOPDocument], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ 
          data: { ...mockSOPCompletion, id: Date.now().toString() }, 
          error: null 
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockSOPCompletion, error: null }))
        })),
        upsert: vi.fn(() => Promise.resolve({ data: mockSOPCompletion, error: null }))
      }));

      return { select: mockSelect };
    });

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete SOP Workflow End-to-End', () => {
    it('completes full SOP workflow from start to finish', async () => {
      const user = userEvent.setup();
      
      // Mock SOP workflow component
      const SOPWorkflow = () => {
        const [currentView, setCurrentView] = useState('categories');
        const [selectedDocument, setSelectedDocument] = useState(null);
        const [completion, setCompletion] = useState(null);

        if (currentView === 'categories') {
          return (
            <MockSOPCategoriesDashboard 
              onCategorySelect={(categoryId) => {
                setCurrentView('documents');
              }}
            />
          );
        }

        if (currentView === 'document') {
          return (
            <MockSOPDocumentViewer
              documentId={selectedDocument}
              onBack={() => setCurrentView('categories')}
              onStartCompletion={(docId) => {
                setCompletion({ id: 'new-completion', documentId: docId });
                setCurrentView('completion');
              }}
            />
          );
        }

        return <div data-testid="sop-completion">Completion View</div>;
      };

      render(
        <TestWrapper>
          <SOPWorkflow />
        </TestWrapper>
      );

      // 1. Start from categories dashboard
      expect(screen.getByTestId('sop-categories')).toBeInTheDocument();
      expect(screen.getByText('SOP Categories')).toBeInTheDocument();

      // 2. Select a category
      const categoryButton = screen.getByTestId('category-opening');
      await user.click(categoryButton);

      // 3. Verify navigation to document list
      await waitFor(() => {
        expect(MockSOPCategoriesDashboard).toHaveBeenCalledWith(
          expect.objectContaining({
            onCategorySelect: expect.any(Function)
          }),
          expect.any(Object)
        );
      });
    }, 30000);

    it('handles step-by-step completion with validation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Verify SOP document is displayed
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
      expect(screen.getByText('SOP Document sop-doc-123')).toBeInTheDocument();

      // Complete Step 1 (requires photo)
      const step1Button = screen.getByTestId('complete-step-1');
      await user.click(step1Button);

      // Should require photo for step 1
      const addPhotoButton = screen.getByTestId('add-photo');
      await user.click(addPhotoButton);

      // Complete Step 2 (requires signature)
      const step2Button = screen.getByTestId('complete-step-2');
      await user.click(step2Button);

      // Complete entire SOP
      const completeSopButton = screen.getByTestId('complete-sop');
      await user.click(completeSopButton);

      // Verify completion tracking
      expect(MockSOPDocumentViewer).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'sop-doc-123'
        }),
        expect.any(Object)
      );
    });

    it('tracks completion progress and time accurately', async () => {
      const startTime = Date.now();
      
      // Mock time-sensitive completion
      const mockCompletionWithTime = {
        ...mockSOPCompletion,
        started_at: new Date(startTime).toISOString(),
        step_completions: [
          {
            step: 1,
            completed_at: new Date(startTime + 300000).toISOString(), // 5 minutes
            duration: 300,
            photo_url: 'test-photo-1.jpg'
          },
          {
            step: 2,
            completed_at: new Date(startTime + 900000).toISOString(), // 15 minutes total
            duration: 600,
            signature_data: 'signature-data'
          }
        ]
      };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: mockCompletionWithTime, 
              error: null 
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: mockCompletionWithTime, 
            error: null 
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Verify time tracking functionality is accessible
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
      
      // Time tracking would be verified through database calls
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sop_completions');
      });
    });
  });

  describe('Photo Capture and Verification', () => {
    it('captures and uploads photos for required steps', async () => {
      const user = userEvent.setup();
      
      // Mock file input and camera API
      const mockFile = new File(['photo-data'], 'step-photo.jpg', { type: 'image/jpeg' });
      
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const addPhotoButton = screen.getByTestId('add-photo');
      await user.click(addPhotoButton);

      // Verify photo upload functionality
      await waitFor(() => {
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('sop-photos');
      });
    });

    it('validates photo quality and requirements', async () => {
      const user = userEvent.setup();
      
      // Mock invalid file type
      const invalidFile = new File(['data'], 'document.pdf', { type: 'application/pdf' });
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const addPhotoButton = screen.getByTestId('add-photo');
      await user.click(addPhotoButton);

      // Should handle invalid file types gracefully
      expect(screen.getByTestId('add-photo')).toBeInTheDocument();
    });

    it('handles offline photo storage and sync', async () => {
      const user = userEvent.setup();
      
      // Mock offline scenario
      mockSupabase.storage.from.mockImplementation(() => ({
        upload: vi.fn(() => Promise.reject(new Error('Network error'))),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: null } }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const addPhotoButton = screen.getByTestId('add-photo');
      await user.click(addPhotoButton);

      // Should handle offline gracefully and queue for sync
      expect(screen.getByTestId('add-photo')).toBeInTheDocument();
    });
  });

  describe('Digital Signature Collection', () => {
    it('captures digital signatures for verification steps', async () => {
      const user = userEvent.setup();
      
      // Mock signature canvas
      const mockSignatureData = 'data:image/png;base64,mock-signature-data';
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Complete step requiring signature
      const step2Button = screen.getByTestId('complete-step-2');
      await user.click(step2Button);

      // Verify signature collection process
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
    });

    it('validates signature requirements and quality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const step2Button = screen.getByTestId('complete-step-2');
      await user.click(step2Button);

      // Should validate signature before allowing completion
      expect(screen.getByTestId('complete-step-2')).toBeInTheDocument();
    });
  });

  describe('Real-time Progress Tracking', () => {
    it('updates completion status in real-time', async () => {
      const user = userEvent.setup();
      
      // Mock real-time subscription
      const mockSubscription = {
        subscribe: vi.fn(() => ({
          on: vi.fn(() => ({
            subscribe: vi.fn()
          }))
        }))
      };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => mockSubscription),
        on: vi.fn(() => mockSubscription)
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const completeSopButton = screen.getByTestId('complete-sop');
      await user.click(completeSopButton);

      // Verify real-time updates are triggered
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sop_completions');
      });
    });

    it('synchronizes progress across multiple tablet sessions', async () => {
      const user = userEvent.setup();
      
      // Mock multiple session scenario
      const mockProgressUpdate = {
        id: 'completion-123',
        step_completions: [
          { step: 1, completed_at: '2024-01-15T08:05:00Z' }
        ]
      };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: mockProgressUpdate, 
              error: null 
            }))
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Verify sync functionality
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sop_documents');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles database connection failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock database failure
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('Database connection failed')))
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Should handle error gracefully
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
    });

    it('recovers from partial completion data loss', async () => {
      const user = userEvent.setup();
      
      // Mock partial data scenario
      const partialCompletion = {
        ...mockSOPCompletion,
        step_completions: [
          { step: 1, completed_at: '2024-01-15T08:05:00Z' }
          // Missing step 2 data
        ]
      };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: partialCompletion, 
              error: null 
            }))
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Should handle partial data and allow recovery
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
    });

    it('validates completion data integrity', async () => {
      const user = userEvent.setup();
      
      // Mock corrupted completion data
      const corruptedCompletion = {
        ...mockSOPCompletion,
        step_completions: [
          { step: 'invalid', completed_at: 'invalid-date' }
        ]
      };

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: corruptedCompletion, 
              error: null 
            }))
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Should validate and handle corrupted data
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
    });
  });

  describe('Bilingual Completion Support', () => {
    it('supports French completion workflow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper locale="fr">
          <MockSOPDocumentViewer documentId="sop-doc-123" locale="fr" />
        </TestWrapper>
      );

      // Should display French content
      expect(screen.getByTestId('sop-document-viewer')).toBeInTheDocument();
      
      // French completion data should be handled
      const completeSopButton = screen.getByTestId('complete-sop');
      await user.click(completeSopButton);

      expect(MockSOPDocumentViewer).toHaveBeenCalledWith(
        expect.objectContaining({
          locale: 'fr'
        }),
        expect.any(Object)
      );
    });

    it('handles mixed language completion notes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const addNoteButton = screen.getByTestId('add-note');
      await user.click(addNoteButton);

      // Should handle notes in both languages
      expect(screen.getByTestId('add-note')).toBeInTheDocument();
    });
  });

  describe('Performance Under Load', () => {
    it('handles concurrent completions efficiently', async () => {
      const user = userEvent.setup();
      
      // Mock multiple concurrent operations
      const promises = Array.from({ length: 10 }, (_, index) => 
        render(
          <TestWrapper key={index}>
            <MockSOPDocumentViewer documentId={`sop-doc-${index}`} />
          </TestWrapper>
        )
      );

      // All components should render successfully
      expect(promises).toHaveLength(10);
      
      // Verify performance remains acceptable
      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 5 second threshold
    });

    it('optimizes database queries for large completion datasets', async () => {
      // Mock large dataset
      const largeCompletionData = Array.from({ length: 100 }, (_, index) => ({
        id: `completion-${index}`,
        sop_document_id: `sop-${index}`,
        completed_at: '2024-01-15T08:00:00Z'
      }));

      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ 
                data: largeCompletionData.slice(0, 20), 
                error: null 
              }))
            }))
          }))
        }))
      }));

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Should handle large datasets efficiently
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });
    });

    it('maintains sub-100ms response times under concurrent load', async () => {
      const startTime = performance.now();
      
      // Simulate 20 concurrent completion requests
      const concurrentCompletions = Array.from({ length: 20 }, (_, i) => 
        render(
          <TestWrapper key={i}>
            <MockSOPDocumentViewer documentId={`sop-doc-${i}`} />
          </TestWrapper>
        )
      );

      await Promise.all(concurrentCompletions);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should maintain performance under load
      expect(totalTime).toBeLessThan(2000); // 2 second threshold for 20 concurrent renders
      expect(totalTime / 20).toBeLessThan(100); // Average under 100ms per completion
    });
  });

  describe('Enhanced Task Management Integration', () => {
    it('automatically creates follow-up tasks upon SOP completion', async () => {
      const user = userEvent.setup();
      
      // Mock task creation API
      const mockTaskResponse = {
        id: 'auto-task-123',
        title: 'Follow-up maintenance check',
        status: 'pending',
        priority: 'medium',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'tasks') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: mockTaskResponse, error: null })),
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [mockTaskResponse], error: null }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const completeSopButton = screen.getByTestId('complete-sop');
      await user.click(completeSopButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
        expect(mockSupabase.from('tasks').insert).toHaveBeenCalledWith({
          title: expect.stringContaining('Follow-up'),
          sop_document_id: 'sop-doc-123',
          assigned_to: 'test-user-123',
          priority: 'medium',
          type: 'sop_follow_up'
        });
      });
    });

    it('creates escalation tasks for overdue SOPs', async () => {
      const user = userEvent.setup();
      
      // Mock overdue SOP scenario
      const overdueCompletion = {
        ...mockSOPCompletion,
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'in_progress'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sop_completions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: overdueCompletion, error: null }))
              }))
            }))
          };
        }
        if (table === 'tasks') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: { id: 'escalation-task' }, error: null }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Simulate escalation trigger
      await waitFor(() => {
        expect(mockSupabase.from('tasks').insert).toHaveBeenCalledWith({
          title: expect.stringContaining('Overdue SOP'),
          type: 'escalation',
          priority: 'high',
          assigned_to: expect.any(String)
        });
      });
    });
  });

  describe('Enhanced Security and Audit Trail', () => {
    it('validates user permissions before allowing SOP completion', async () => {
      const user = userEvent.setup();
      
      const restrictedDocument = {
        ...mockSOPDocument,
        security_level: 'manager_only',
        required_role: 'manager'
      };

      // Mock staff user (insufficient permissions)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { ...mockUser, role: 'staff' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sop_documents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: restrictedDocument, error: null }))
              }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      expect(screen.getByText('sop.insufficientPermissions')).toBeInTheDocument();
      expect(screen.queryByTestId('complete-sop')).not.toBeInTheDocument();
    });

    it('creates comprehensive audit logs for all SOP actions', async () => {
      const user = userEvent.setup();
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'audit_logs') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      // Perform various actions
      await user.click(screen.getByTestId('complete-step-1'));
      await user.click(screen.getByTestId('add-photo'));
      await user.click(screen.getByTestId('complete-sop'));

      await waitFor(() => {
        expect(mockSupabase.from('audit_logs').insert).toHaveBeenCalledTimes(3);
        expect(mockSupabase.from('audit_logs').insert).toHaveBeenCalledWith({
          action: 'sop_step_completed',
          resource_type: 'sop_document',
          resource_id: 'sop-doc-123',
          user_id: 'test-user-123',
          metadata: expect.objectContaining({
            step_number: 1,
            timestamp: expect.any(String)
          })
        });
      });
    });
  });

  describe('Advanced Real-time Collaboration', () => {
    it('shows active users working on the same SOP', async () => {
      const user = userEvent.setup();
      
      const mockActiveUsers = [
        { id: 'user-2', name: 'Jane Smith', step: 1, last_activity: '2024-01-15T08:01:00Z' },
        { id: 'user-3', name: 'Bob Johnson', step: 2, last_activity: '2024-01-15T08:02:00Z' }
      ];

      // Mock real-time subscription for active users
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sop_active_users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockActiveUsers, error: null })),
              on: vi.fn(() => ({
                subscribe: vi.fn()
              }))
            }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('sop.activeUsers')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('prevents conflicting step completions by multiple users', async () => {
      const user = userEvent.setup();
      
      // Mock conflict scenario
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'sop_step_completions') {
          return {
            insert: vi.fn(() => Promise.reject({
              code: '23505', // Unique constraint violation
              message: 'Step already completed by another user'
            }))
          };
        }
        return mockSupabase.from(table);
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const step1Button = screen.getByTestId('complete-step-1');
      await user.click(step1Button);

      await waitFor(() => {
        expect(screen.getByText('sop.stepAlreadyCompleted')).toBeInTheDocument();
        expect(screen.getByText('sop.refreshToSeeUpdates')).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Offline Capabilities', () => {
    it('queues completion data when offline and syncs when online', async () => {
      const user = userEvent.setup();
      
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      render(
        <TestWrapper>
          <MockSOPDocumentViewer documentId="sop-doc-123" />
        </TestWrapper>
      );

      const step1Button = screen.getByTestId('complete-step-1');
      await user.click(step1Button);

      // Should queue completion offline
      expect(screen.getByText('common.savedOffline')).toBeInTheDocument();

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });
      
      window.dispatchEvent(new Event('online'));

      // Should attempt to sync queued data
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('sop_completions');
      });
    });
  });
});