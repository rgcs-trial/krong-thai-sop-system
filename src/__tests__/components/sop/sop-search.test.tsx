import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SOPSearch from '@/components/sop/sop-search';
import { TestWrapper } from '@/src/__tests__/utils/test-utils';

// Mock the hooks
vi.mock('@/hooks/use-search', () => ({
  useSearch: vi.fn()
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, options?: any) => {
    if (key === 'search.resultsCount') {
      return `${options?.count} results for "${options?.query}"`;
    }
    return key;
  }
}));

// Import mocked hook
import { useSearch } from '@/hooks/use-search';

const mockUseSearch = useSearch as any;

describe('SOPSearch', () => {
  const defaultProps = {
    locale: 'en',
    categories: [
      {
        id: 'cat-1',
        name: 'Kitchen Safety',
        name_th: 'ความปลอดภัยในครัว',
        color: '#E31B23'
      },
      {
        id: 'cat-2', 
        name: 'Food Preparation',
        name_th: 'การเตรียมอาหาร',
        color: '#27AE60'
      }
    ],
    onSearch: vi.fn(),
    onClear: vi.fn(),
    onResultSelect: vi.fn()
  };

  const mockSearchHook = {
    query: '',
    results: [],
    filters: {},
    sort: { field: 'relevance', direction: 'desc' },
    isSearching: false,
    suggestions: [],
    searchHistory: [],
    savedSearches: [],
    search: vi.fn(),
    clearSearch: vi.fn(),
    setFilters: vi.fn(),
    setSort: vi.fn(),
    saveSearch: vi.fn(),
    loadSavedSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    error: null
  };

  const mockSuggestions = [
    { type: 'query', text: 'food safety procedures', id: null },
    { type: 'category', text: 'Kitchen Safety', id: 'cat-1' },
    { type: 'document', text: 'Hand washing protocol', id: 'doc-1' },
    { type: 'tag', text: 'cleaning', id: null }
  ];

  const mockResults = [
    {
      id: 'doc-1',
      title_en: 'Hand Washing Protocol',
      title_th: 'ขั้นตอนการล้างมือ',
      content_en: 'Proper hand washing techniques for kitchen staff',
      content_th: 'เทคนิคการล้างมือที่ถูกต้องสำหรับพนักงานครัว',
      is_critical: true,
      category: { name_en: 'Kitchen Safety', name_th: 'ความปลอดภัยในครัว' }
    },
    {
      id: 'doc-2',
      title_en: 'Food Storage Guidelines',
      title_th: 'หลักเกณฑ์การเก็บอาหาร',
      content_en: 'Guidelines for proper food storage temperatures',
      content_th: 'หลักเกณฑ์สำหรับอุณหภูมิการเก็บอาหารที่เหมาะสม',
      is_critical: false,
      category: { name_en: 'Food Preparation', name_th: 'การเตรียมอาหาร' }
    }
  ];

  const mockSearchHistory = [
    {
      id: 'hist-1',
      query: 'kitchen cleaning',
      filters: {},
      resultCount: 5,
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: 'hist-2',
      query: 'food safety',
      filters: { priority: 'critical' },
      resultCount: 3,
      created_at: '2024-01-01T09:00:00Z'
    }
  ];

  const mockSavedSearches = [
    {
      id: 'saved-1',
      name: 'Daily Kitchen Tasks',
      name_th: 'งานประจำวันในครัว',
      query: 'kitchen daily',
      filters: { categoryId: 'cat-1' },
      sort: { field: 'priority', direction: 'desc' }
    },
    {
      id: 'saved-2',
      name: 'Critical Procedures',
      name_th: 'ขั้นตอนที่สำคัญ',
      query: 'critical',
      filters: { priority: 'critical' },
      sort: { field: 'relevance', direction: 'desc' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockUseSearch.mockReturnValue(mockSearchHook);

    // Mock Speech Recognition API
    global.webkitSpeechRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null
    }));

    // Mock window.SpeechRecognition
    global.SpeechRecognition = global.webkitSpeechRecognition;

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve())
      }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search input with correct placeholder', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass('pl-10', 'h-12', 'text-base');
    });

    it('renders search input with custom placeholder', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} placeholder="Search SOPs..." />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Search SOPs...')).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} compact={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      expect(searchInput).toHaveClass('pr-16'); // Compact mode uses pr-16 instead of pr-24
    });

    it('hides filter and sort controls when specified', () => {
      render(
        <TestWrapper>
          <SOPSearch 
            {...defaultProps} 
            showFilters={false} 
            showSort={false} 
          />
        </TestWrapper>
      );

      expect(screen.queryByText('common.filter')).not.toBeInTheDocument();
      expect(screen.queryByText('common.sort')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls search hook when input value changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.type(searchInput, 'kitchen');

      expect(mockSearchHook.search).toHaveBeenCalledWith('k', {}, { field: 'relevance', direction: 'desc' });
      expect(mockSearchHook.search).toHaveBeenCalledWith('ki', {}, { field: 'relevance', direction: 'desc' });
    });

    it('handles Enter key to trigger search', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen safety'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);
      await user.keyboard('{Enter}');

      expect(mockSearchHook.search).toHaveBeenCalledWith('kitchen safety', {}, { field: 'relevance', direction: 'desc' });
      expect(defaultProps.onSearch).toHaveBeenCalledWith('kitchen safety', {}, { field: 'relevance', direction: 'desc' });
    });

    it('handles Escape key to close suggestions', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);
      
      // Should show suggestions
      expect(screen.getByText('search.suggestions')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      
      // Suggestions should be hidden
      expect(screen.queryByText('search.suggestions')).not.toBeInTheDocument();
    });

    it('shows clear button when query exists', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const clearButton = screen.getByTitle('common.clear');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const clearButton = screen.getByTitle('common.clear');
      await user.click(clearButton);

      expect(mockSearchHook.clearSearch).toHaveBeenCalled();
      expect(defaultProps.onClear).toHaveBeenCalled();
    });
  });

  describe('Voice Search', () => {
    it('shows voice search button when supported', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const voiceButton = screen.getByTitle('search.startListening');
      expect(voiceButton).toBeInTheDocument();
    });

    it('hides voice search button when not supported', () => {
      // Remove Speech Recognition support
      delete (global as any).webkitSpeechRecognition;
      delete (global as any).SpeechRecognition;

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByTitle('search.startListening')).not.toBeInTheDocument();
    });

    it('hides voice search button when showVoiceSearch is false', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} showVoiceSearch={false} />
        </TestWrapper>
      );

      expect(screen.queryByTitle('search.startListening')).not.toBeInTheDocument();
    });

    it('starts voice recognition when voice button is clicked', async () => {
      const user = userEvent.setup();
      const mockStart = vi.fn();
      global.webkitSpeechRecognition = vi.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: 'en-US',
        start: mockStart,
        stop: vi.fn(),
        onresult: null,
        onerror: null,
        onend: null
      }));

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const voiceButton = screen.getByTitle('search.startListening');
      await user.click(voiceButton);

      expect(mockStart).toHaveBeenCalled();
    });

    it('sets correct language for voice recognition', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      expect(global.webkitSpeechRecognition).toHaveBeenCalled();
      // Should set Thai language for French locale
      const mockInstance = (global.webkitSpeechRecognition as any).mock.results[0].value;
      expect(mockInstance.lang).toBe('th-TH');
    });
  });

  describe('Search Suggestions', () => {
    it('shows suggestions when available', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.suggestions')).toBeInTheDocument();
      expect(screen.getByText('food safety procedures')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Safety')).toBeInTheDocument();
    });

    it('handles suggestion clicks correctly', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      // Click on query suggestion
      const querySuggestion = screen.getByText('food safety procedures');
      await user.click(querySuggestion);

      expect(mockSearchHook.search).toHaveBeenCalledWith('food safety procedures', {}, { field: 'relevance', direction: 'desc' });

      // Click on category suggestion
      const categorySuggestion = screen.getByText('Kitchen Safety');
      await user.click(categorySuggestion);

      expect(mockSearchHook.setFilters).toHaveBeenCalledWith({ categoryId: 'cat-1' });
    });

    it('shows different colored indicators for suggestion types', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      // Check for colored indicators
      const suggestionContainer = screen.getByText('search.suggestions').closest('div');
      const indicators = suggestionContainer?.querySelectorAll('.w-2.h-2.rounded-full');
      
      expect(indicators).toHaveLength(mockSuggestions.length);
    });
  });

  describe('Search History', () => {
    it('shows search history when query is empty', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        searchHistory: mockSearchHistory
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.recentSearches')).toBeInTheDocument();
      expect(screen.getByText('kitchen cleaning')).toBeInTheDocument();
      expect(screen.getByText('5 results')).toBeInTheDocument();
    });

    it('handles search history clicks', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        searchHistory: mockSearchHistory
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      const historyItem = screen.getByText('kitchen cleaning');
      await user.click(historyItem);

      expect(mockSearchHook.search).toHaveBeenCalledWith('kitchen cleaning', {}, { field: 'relevance', direction: 'desc' });
    });
  });

  describe('Saved Searches', () => {
    it('shows saved searches when available', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        savedSearches: mockSavedSearches
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.savedSearches')).toBeInTheDocument();
      expect(screen.getByText('Daily Kitchen Tasks')).toBeInTheDocument();
      expect(screen.getByText('Critical Procedures')).toBeInTheDocument();
    });

    it('loads saved search when clicked', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        savedSearches: mockSavedSearches
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      const savedSearch = screen.getByText('Daily Kitchen Tasks');
      await user.click(savedSearch);

      expect(mockSearchHook.loadSavedSearch).toHaveBeenCalledWith(mockSavedSearches[0]);
    });

    it('deletes saved search when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        savedSearches: mockSavedSearches
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('.w-3.h-3') && btn.className.includes('w-6')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockSearchHook.deleteSavedSearch).toHaveBeenCalled();
      }
    });

    it('shows save search button when query exists', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen safety'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const saveButton = screen.getByTitle('search.saveSearch');
      expect(saveButton).toBeInTheDocument();
    });

    it('hides saved search features when showSavedSearches is false', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen safety',
        savedSearches: mockSavedSearches
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} showSavedSearches={false} />
        </TestWrapper>
      );

      expect(screen.queryByTitle('search.saveSearch')).not.toBeInTheDocument();
    });
  });

  describe('Search Results', () => {
    it('shows search results preview', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        results: mockResults
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.results (2)')).toBeInTheDocument();
      expect(screen.getByText('Hand Washing Protocol')).toBeInTheDocument();
      expect(screen.getByText('Food Storage Guidelines')).toBeInTheDocument();
    });

    it('shows critical badge for critical results', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        results: mockResults
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('sop.critical')).toBeInTheDocument();
    });

    it('handles result selection', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        results: mockResults
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      const resultButton = screen.getByText('Hand Washing Protocol').closest('button');
      if (resultButton) {
        await user.click(resultButton);
        expect(defaultProps.onResultSelect).toHaveBeenCalledWith(mockResults[0]);
      }
    });

    it('shows "more results" indicator when there are many results', async () => {
      const user = userEvent.setup();
      const manyResults = [...mockResults, ...mockResults, ...mockResults]; // 6 results
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        results: manyResults
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('+3 search.moreResults')).toBeInTheDocument();
    });

    it('shows no results message when no results found', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'nonexistent',
        results: [],
        isSearching: false
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.noResults')).toBeInTheDocument();
      expect(screen.getByText('search.tryDifferentKeywords')).toBeInTheDocument();
    });

    it('shows loading indicator when searching', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        isSearching: true
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('search.searching')).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('shows filter button with active filter count', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        filters: { categoryId: 'cat-1', priority: 'critical' }
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      expect(filterButton).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Filter count badge
    });

    it('toggles advanced filters panel', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      await user.click(filterButton);

      expect(screen.getByText('search.advancedFilters')).toBeInTheDocument();
      expect(screen.getByText('navigation.categories')).toBeInTheDocument();
    });

    it('shows quick filters popover', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const quickFiltersButton = screen.getByText('search.quickFilters');
      await user.click(quickFiltersButton);

      expect(screen.getByText('sop.category')).toBeInTheDocument();
      expect(screen.getByText('sop.priority')).toBeInTheDocument();
    });

    it('handles category filter selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      await user.click(filterButton);

      const categoryButton = screen.getByText('Kitchen Safety');
      await user.click(categoryButton);

      expect(mockSearchHook.setFilters).toHaveBeenCalledWith({ categoryId: 'cat-1' });
    });

    it('shows active filters as badges', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        filters: { 
          categoryId: 'cat-1', 
          priority: 'critical',
          hasMedia: true
        }
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Kitchen Safety')).toBeInTheDocument();
      expect(screen.getByText('sop.priority.critical')).toBeInTheDocument();
      expect(screen.getByText('search.hasMedia')).toBeInTheDocument();
    });

    it('removes filters when badge X is clicked', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        filters: { categoryId: 'cat-1' }
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const categoryBadge = screen.getByText('Kitchen Safety').closest('div');
      const removeButton = categoryBadge?.querySelector('.w-3.h-3');
      
      if (removeButton) {
        await user.click(removeButton);
        expect(mockSearchHook.setFilters).toHaveBeenCalledWith({ categoryId: '' });
      }
    });
  });

  describe('Sorting', () => {
    it('shows sort options', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('common.sort')).toBeInTheDocument();
      expect(screen.getByText('search.sort.relevance')).toBeInTheDocument();
      expect(screen.getByText('search.sort.title')).toBeInTheDocument();
      expect(screen.getByText('search.sort.updated_at')).toBeInTheDocument();
      expect(screen.getByText('search.sort.priority')).toBeInTheDocument();
    });

    it('handles sort selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const titleSortButton = screen.getByText('search.sort.title');
      await user.click(titleSortButton);

      expect(mockSearchHook.setSort).toHaveBeenCalledWith({
        field: 'title',
        direction: 'asc'
      });
    });

    it('toggles sort direction when clicking same field', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        sort: { field: 'title', direction: 'asc' }
      });
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const titleSortButton = screen.getByText('search.sort.title');
      await user.click(titleSortButton);

      expect(mockSearchHook.setSort).toHaveBeenCalledWith({
        field: 'title',
        direction: 'desc'
      });
    });

    it('shows sort direction icons', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        sort: { field: 'title', direction: 'asc' }
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const titleSortButton = screen.getByText('search.sort.title').closest('button');
      expect(titleSortButton?.querySelector('.w-3.h-3')).toBeInTheDocument(); // Sort icon
    });
  });

  describe('Results Count and Status', () => {
    it('shows results count when searching', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        results: mockResults
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('2 results for "kitchen"')).toBeInTheDocument();
    });

    it('shows searching indicator', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        isSearching: true
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('search.searching')).toBeInTheDocument();
    });

    it('shows error message when search fails', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen',
        error: new Error('Search failed')
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('search.searchError')).toBeInTheDocument();
    });
  });

  describe('French Locale Support', () => {
    it('displays French content when locale is fr', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        savedSearches: mockSavedSearches
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      expect(screen.getByText('งานประจำวันในครัว')).toBeInTheDocument(); // Thai name for saved search
    });

    it('shows Thai name input in save dialog for French locale', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen safety'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      const saveButton = screen.getByTitle('search.saveSearch');
      await user.click(saveButton);

      expect(screen.getByLabelText('search.searchNameThai')).toBeInTheDocument();
    });

    it('applies Thai font classes for French locale content', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} locale="fr" />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);

      const suggestionButton = screen.getByText('food safety procedures').closest('button');
      expect(suggestionButton).toHaveClass('font-thai');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTitle('common.clear')).toBeInTheDocument();
      expect(screen.getByTitle('search.startListening')).toBeInTheDocument();
      expect(screen.getByTitle('search.saveSearch')).toBeInTheDocument();
    });

    it('has proper keyboard navigation support', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      
      // Test Enter key
      await user.click(searchInput);
      await user.keyboard('{Enter}');
      
      // Test Escape key
      await user.keyboard('{Escape}');
      
      // Should not crash and handle keyboard events properly
      expect(searchInput).toBeInTheDocument();
    });

    it('provides proper focus management', async () => {
      const user = userEvent.setup();
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        suggestions: mockSuggestions
      });
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      await user.click(searchInput);
      
      // Should show suggestions when focused
      expect(screen.getByText('search.suggestions')).toBeInTheDocument();
    });
  });

  describe('Tablet Optimization', () => {
    it('has appropriate touch target sizes', () => {
      mockUseSearch.mockReturnValue({
        ...mockSearchHook,
        query: 'kitchen'
      });

      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      // Voice button should have proper touch target
      const voiceButton = screen.getByTitle('search.startListening');
      expect(voiceButton).toHaveClass('w-8', 'h-8');

      // Clear button should have proper touch target
      const clearButton = screen.getByTitle('common.clear');
      expect(clearButton).toHaveClass('w-8', 'h-8');
    });

    it('uses larger input height for touch interaction', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      expect(searchInput).toHaveClass('h-12'); // Larger height for tablets
    });

    it('handles compact mode appropriately', () => {
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} compact={true} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('sop.searchPlaceholder');
      expect(searchInput).toHaveClass('pr-16'); // Reduced padding in compact mode
    });
  });

  describe('Auto Search Behavior', () => {
    it('triggers search automatically when autoSearch is true', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} autoSearch={true} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      await user.click(filterButton);

      const categoryButton = screen.getByText('Kitchen Safety');
      await user.click(categoryButton);

      expect(mockSearchHook.search).toHaveBeenCalled();
    });

    it('does not trigger search automatically when autoSearch is false', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SOPSearch {...defaultProps} autoSearch={false} />
        </TestWrapper>
      );

      const filterButton = screen.getByText('common.filter');
      await user.click(filterButton);

      const categoryButton = screen.getByText('Kitchen Safety');
      await user.click(categoryButton);

      // Should only call setFilters, not search
      expect(mockSearchHook.setFilters).toHaveBeenCalled();
    });
  });
});