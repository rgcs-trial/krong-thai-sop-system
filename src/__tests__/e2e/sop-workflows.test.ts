import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '@/src/__tests__/utils/test-utils';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn()
  }),
  usePathname: () => '/en/dashboard',
  useSearchParams: () => new URLSearchParams()
}));

// Mock API calls
global.fetch = vi.fn();

describe('SOP End-to-End Workflows', () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as any;
    
    // Mock successful API responses by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {},
        message: 'Operation successful'
      })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('SOP Creation Workflow', () => {
    it('should complete full SOP creation workflow', async () => {
      const user = userEvent.setup();

      // Mock API responses for the workflow
      mockFetch
        // Get categories
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'cat-1',
                name: 'Food Safety',
                name_th: 'ความปลอดภัยอาหาร',
                code: 'FOOD_SAFETY'
              }
            ]
          })
        })
        // Create SOP document
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'sop-123',
              title: 'Hand Washing Procedure',
              title_th: 'ขั้นตอนการล้างมือ',
              status: 'draft'
            },
            message: 'SOP document created successfully'
          })
        });

      // Step 1: Start SOP creation
      const sopCreationForm = render(
        <TestWrapper>
          <div data-testid="sop-creation-form">
            <form>
              <label htmlFor="category">Category</label>
              <select id="category" name="category" required>
                <option value="">Select category</option>
                <option value="cat-1">Food Safety</option>
              </select>

              <label htmlFor="title">Title (English)</label>
              <input 
                id="title" 
                name="title" 
                type="text" 
                required 
                placeholder="Enter SOP title"
              />

              <label htmlFor="title_th">Title (Thai)</label>
              <input 
                id="title_th" 
                name="title_th" 
                type="text" 
                required 
                placeholder="ป้อนชื่อ SOP"
              />

              <label htmlFor="content">Content (English)</label>
              <textarea 
                id="content" 
                name="content" 
                required 
                placeholder="Enter SOP content"
              />

              <label htmlFor="content_th">Content (Thai)</label>
              <textarea 
                id="content_th" 
                name="content_th" 
                required 
                placeholder="ป้อนเนื้อหา SOP"
              />

              <label htmlFor="priority">Priority</label>
              <select id="priority" name="priority" required>
                <option value="">Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label htmlFor="tags">Tags</label>
              <input 
                id="tags" 
                name="tags" 
                type="text" 
                placeholder="safety, hygiene, mandatory"
              />

              <button type="submit">Create SOP</button>
            </form>
          </div>
        </TestWrapper>
      );

      // Step 2: Fill out SOP creation form
      await user.selectOptions(screen.getByLabelText('Category'), 'cat-1');
      await user.type(screen.getByLabelText('Title (English)'), 'Hand Washing Procedure');
      await user.type(screen.getByLabelText('Title (Thai)'), 'ขั้นตอนการล้างมือ');
      await user.type(
        screen.getByLabelText('Content (English)'), 
        'Proper hand washing procedure for food safety compliance'
      );
      await user.type(
        screen.getByLabelText('Content (Thai)'), 
        'ขั้นตอนการล้างมือที่ถูกต้องเพื่อปฏิบัติตามมาตรฐานความปลอดภัยอาหาร'
      );
      await user.selectOptions(screen.getByLabelText('Priority'), 'critical');
      await user.type(screen.getByLabelText('Tags'), 'safety, hygiene, mandatory');

      // Step 3: Submit form
      await user.click(screen.getByRole('button', { name: 'Create SOP' }));

      // Step 4: Verify API was called with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category_id: 'cat-1',
            title: 'Hand Washing Procedure',
            title_th: 'ขั้นตอนการล้างมือ',
            content: 'Proper hand washing procedure for food safety compliance',
            content_th: 'ขั้นตอนการล้างมือที่ถูกต้องเพื่อปฏิบัติตามมาตรฐานความปลอดภัยอาหาร',
            priority: 'critical',
            tags: ['safety', 'hygiene', 'mandatory']
          })
        });
      });

      // Step 5: Verify success feedback
      expect(screen.getByText('SOP document created successfully')).toBeInTheDocument();
    });

    it('should handle validation errors during SOP creation', async () => {
      const user = userEvent.setup();

      // Mock validation error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validation failed',
          details: ['Title is required', 'Content is required'],
          errorCode: 'VALIDATION_ERROR'
        })
      });

      const sopCreationForm = render(
        <TestWrapper>
          <div data-testid="sop-creation-form">
            <form>
              <label htmlFor="category">Category</label>
              <select id="category" name="category" required>
                <option value="cat-1">Food Safety</option>
              </select>

              <label htmlFor="title">Title (English)</label>
              <input id="title" name="title" type="text" required />

              <button type="submit">Create SOP</button>
            </form>
            <div data-testid="error-display"></div>
          </div>
        </TestWrapper>
      );

      // Submit incomplete form
      await user.click(screen.getByRole('button', { name: 'Create SOP' }));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Content is required')).toBeInTheDocument();
      });
    });
  });

  describe('SOP Assignment Workflow', () => {
    it('should complete SOP assignment to staff member', async () => {
      const user = userEvent.setup();

      // Mock API responses
      mockFetch
        // Get available SOPs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'sop-123',
                title: 'Hand Washing Procedure',
                title_th: 'ขั้นตอนการล้างมือ',
                status: 'approved',
                priority: 'critical'
              }
            ]
          })
        })
        // Get staff members
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'user-456',
                full_name: 'John Smith',
                full_name_th: 'จอห์น สมิธ',
                role: 'staff'
              },
              {
                id: 'user-789',
                full_name: 'Jane Doe',
                full_name_th: 'เจน โด',
                role: 'staff'
              }
            ]
          })
        })
        // Create assignment
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'assignment-123',
              sop_document_id: 'sop-123',
              assigned_to: 'user-456',
              status: 'assigned',
              due_date: '2024-02-01T10:00:00Z'
            },
            message: 'SOP assigned successfully'
          })
        });

      const sopAssignmentForm = render(
        <TestWrapper>
          <div data-testid="sop-assignment-form">
            <form>
              <label htmlFor="sop">SOP Document</label>
              <select id="sop" name="sop" required>
                <option value="">Select SOP</option>
                <option value="sop-123">Hand Washing Procedure</option>
              </select>

              <label htmlFor="assignee">Assign to</label>
              <select id="assignee" name="assignee" required>
                <option value="">Select staff member</option>
                <option value="user-456">John Smith</option>
                <option value="user-789">Jane Doe</option>
              </select>

              <label htmlFor="priority">Priority</label>
              <select id="priority" name="priority" required>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <label htmlFor="due_date">Due Date</label>
              <input 
                id="due_date" 
                name="due_date" 
                type="datetime-local" 
                required 
              />

              <label htmlFor="notes">Assignment Notes</label>
              <textarea 
                id="notes" 
                name="notes" 
                placeholder="Special instructions..."
              />

              <button type="submit">Assign SOP</button>
            </form>
          </div>
        </TestWrapper>
      );

      // Fill assignment form
      await user.selectOptions(screen.getByLabelText('SOP Document'), 'sop-123');
      await user.selectOptions(screen.getByLabelText('Assign to'), 'user-456');
      await user.selectOptions(screen.getByLabelText('Priority'), 'critical');
      await user.type(screen.getByLabelText('Due Date'), '2024-02-01T10:00');
      await user.type(
        screen.getByLabelText('Assignment Notes'), 
        'Please complete this training by end of week'
      );

      // Submit assignment
      await user.click(screen.getByRole('button', { name: 'Assign SOP' }));

      // Verify assignment API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sop_document_id: 'sop-123',
            assigned_to: 'user-456',
            priority: 'critical',
            due_date: '2024-02-01T10:00:00.000Z',
            assignment_notes: 'Please complete this training by end of week'
          })
        });
      });

      // Verify success feedback
      expect(screen.getByText('SOP assigned successfully')).toBeInTheDocument();
    });

    it('should handle bulk assignment workflow', async () => {
      const user = userEvent.setup();

      // Mock bulk assignment response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            assigned_count: 3,
            assignments: [
              { id: 'assign-1', assigned_to: 'user-456' },
              { id: 'assign-2', assigned_to: 'user-789' },
              { id: 'assign-3', assigned_to: 'user-012' }
            ]
          },
          message: 'Bulk assignment completed successfully'
        })
      });

      const bulkAssignmentForm = render(
        <TestWrapper>
          <div data-testid="bulk-assignment-form">
            <form>
              <label htmlFor="sop">SOP Document</label>
              <select id="sop" name="sop" required>
                <option value="sop-123">Hand Washing Procedure</option>
              </select>

              <fieldset>
                <legend>Assign to Staff</legend>
                <label>
                  <input type="checkbox" value="user-456" name="assignees" />
                  John Smith
                </label>
                <label>
                  <input type="checkbox" value="user-789" name="assignees" />
                  Jane Doe
                </label>
                <label>
                  <input type="checkbox" value="user-012" name="assignees" />
                  Bob Wilson
                </label>
              </fieldset>

              <button type="submit">Assign to Selected Staff</button>
            </form>
          </div>
        </TestWrapper>
      );

      // Select multiple staff members
      await user.click(screen.getByLabelText('John Smith'));
      await user.click(screen.getByLabelText('Jane Doe'));
      await user.click(screen.getByLabelText('Bob Wilson'));

      // Submit bulk assignment
      await user.click(screen.getByRole('button', { name: 'Assign to Selected Staff' }));

      // Verify bulk assignment API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/assignments/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sop_document_id: 'sop-123',
            assigned_to: ['user-456', 'user-789', 'user-012']
          })
        });
      });

      // Verify success feedback
      expect(screen.getByText('Bulk assignment completed successfully')).toBeInTheDocument();
      expect(screen.getByText('3 staff members assigned')).toBeInTheDocument();
    });
  });

  describe('SOP Completion Workflow', () => {
    it('should complete SOP execution with photo verification', async () => {
      const user = userEvent.setup();

      // Mock API responses for completion workflow
      mockFetch
        // Get SOP details with steps
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'sop-123',
              title: 'Hand Washing Procedure',
              steps: [
                {
                  id: 'step-1',
                  step_number: 1,
                  title: 'Wet hands with water',
                  requires_photo: false
                },
                {
                  id: 'step-2',
                  step_number: 2,
                  title: 'Apply soap',
                  requires_photo: true
                },
                {
                  id: 'step-3',
                  step_number: 3,
                  title: 'Scrub for 20 seconds',
                  requires_photo: false
                }
              ]
            }
          })
        })
        // Upload photo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'photo-123',
              url: '/uploads/hand-washing-photo.jpg'
            }
          })
        })
        // Complete SOP
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'completion-123',
              status: 'completed',
              compliance_score: 0.95,
              quality_rating: 5
            },
            message: 'SOP completed successfully'
          })
        });

      const sopExecutionInterface = render(
        <TestWrapper>
          <div data-testid="sop-execution">
            <div data-testid="sop-header">
              <h1>Hand Washing Procedure</h1>
              <div data-testid="progress">Step 1 of 3</div>
            </div>

            <div data-testid="step-content">
              <h2>Step 1: Wet hands with water</h2>
              <button>Mark as Complete</button>
            </div>

            <div data-testid="step-navigation">
              <button disabled>Previous</button>
              <button>Next Step</button>
            </div>

            {/* Mock photo capture modal */}
            <div data-testid="photo-modal" style={{ display: 'none' }}>
              <input type="file" accept="image/*" data-testid="photo-input" />
              <button data-testid="capture-photo">Capture Photo</button>
              <button data-testid="upload-photo">Upload Photo</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Step 1: Complete first step
      await user.click(screen.getByText('Mark as Complete'));

      // Step 2: Navigate to second step (requires photo)
      await user.click(screen.getByText('Next Step'));

      // Verify photo requirement is shown
      expect(screen.getByText('Step 2: Apply soap')).toBeInTheDocument();
      expect(screen.getByText('Photo verification required')).toBeInTheDocument();

      // Step 3: Take/upload photo
      const photoModal = screen.getByTestId('photo-modal');
      photoModal.style.display = 'block';

      // Simulate photo capture
      const file = new File(['photo data'], 'hand-washing.jpg', { type: 'image/jpeg' });
      const photoInput = screen.getByTestId('photo-input');
      await user.upload(photoInput, file);
      await user.click(screen.getByTestId('upload-photo'));

      // Step 4: Complete remaining steps
      await user.click(screen.getByText('Mark as Complete'));
      await user.click(screen.getByText('Next Step'));
      await user.click(screen.getByText('Mark as Complete'));

      // Step 5: Submit completion
      await user.click(screen.getByText('Complete SOP'));

      // Verify completion API calls
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/uploads/sop-photos', expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sop_document_id: 'sop-123',
            completed_steps: [
              { step_id: 'step-1', completed: true },
              { step_id: 'step-2', completed: true, photo_id: 'photo-123' },
              { step_id: 'step-3', completed: true }
            ],
            completion_notes: '',
            quality_rating: 5
          })
        });
      });

      // Verify completion feedback
      expect(screen.getByText('SOP completed successfully')).toBeInTheDocument();
      expect(screen.getByText('Compliance Score: 95%')).toBeInTheDocument();
    });

    it('should handle partial completion and resumption', async () => {
      const user = userEvent.setup();

      // Mock API for saving progress
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'progress-123',
              completed_steps: ['step-1'],
              current_step: 'step-2'
            },
            message: 'Progress saved'
          })
        })
        // Resume progress
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'progress-123',
              completed_steps: ['step-1'],
              current_step: 'step-2',
              sop_document: {
                id: 'sop-123',
                title: 'Hand Washing Procedure'
              }
            }
          })
        });

      const sopProgressInterface = render(
        <TestWrapper>
          <div data-testid="sop-progress">
            <div data-testid="progress-header">
              <h1>Hand Washing Procedure</h1>
              <div data-testid="progress-indicator">Step 2 of 3 (33% complete)</div>
            </div>

            <div data-testid="step-content">
              <h2>Step 2: Apply soap</h2>
              <div data-testid="completed-steps">
                <div className="completed">✓ Step 1: Wet hands with water</div>
                <div className="current">→ Step 2: Apply soap</div>
                <div className="pending">Step 3: Scrub for 20 seconds</div>
              </div>
            </div>

            <div data-testid="actions">
              <button>Save Progress</button>
              <button>Complete Step</button>
              <button>Exit Training</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Save progress mid-training
      await user.click(screen.getByText('Save Progress'));

      // Verify progress saving
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sop_document_id: 'sop-123',
            completed_steps: ['step-1'],
            current_step: 'step-2',
            progress_percentage: 33
          })
        });
      });

      // Verify save confirmation
      expect(screen.getByText('Progress saved')).toBeInTheDocument();

      // Test resumption
      await user.click(screen.getByText('Resume Training'));

      // Verify correct step is loaded
      expect(screen.getByText('Step 2: Apply soap')).toBeInTheDocument();
      expect(screen.getByText('✓ Step 1: Wet hands with water')).toBeInTheDocument();
    });
  });

  describe('Manager Approval Workflow', () => {
    it('should complete manager approval process', async () => {
      const user = userEvent.setup();

      // Mock API responses for approval workflow
      mockFetch
        // Get pending approvals
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'approval-123',
                sop_completion: {
                  id: 'completion-456',
                  sop_document: {
                    title: 'Hand Washing Procedure',
                    title_th: 'ขั้นตอนการล้างมือ'
                  },
                  completed_by: {
                    full_name: 'John Smith',
                    full_name_th: 'จอห์น สมิธ'
                  },
                  completed_at: '2024-01-28T10:30:00Z',
                  quality_rating: 4,
                  compliance_score: 0.90,
                  verification_photos: [
                    { id: 'photo-1', url: '/uploads/photo1.jpg' }
                  ]
                },
                status: 'pending',
                priority: 'medium'
              }
            ]
          })
        })
        // Approve completion
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'approval-123',
              status: 'approved',
              approved_at: '2024-01-28T11:00:00Z'
            },
            message: 'SOP completion approved successfully'
          })
        });

      const managerApprovalInterface = render(
        <TestWrapper>
          <div data-testid="approval-dashboard">
            <h1>Pending Approvals</h1>
            
            <div data-testid="approval-item">
              <div data-testid="completion-details">
                <h2>Hand Washing Procedure</h2>
                <p>Completed by: John Smith</p>
                <p>Completed at: Jan 28, 2024 10:30 AM</p>
                <p>Quality Rating: 4/5 stars</p>
                <p>Compliance Score: 90%</p>
              </div>

              <div data-testid="verification-photos">
                <h3>Verification Photos</h3>
                <img src="/uploads/photo1.jpg" alt="Verification photo" />
              </div>

              <div data-testid="approval-notes">
                <label htmlFor="notes">Approval Notes</label>
                <textarea 
                  id="notes" 
                  placeholder="Add notes about the completion..."
                />
              </div>

              <div data-testid="approval-actions">
                <button className="approve">Approve</button>
                <button className="reject">Reject</button>
                <button className="request-revision">Request Revision</button>
              </div>
            </div>
          </div>
        </TestWrapper>
      );

      // Review completion details
      expect(screen.getByText('Hand Washing Procedure')).toBeInTheDocument();
      expect(screen.getByText('Completed by: John Smith')).toBeInTheDocument();
      expect(screen.getByText('Quality Rating: 4/5 stars')).toBeInTheDocument();
      expect(screen.getByText('Compliance Score: 90%')).toBeInTheDocument();

      // Add approval notes
      await user.type(
        screen.getByLabelText('Approval Notes'),
        'Good completion. Photo shows proper soap application technique.'
      );

      // Approve the completion
      await user.click(screen.getByText('Approve'));

      // Verify approval API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/approvals/approval-123', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'approved',
            approval_notes: 'Good completion. Photo shows proper soap application technique.'
          })
        });
      });

      // Verify approval feedback
      expect(screen.getByText('SOP completion approved successfully')).toBeInTheDocument();
    });

    it('should handle rejection with feedback', async () => {
      const user = userEvent.setup();

      // Mock rejection API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'approval-123',
            status: 'rejected',
            rejected_at: '2024-01-28T11:00:00Z'
          },
          message: 'SOP completion rejected'
        })
      });

      const rejectionInterface = render(
        <TestWrapper>
          <div data-testid="rejection-form">
            <h2>Reject SOP Completion</h2>
            
            <div data-testid="rejection-reason">
              <label htmlFor="reason">Rejection Reason</label>
              <select id="reason" required>
                <option value="">Select reason</option>
                <option value="incomplete">Incomplete steps</option>
                <option value="poor_quality">Poor quality execution</option>
                <option value="missing_photo">Missing required photos</option>
                <option value="safety_violation">Safety violation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div data-testid="rejection-notes">
              <label htmlFor="notes">Detailed Feedback</label>
              <textarea 
                id="notes" 
                required
                placeholder="Provide specific feedback for improvement..."
              />
            </div>

            <div data-testid="retraining-required">
              <label>
                <input type="checkbox" name="require_retraining" />
                Require additional training before retry
              </label>
            </div>

            <div data-testid="actions">
              <button type="submit">Confirm Rejection</button>
              <button type="button">Cancel</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Fill rejection form
      await user.selectOptions(screen.getByLabelText('Rejection Reason'), 'missing_photo');
      await user.type(
        screen.getByLabelText('Detailed Feedback'),
        'Step 2 photo is missing. Please retake photo showing proper soap application.'
      );
      await user.click(screen.getByLabelText('Require additional training before retry'));

      // Submit rejection
      await user.click(screen.getByText('Confirm Rejection'));

      // Verify rejection API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/approvals/approval-123', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'rejected',
            rejection_reason: 'missing_photo',
            rejection_notes: 'Step 2 photo is missing. Please retake photo showing proper soap application.',
            require_retraining: true
          })
        });
      });

      // Verify rejection feedback
      expect(screen.getByText('SOP completion rejected')).toBeInTheDocument();
    });
  });

  describe('Real-time Notifications Workflow', () => {
    it('should handle real-time SOP assignment notifications', async () => {
      const user = userEvent.setup();

      // Mock WebSocket connection
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
        send: vi.fn()
      };

      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      const notificationInterface = render(
        <TestWrapper>
          <div data-testid="notification-system">
            <div data-testid="notification-list">
              {/* Notifications will be dynamically added */}
            </div>
            
            <div data-testid="websocket-status">
              Connected
            </div>
          </div>
        </TestWrapper>
      );

      // Simulate WebSocket message for new assignment
      const assignmentNotification = {
        type: 'sop_assignment',
        data: {
          id: 'assignment-789',
          sop_document: {
            title: 'Kitchen Cleaning Procedure',
            title_th: 'ขั้นตอนการทำความสะอาดครัว'
          },
          assigned_to: 'current-user-id',
          assigned_by: {
            full_name: 'Manager Johnson'
          },
          due_date: '2024-01-30T16:00:00Z',
          priority: 'high'
        },
        timestamp: '2024-01-28T12:00:00Z'
      };

      // Trigger WebSocket message event
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(assignmentNotification)
      });

      // Simulate receiving WebSocket message
      if (mockWebSocket.addEventListener.mock.calls.length > 0) {
        const messageHandler = mockWebSocket.addEventListener.mock.calls
          .find(call => call[0] === 'message')?.[1];
        
        if (messageHandler) {
          messageHandler(messageEvent);
        }
      }

      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText('New SOP Assignment')).toBeInTheDocument();
        expect(screen.getByText('Kitchen Cleaning Procedure')).toBeInTheDocument();
        expect(screen.getByText('Assigned by Manager Johnson')).toBeInTheDocument();
        expect(screen.getByText('Due: Jan 30, 2024 4:00 PM')).toBeInTheDocument();
        expect(screen.getByText('Priority: High')).toBeInTheDocument();
      });

      // Test notification interaction
      await user.click(screen.getByText('View Assignment'));

      // Verify navigation to assignment details
      expect(screen.getByText('Assignment Details')).toBeInTheDocument();
    });

    it('should handle real-time approval status updates', async () => {
      const user = userEvent.setup();

      const approvalUpdateInterface = render(
        <TestWrapper>
          <div data-testid="approval-status-updates">
            <div data-testid="pending-approvals">
              <div data-testid="approval-item-123">
                <h3>Hand Washing Procedure</h3>
                <span data-testid="status">Pending Review</span>
                <div data-testid="status-indicator" className="pending"></div>
              </div>
            </div>
          </div>
        </TestWrapper>
      );

      // Simulate approval notification
      const approvalUpdate = {
        type: 'approval_status_update',
        data: {
          approval_id: 'approval-123',
          status: 'approved',
          approved_by: {
            full_name: 'Manager Smith'
          },
          approved_at: '2024-01-28T12:30:00Z',
          approval_notes: 'Excellent execution'
        }
      };

      // Trigger status update
      const updateEvent = new MessageEvent('message', {
        data: JSON.stringify(approvalUpdate)
      });

      // Simulate WebSocket message handling
      // (In real implementation, this would be handled by the WebSocket listener)

      // Verify status update in UI
      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('Approved by Manager Smith')).toBeInTheDocument();
        expect(screen.getByText('Excellent execution')).toBeInTheDocument();
      });

      // Verify visual status indicator update
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveClass('approved');
    });
  });

  describe('Offline Capability Workflow', () => {
    it('should handle offline SOP execution and sync when reconnected', async () => {
      const user = userEvent.setup();

      // Mock offline storage
      const mockOfflineStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };

      global.localStorage = mockOfflineStorage as any;

      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const offlineInterface = render(
        <TestWrapper>
          <div data-testid="offline-sop-execution">
            <div data-testid="offline-indicator">
              <span>Offline Mode</span>
              <span>Changes will sync when reconnected</span>
            </div>

            <div data-testid="sop-content">
              <h1>Hand Washing Procedure</h1>
              <div data-testid="step-1">
                <h2>Step 1: Wet hands with water</h2>
                <button>Complete Step</button>
              </div>
            </div>

            <div data-testid="offline-storage-status">
              <span>Data cached locally</span>
            </div>
          </div>
        </TestWrapper>
      );

      // Complete step while offline
      await user.click(screen.getByText('Complete Step'));

      // Verify offline storage
      expect(mockOfflineStorage.setItem).toHaveBeenCalledWith(
        'offline_sop_progress_sop-123',
        JSON.stringify({
          sop_document_id: 'sop-123',
          completed_steps: ['step-1'],
          timestamp: expect.any(String),
          sync_pending: true
        })
      );

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', {
        value: true
      });

      // Mock sync API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            synced_items: 1,
            conflicts: 0
          },
          message: 'Offline changes synced successfully'
        })
      });

      // Trigger online event
      window.dispatchEvent(new Event('online'));

      // Verify sync process
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sop/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            offline_data: [
              {
                sop_document_id: 'sop-123',
                completed_steps: ['step-1'],
                timestamp: expect.any(String),
                sync_pending: true
              }
            ]
          })
        });
      });

      // Verify sync completion
      expect(screen.getByText('Offline changes synced successfully')).toBeInTheDocument();
      expect(mockOfflineStorage.removeItem).toHaveBeenCalledWith('offline_sop_progress_sop-123');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track SOP execution performance metrics', async () => {
      const user = userEvent.setup();

      // Mock performance API
      const mockPerformance = {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn()
      };

      global.performance = mockPerformance as any;

      // Mock analytics API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Performance metrics recorded'
        })
      });

      const performanceTrackingInterface = render(
        <TestWrapper>
          <div data-testid="sop-with-tracking">
            <div data-testid="performance-indicators">
              <span data-testid="start-time">Started: 12:00:00 PM</span>
              <span data-testid="elapsed-time">Elapsed: 00:02:30</span>
              <span data-testid="estimated-remaining">Est. remaining: 00:02:30</span>
            </div>

            <div data-testid="sop-execution-tracking">
              <h1>Hand Washing Procedure</h1>
              <button data-testid="start-sop">Start SOP</button>
              <button data-testid="complete-sop">Complete SOP</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Start SOP execution
      mockPerformance.now.mockReturnValue(1000);
      await user.click(screen.getByTestId('start-sop'));

      // Verify performance tracking start
      expect(mockPerformance.mark).toHaveBeenCalledWith('sop-execution-start');

      // Complete SOP execution
      mockPerformance.now.mockReturnValue(6000); // 5 seconds later
      await user.click(screen.getByTestId('complete-sop'));

      // Verify performance tracking end
      expect(mockPerformance.mark).toHaveBeenCalledWith('sop-execution-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'sop-execution-duration',
        'sop-execution-start',
        'sop-execution-end'
      );

      // Verify analytics call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics/sop/performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sop_document_id: 'sop-123',
            execution_duration_ms: 5000,
            start_time: '2024-01-28T12:00:00Z',
            end_time: '2024-01-28T12:00:05Z',
            user_agent: expect.any(String),
            performance_metrics: {
              total_duration: 5000,
              step_durations: expect.any(Object)
            }
          })
        });
      });
    });
  });
});