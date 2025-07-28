import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
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

describe('SOPDocumentViewer', () => {
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
    title_th: 'Test SOP Document Thai',
    content: 'This is a test SOP document content.',
    content_th: 'This is a test SOP document content in Thai.',
    steps: [
      {
        step: 1,
        action: 'First step action',
        note: 'First step note',
        duration: '5 minutes',
        warning: 'Be careful with this step',
        tools: ['Tool 1', 'Tool 2'],
        image: '/test-image.jpg'
      },
      {
        step: 2,
        action: 'Second step action',
        note: 'Second step note'
      }
    ],
    steps_th: [
      {
        step: 1,
        action: 'First step action Thai',
        note: 'First step note Thai',
        duration: '5 minutes',
        warning: 'Be careful with this step Thai',
        tools: ['Tool 1 Thai', 'Tool 2 Thai']
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
    tags_th: ['tag1 Thai', 'tag2 Thai'],
    version: 1,
    status: 'approved' as const,
    priority: 'high' as const,
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

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      },
      share: vi.fn(() => Promise.resolve())
    });

    // Mock window.print
    Object.defineProperty(window, 'print', {
      value: vi.fn(),
      writable: true
    });

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading States', () => {
    it('displays loading spinner when document is loading', () => {
      mockUseSOPDocument.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('sop.loading')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('displays error state when document fails to load', () => {
      const error = { message: 'Failed to load document' };
      mockUseSOPDocument.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('common.error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load document')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sop.backToCategories/i })).toBeInTheDocument();
    });

    it('displays not found state when document is null', () => {
      mockUseSOPDocument.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('common.error')).toBeInTheDocument();
      expect(screen.getByText('sop.documentNotFound')).toBeInTheDocument();
    });
  });

  describe('Document Content Display', () => {
    it('renders document title and category correctly', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();
      expect(screen.getByText('Test Category')).toBeInTheDocument();
    });

    it('renders French content when locale is fr', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      // Should show French category name
      expect(screen.getByText('Catégorie Test')).toBeInTheDocument();
    });

    it('displays document metadata correctly', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Status and priority badges
      expect(screen.getByText('sop.approved')).toBeInTheDocument();
      expect(screen.getByText('sop.high')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();

      // Dates and people
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('2024-12-31')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Manager Smith')).toBeInTheDocument();
    });

    it('displays tags when available', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('displays document content overview', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('This is a test SOP document content.')).toBeInTheDocument();
    });
  });

  describe('Steps Display', () => {
    it('renders all steps with correct numbering', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('First step action')).toBeInTheDocument();
      expect(screen.getByText('Second step action')).toBeInTheDocument();
    });

    it('displays step details correctly', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Step notes
      expect(screen.getByText('First step note')).toBeInTheDocument();
      expect(screen.getByText('Second step note')).toBeInTheDocument();

      // Duration
      expect(screen.getByText('5 minutes')).toBeInTheDocument();

      // Tools
      expect(screen.getByText('Tool 1')).toBeInTheDocument();
      expect(screen.getByText('Tool 2')).toBeInTheDocument();

      // Warning
      expect(screen.getByText('Be careful with this step')).toBeInTheDocument();
    });

    it('displays step images when available', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute('src', '/test-image.jpg');
      expect(images[0]).toHaveAttribute('alt', 'First step action');
    });
  });

  describe('Attachments Display', () => {
    it('renders attachments section when attachments exist', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('sop.attachments')).toBeInTheDocument();
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      expect(screen.getByText('1000.00 KB')).toBeInTheDocument();
    });

    it('does not render attachments section when no attachments', () => {
      const documentWithoutAttachments = {
        ...mockDocument,
        attachments: []
      };

      mockUseSOPDocument.mockReturnValue({
        data: documentWithoutAttachments,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByText('sop.attachments')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const backButton = screen.getByLabelText('sop.backToCategories');
      await user.click(backButton);

      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigate for prev/next navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const prevButton = screen.getByRole('button', { name: '' }); // Navigation buttons
      const nextButton = screen.getByRole('button', { name: '' });

      await user.click(prevButton);
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('prev');

      await user.click(nextButton);
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('next');
    });

    it('disables navigation buttons when canNavigate is false', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer 
            {...defaultProps} 
            canNavigate={{ prev: false, next: false }} 
          />
        </TestWrapper>
      );

      const buttons = screen.getAllByRole('button');
      const navButtons = buttons.filter(btn => btn.getAttribute('disabled') !== null);
      expect(navButtons).toHaveLength(2); // Both nav buttons should be disabled
    });
  });

  describe('Favorites Functionality', () => {
    it('displays correct favorite button state', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.addToFavorites/i });
      expect(favoriteButton).toBeInTheDocument();
    });

    it('shows different state when document is favorited', () => {
      mockUseFavorites.mockReturnValue({
        isFavorite: true,
        toggleFavorite: vi.fn(),
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.removeFromFavorites/i });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveClass('bg-red-50', 'border-red-200', 'text-red-700');
    });

    it('calls toggleFavorite when favorite button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleFavorite = vi.fn();
      
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: mockToggleFavorite,
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.addToFavorites/i });
      await user.click(favoriteButton);

      expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
    });

    it('shows toast notification when favorite is toggled', async () => {
      const user = userEvent.setup();
      const mockToggleFavorite = vi.fn().mockResolvedValue(undefined);
      
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: mockToggleFavorite,
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.addToFavorites/i });
      await user.click(favoriteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'sop.addToFavorites',
          description: 'sop.addedToFavorites'
        });
      });
    });

    it('shows error toast when favorite toggle fails', async () => {
      const user = userEvent.setup();
      const mockToggleFavorite = vi.fn().mockRejectedValue(new Error('Failed'));
      
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: mockToggleFavorite,
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button', { name: /sop.addToFavorites/i });
      await user.click(favoriteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.error',
          description: 'errors.general',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Document Actions', () => {
    beforeEach(() => {
      // Mock fetch for PDF download
      global.fetch = vi.fn();
    });

    it('handles PDF download successfully', async () => {
      const user = userEvent.setup();
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn().mockReturnValue(mockAnchor);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /sop.downloadPdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/sop/documents/test-doc-id/pdf?language=en`);
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.success',
          description: 'sop.pdfDownloaded'
        });
      });

      // Restore original function
      document.createElement = originalCreateElement;
    });

    it('handles PDF download failure', async () => {
      const user = userEvent.setup();
      
      (global.fetch as any).mockResolvedValue({
        ok: false
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /sop.downloadPdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.error',
          description: 'errors.downloadFailed',
          variant: 'destructive'
        });
      });
    });

    it('handles print action', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const printButton = screen.getByRole('button', { name: /sop.printSop/i });
      await user.click(printButton);

      expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('handles share action with Web Share API', async () => {
      const user = userEvent.setup();
      const mockShare = vi.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const shareButton = screen.getByRole('button', { name: /sop.shareSop/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: 'Test SOP Document',
          text: 'This is a test SOP document content....',
          url: window.location.href
        });
      });
    });

    it('falls back to clipboard when Web Share API fails', async () => {
      const user = userEvent.setup();
      const mockShare = vi.fn().mockRejectedValue(new Error('Share failed'));
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });
      
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const shareButton = screen.getByRole('button', { name: /sop.shareSop/i });
      await user.click(shareButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.success',
          description: 'sop.linkCopied'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('sop.backToCategories')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Main document title
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test SOP Document');
    });

    it('has proper semantic structure for steps', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Step headings should be h4 elements
      const stepHeadings = screen.getAllByRole('heading', { level: 4 });
      expect(stepHeadings).toHaveLength(2);
      expect(stepHeadings[0]).toHaveTextContent('First step action');
      expect(stepHeadings[1]).toHaveTextContent('Second step action');
    });

    it('provides alternative text for images', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'First step action');
    });
  });

  describe('Tablet Optimization', () => {
    it('has appropriate button sizes for touch interaction', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Action buttons should have minimum touch target size
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        const classes = button.className;
        // Should have min-w-[44px] min-h-[44px] classes for touch targets
        expect(classes).toMatch(/min-w-\[44px\]|min-h-\[44px\]|w-10|h-10/);
      });
    });

    it('uses appropriate spacing for tablet interface', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Main container should have tablet-appropriate padding
      const container = screen.getByText('Test SOP Document').closest('div');
      expect(container).toHaveClass('p-4', 'md:p-6');
    });
  });

  describe('French Locale Support', () => {
    it('displays French content when locale is fr', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      expect(screen.getByText('Catégorie Test')).toBeInTheDocument();
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
      expect(screen.getByText('Gestionnaire Dupuis')).toBeInTheDocument();
    });

    it('applies French typography classes', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      // French text should have font-ui class
      const titleElement = screen.getByText('Test SOP Document');
      expect(titleElement).toHaveClass('font-ui');
    });

    it('shows French tags when available', () => {
      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      expect(screen.getByText('tag1 Thai')).toBeInTheDocument();
      expect(screen.getByText('tag2 Thai')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing optional document properties gracefully', () => {
      const minimalDocument = {
        ...mockDocument,
        tags: undefined,
        attachments: [],
        steps: [],
        creator: undefined,
        approver: undefined,
        category: undefined
      };

      mockUseSOPDocument.mockReturnValue({
        data: minimalDocument,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Should still render the basic document info
      expect(screen.getByText('Test SOP Document')).toBeInTheDocument();
      expect(screen.getByText('This is a test SOP document content.')).toBeInTheDocument();
      
      // Should not crash when optional properties are missing
      expect(screen.queryByText('sop.tags')).not.toBeInTheDocument();
      expect(screen.queryByText('sop.attachments')).not.toBeInTheDocument();
      expect(screen.queryByText('sop.steps')).not.toBeInTheDocument();
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <SOPDocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      const downloadButton = screen.getByRole('button', { name: /sop.downloadPdf/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.error',
          description: 'errors.downloadFailed',
          variant: 'destructive'
        });
      });
    });
  });
});