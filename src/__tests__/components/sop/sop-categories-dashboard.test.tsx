import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SOPCategoriesDashboard } from '@/components/sop/sop-categories-dashboard';
import { TestWrapper } from '@/src/__tests__/utils/test-utils';

// Mock the hooks
vi.mock('@/lib/hooks/use-sop-queries', () => ({
  useCategoriesWithCounts: vi.fn()
}));

vi.mock('@/hooks/use-favorites', () => ({
  useFavorites: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}));

// Mock category icons component
vi.mock('@/components/sop/sop-category-icons', () => ({
  CategoryIconWithBackground: ({ icon, color }: any) => (
    <div data-testid="category-icon" style={{ backgroundColor: color }}>
      {icon}
    </div>
  ),
  getCategoryColor: (category: any) => category.color || '#gray'
}));

// Import mocked hooks
import { useCategoriesWithCounts } from '@/lib/hooks/use-sop-queries';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

const mockUseCategoriesWithCounts = useCategoriesWithCounts as any;
const mockUseFavorites = useFavorites as any;
const mockToast = toast as any;

describe('SOPCategoriesDashboard', () => {
  const defaultProps = {
    locale: 'en',
    onCategorySelect: vi.fn()
  };

  const mockCategories = [
    {
      id: 'cat-1',
      code: 'FOOD_SAFETY',
      name: 'Food Safety',
      name_th: 'ความปลอดภัยอาหาร',
      description: 'Food safety and hygiene procedures',
      description_th: 'ขั้นตอนความปลอดภัยและสุขอนามัยอาหาร',
      icon: 'shield',
      color: '#E31B23',
      sort_order: 1,
      is_active: true,
      sop_count: 12,
      last_updated: '2024-01-25',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-25T00:00:00Z'
    },
    {
      id: 'cat-2',
      code: 'KITCHEN_OPERATIONS',
      name: 'Kitchen Operations',
      name_th: 'การปฏิบัติงานในครัว',
      description: 'Kitchen workflow and cooking procedures',
      description_th: 'ขั้นตอนการทำงานในครัวและการประกอบอาหาร',
      icon: 'chef-hat',
      color: '#D4AF37',
      sort_order: 2,
      is_active: true,
      sop_count: 18,
      last_updated: '2024-01-20',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z'
    },
    {
      id: 'cat-3',
      code: 'SERVICE_STANDARDS',
      name: 'Service Standards',
      name_th: 'มาตรฐานการบริการ',
      description: 'Service quality and guest experience standards',
      description_th: 'มาตรฐานคุณภาพการบริการและประสบการณ์ของแขก',
      icon: 'users',
      color: '#008B8B',
      sort_order: 3,
      is_active: true,
      sop_count: 15,
      last_updated: '2024-01-18',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z'
    }
  ];

  const mockFavoritesHook = {
    isFavorite: false,
    toggleFavorite: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseCategoriesWithCounts.mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    mockUseFavorites.mockReturnValue(mockFavoritesHook);
    mockToast.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading States', () => {
    it('displays loading state when categories are loading', () => {
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('common.loading')).toBeInTheDocument();
    });

    it('displays error state when categories fail to load', () => {
      const error = { message: 'Failed to load categories' };
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('common.error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /common.retry/i })).toBeInTheDocument();
    });

    it('retries loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      const error = { message: 'Failed to load categories' };
      
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: mockRefetch
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /common.retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Categories Display', () => {
    it('renders all categories correctly', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Operations')).toBeInTheDocument();
      expect(screen.getByText('Service Standards')).toBeInTheDocument();
    });

    it('displays category metadata correctly', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Check SOP counts
      expect(screen.getByText('12 sop.procedures')).toBeInTheDocument();
      expect(screen.getByText('18 sop.procedures')).toBeInTheDocument();
      expect(screen.getByText('15 sop.procedures')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Food safety and hygiene procedures')).toBeInTheDocument();
      expect(screen.getByText('Kitchen workflow and cooking procedures')).toBeInTheDocument();
    });

    it('renders category icons with correct colors', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const icons = screen.getAllByTestId('category-icon');
      expect(icons).toHaveLength(3);
      
      expect(icons[0]).toHaveStyle({ backgroundColor: '#E31B23' });
      expect(icons[1]).toHaveStyle({ backgroundColor: '#D4AF37' });
      expect(icons[2]).toHaveStyle({ backgroundColor: '#008B8B' });
    });

    it('displays last updated information', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('2024-01-25')).toBeInTheDocument();
      expect(screen.getByText('2024-01-20')).toBeInTheDocument();
      expect(screen.getByText('2024-01-18')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters categories based on search query', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'Food');

      // Should show only Food Safety category
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.queryByText('Kitchen Operations')).not.toBeInTheDocument();
      expect(screen.queryByText('Service Standards')).not.toBeInTheDocument();
    });

    it('searches in both English and Thai names', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'ความปลอดภัย');

      // Should show Food Safety category (matches Thai name)
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.queryByText('Kitchen Operations')).not.toBeInTheDocument();
    });

    it('searches in descriptions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'hygiene');

      // Should show Food Safety category (matches description)
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.queryByText('Kitchen Operations')).not.toBeInTheDocument();
    });

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('sop.noCategoriesFound')).toBeInTheDocument();
      expect(screen.getByText('sop.tryDifferentSearch')).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'Food');

      // Clear button should appear
      const clearButton = screen.getByLabelText('common.clear');
      await user.click(clearButton);

      // All categories should be visible again
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Operations')).toBeInTheDocument();
      expect(screen.getByText('Service Standards')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('switches between grid and list view', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should start in grid view
      expect(screen.getByRole('tab', { name: /sop.gridView/i })).toHaveAttribute('data-state', 'active');

      // Switch to list view
      const listViewTab = screen.getByRole('tab', { name: /sop.listView/i });
      await user.click(listViewTab);

      expect(listViewTab).toHaveAttribute('data-state', 'active');
    });

    it('displays categories differently in grid vs list view', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Grid view should use card layout
      let categoryCards = screen.getAllByRole('button');
      expect(categoryCards[0]).toHaveClass('hover:shadow-lg'); // Grid view styling

      // Switch to list view
      const listViewTab = screen.getByRole('tab', { name: /sop.listView/i });
      await user.click(listViewTab);

      // List view should have different styling
      categoryCards = screen.getAllByRole('button');
      expect(categoryCards[0]).toHaveClass('border-l-4'); // List view styling
    });
  });

  describe('Sorting and Filtering', () => {
    it('sorts categories by name', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const sortButton = screen.getByText('sop.sortBy');
      await user.click(sortButton);

      const sortByName = screen.getByText('sop.sortByName');
      await user.click(sortByName);

      // Categories should be sorted alphabetically
      const categoryElements = screen.getAllByText(/Food Safety|Kitchen Operations|Service Standards/);
      expect(categoryElements[0]).toHaveTextContent('Food Safety');
      expect(categoryElements[1]).toHaveTextContent('Kitchen Operations');
      expect(categoryElements[2]).toHaveTextContent('Service Standards');
    });

    it('sorts categories by SOP count', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const sortButton = screen.getByText('sop.sortBy');
      await user.click(sortButton);

      const sortByCount = screen.getByText('sop.sortByCount');
      await user.click(sortByCount);

      // Categories should be sorted by SOP count (descending)
      const categoryElements = screen.getAllByText(/Food Safety|Kitchen Operations|Service Standards/);
      expect(categoryElements[0]).toHaveTextContent('Kitchen Operations'); // 18 SOPs
      expect(categoryElements[1]).toHaveTextContent('Service Standards'); // 15 SOPs
      expect(categoryElements[2]).toHaveTextContent('Food Safety'); // 12 SOPs
    });

    it('filters categories by favorites', async () => {
      const user = userEvent.setup();
      
      // Mock one category as favorite
      const mockFavoriteCategories = mockCategories.map((cat, index) => ({
        ...cat,
        is_favorite: index === 0 // First category is favorite
      }));

      mockUseCategoriesWithCounts.mockReturnValue({
        data: mockFavoriteCategories,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      await user.click(filterButton);

      const favoritesFilter = screen.getByText('sop.showFavoritesOnly');
      await user.click(favoritesFilter);

      // Should show only favorite category
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.queryByText('Kitchen Operations')).not.toBeInTheDocument();
      expect(screen.queryByText('Service Standards')).not.toBeInTheDocument();
    });
  });

  describe('Category Interactions', () => {
    it('calls onCategorySelect when category is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const foodSafetyButton = screen.getByText('Food Safety').closest('button');
      if (foodSafetyButton) {
        await user.click(foodSafetyButton);
        expect(defaultProps.onCategorySelect).toHaveBeenCalledWith(mockCategories[0]);
      }
    });

    it('handles favorite toggle', async () => {
      const user = userEvent.setup();
      const mockToggleFavorite = vi.fn();
      
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: mockToggleFavorite,
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Find and click favorite button (star icon)
      const favoriteButtons = screen.getAllByTestId('favorite-button');
      await user.click(favoriteButtons[0]);

      expect(mockToggleFavorite).toHaveBeenCalled();
    });

    it('shows different favorite icon states', () => {
      // Test unfavorited state
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: vi.fn(),
        isLoading: false
      });

      const { rerender } = render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      let favoriteIcons = screen.getAllByTestId('favorite-button');
      expect(favoriteIcons[0]).not.toHaveClass('text-yellow-500'); // Unfavorited

      // Test favorited state
      mockUseFavorites.mockReturnValue({
        isFavorite: true,
        toggleFavorite: vi.fn(),
        isLoading: false
      });

      rerender(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      favoriteIcons = screen.getAllByTestId('favorite-button');
      expect(favoriteIcons[0]).toHaveClass('text-yellow-500'); // Favorited
    });

    it('disables favorite button when loading', () => {
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: vi.fn(),
        isLoading: true
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      expect(favoriteButtons[0]).toBeDisabled();
    });
  });

  describe('French Locale Support', () => {
    it('displays Thai content when locale is fr', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      expect(screen.getByText('ความปลอดภัยอาหาร')).toBeInTheDocument();
      expect(screen.getByText('การปฏิบัติงานในครัว')).toBeInTheDocument();
      expect(screen.getByText('มาตรฐานการบริการ')).toBeInTheDocument();
    });

    it('searches Thai content correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchCategories');
      await user.type(searchInput, 'ความปลอดภัย');

      // Should show only the matching category
      expect(screen.getByText('ความปลอดภัยอาหาร')).toBeInTheDocument();
      expect(screen.queryByText('การปฏิบัติงานในครัว')).not.toBeInTheDocument();
    });

    it('applies Thai typography classes', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      const thaiText = screen.getByText('ความปลอดภัยอาหาร');
      expect(thaiText).toHaveClass('font-thai');
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no categories exist', () => {
      mockUseCategoriesWithCounts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('sop.noCategoriesAvailable')).toBeInTheDocument();
      expect(screen.getByText('sop.contactAdministrator')).toBeInTheDocument();
    });

    it('falls back to mock data when API fails', () => {
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'API failed' },
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should show mock categories as fallback
      expect(screen.getByText('Food Safety')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Operations')).toBeInTheDocument();
    });
  });

  describe('Performance and UX', () => {
    it('shows skeleton loading for better UX', () => {
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should show skeleton cards
      const skeletonCards = screen.getAllByTestId('category-skeleton');
      expect(skeletonCards).toHaveLength(6); // Default skeleton count
    });

    it('implements proper hover states for touch devices', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        expect(button).toHaveClass('hover:shadow-lg'); // Hover effects
      });
    });

    it('uses proper touch target sizes', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      favoriteButtons.forEach(button => {
        expect(button).toHaveClass('w-8', 'h-8'); // Minimum touch target size
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Search input should have proper labeling
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('placeholder', 'sop.searchCategories');

      // Category buttons should be properly labeled
      const categoryButtons = screen.getAllByRole('button');
      expect(categoryButtons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const firstCategoryButton = screen.getAllByRole('button')[0];
      await user.tab();
      
      // Should be able to navigate to category buttons
      expect(document.activeElement).toBe(firstCategoryButton);
    });

    it('provides proper heading structure', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should have main heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('sop.categoriesTitle');
    });

    it('has descriptive button labels for screen readers', () => {
      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      expect(favoriteButtons[0]).toHaveAttribute('aria-label');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      const networkError = { message: 'Network error', code: 'NETWORK_ERROR' };
      mockUseCategoriesWithCounts.mockReturnValue({
        data: null,
        isLoading: false,
        error: networkError,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /common.retry/i })).toBeInTheDocument();
    });

    it('handles favorite toggle errors', async () => {
      const user = userEvent.setup();
      const mockToggleFavorite = vi.fn().mockRejectedValue(new Error('Favorite failed'));
      
      mockUseFavorites.mockReturnValue({
        isFavorite: false,
        toggleFavorite: mockToggleFavorite,
        isLoading: false
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      await user.click(favoriteButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'common.error',
          description: 'errors.favoriteToggleFailed',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should use responsive grid classes
      const gridContainer = screen.getByTestId('categories-grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('adapts layout for tablet screens', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(
        <TestWrapper>
          <SOPCategoriesDashboard {...defaultProps} />
        </TestWrapper>
      );

      // Should use appropriate spacing and sizing for tablets
      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        expect(button).toHaveClass('min-h-[120px]'); // Tablet-appropriate height
      });
    });
  });
});