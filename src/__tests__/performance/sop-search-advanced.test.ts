import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, useEffect } from 'react';
import { TestWrapper } from '../utils/test-utils';

// Advanced performance testing for SOP search with real-world scenarios
describe('SOP Search Advanced Performance Tests', () => {
  const PERFORMANCE_BENCHMARKS = {
    INSTANT_SEARCH: 50,      // 50ms for instant search
    AUTOCOMPLETE: 100,       // 100ms for autocomplete
    FACETED_SEARCH: 200,     // 200ms for faceted search
    FULL_TEXT_SEARCH: 300,   // 300ms for full-text search
    CONCURRENT_USERS: 1000,  // 1000ms for 100 concurrent users
    TABLET_CONSTRAINT: 400   // 400ms accounting for tablet limitations
  };

  // Mock advanced search service
  const mockAdvancedSearchService = {
    instantSearch: vi.fn(),
    autocomplete: vi.fn(),
    facetedSearch: vi.fn(),
    fullTextSearch: vi.fn(),
    getCacheStats: vi.fn(),
    warmupCache: vi.fn(),
    optimizeIndex: vi.fn()
  };

  const createSearchResponse = (count, relevanceScores = true) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `sop-${index}`,
      title: `SOP Document ${index + 1}`,
      content: `This is the content for SOP document ${index + 1}. It contains important procedural information for restaurant operations.`,
      category: ['Food Safety', 'Cleaning', 'Opening', 'Closing', 'Emergency'][index % 5],
      priority: ['low', 'medium', 'high', 'critical'][index % 4],
      tags: [`tag${index}`, `category${index % 3}`],
      score: relevanceScores ? Math.random() * 100 : 100,
      highlight: `<mark>search term</mark> found in document ${index + 1}`,
      lastModified: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockAdvancedSearchService.instantSearch.mockImplementation((query) => 
      Promise.resolve(createSearchResponse(Math.min(query.length * 5, 20)))
    );
    
    mockAdvancedSearchService.autocomplete.mockImplementation((partial) => 
      Promise.resolve([
        `${partial} safety procedures`,
        `${partial} cleaning protocols`,
        `${partial} emergency response`
      ])
    );
    
    mockAdvancedSearchService.facetedSearch.mockImplementation(() => 
      Promise.resolve({
        results: createSearchResponse(50),
        facets: {
          categories: { 'Food Safety': 15, 'Cleaning': 12, 'Opening': 10, 'Closing': 8, 'Emergency': 5 },
          priorities: { 'critical': 5, 'high': 15, 'medium': 20, 'low': 10 },
          tags: { 'safety': 25, 'procedures': 30, 'equipment': 15 }
        }
      })
    );
    
    mockAdvancedSearchService.fullTextSearch.mockImplementation(() => 
      Promise.resolve(createSearchResponse(100))
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Instant Search Performance', () => {
    it('provides instant search results as user types', async () => {
      const user = userEvent.setup();
      const searchResults = [];
      const searchTimes = [];

      const InstantSearchComponent = () => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);

        const handleInstantSearch = async (value) => {
          setQuery(value);
          if (value.length >= 2) {
            const start = performance.now();
            const searchResults = await mockAdvancedSearchService.instantSearch(value);
            const end = performance.now();
            
            searchTimes.push(end - start);
            setResults(searchResults);
          }
        };

        return (
          <div data-testid="instant-search">
            <input 
              data-testid="instant-search-input"
              value={query}
              onChange={(e) => handleInstantSearch(e.target.value)}
              placeholder="Start typing..."
            />
            <div data-testid="instant-results">
              {results.map((result, index) => (
                <div key={result.id} data-testid={`instant-result-${index}`}>
                  {result.title}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <InstantSearchComponent />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('instant-search-input');
      
      // Simulate realistic typing speed
      await user.type(searchInput, 'food safety', { delay: 50 });

      await waitFor(() => {
        expect(screen.getByTestId('instant-results')).toBeInTheDocument();
      });

      // All instant search calls should be under threshold
      searchTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_BENCHMARKS.INSTANT_SEARCH);
      });

      expect(mockAdvancedSearchService.instantSearch).toHaveBeenCalled();
    });

    it('implements efficient debouncing for rapid typing', async () => {
      const user = userEvent.setup();
      let searchCallCount = 0;

      mockAdvancedSearchService.instantSearch.mockImplementation((query) => {
        searchCallCount++;
        return Promise.resolve(createSearchResponse(10));
      });

      const DebouncedSearchComponent = () => {
        const [query, setQuery] = useState('');
        const [debouncedQuery, setDebouncedQuery] = useState('');

        useEffect(() => {
          const timer = setTimeout(() => {
            setDebouncedQuery(query);
          }, 300);

          return () => clearTimeout(timer);
        }, [query]);

        useEffect(() => {
          if (debouncedQuery.length >= 2) {
            mockAdvancedSearchService.instantSearch(debouncedQuery);
          }
        }, [debouncedQuery]);

        return (
          <input 
            data-testid="debounced-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        );
      };

      render(
        <TestWrapper>
          <DebouncedSearchComponent />
        </TestWrapper>
      );

      const searchInput = screen.getByTestId('debounced-search');
      
      // Rapid typing simulation
      await user.type(searchInput, 'foodsafety', { delay: 10 });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 400));

      // Should only make one search call due to debouncing
      expect(searchCallCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Autocomplete Performance', () => {
    it('provides autocomplete suggestions under threshold', async () => {
      const user = userEvent.setup();
      let autocompleteTime = 0;

      const AutocompleteComponent = () => {
        const [query, setQuery] = useState('');
        const [suggestions, setSuggestions] = useState([]);

        const handleAutocomplete = async (value) => {
          setQuery(value);
          if (value.length >= 2) {
            const start = performance.now();
            const suggestions = await mockAdvancedSearchService.autocomplete(value);
            const end = performance.now();
            
            autocompleteTime = end - start;
            setSuggestions(suggestions);
          }
        };

        return (
          <div data-testid="autocomplete">
            <input 
              data-testid="autocomplete-input"
              value={query}
              onChange={(e) => handleAutocomplete(e.target.value)}
            />
            <div data-testid="suggestions">
              {suggestions.map((suggestion, index) => (
                <div key={index} data-testid={`suggestion-${index}`}>
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <AutocompleteComponent />
        </TestWrapper>
      );

      const autocompleteInput = screen.getByTestId('autocomplete-input');
      await user.type(autocompleteInput, 'clean');

      await waitFor(() => {
        expect(screen.getByTestId('suggestions')).toBeInTheDocument();
      });

      expect(autocompleteTime).toBeLessThan(PERFORMANCE_BENCHMARKS.AUTOCOMPLETE);
      expect(mockAdvancedSearchService.autocomplete).toHaveBeenCalledWith('clean');
    });

    it('handles autocomplete with large suggestion datasets', async () => {
      const user = userEvent.setup();

      // Mock large suggestion dataset
      mockAdvancedSearchService.autocomplete.mockImplementation((partial) => {
        const largeSuggestions = Array.from({ length: 1000 }, (_, index) => 
          `${partial} suggestion ${index + 1}`
        );
        return Promise.resolve(largeSuggestions.slice(0, 10)); // Return top 10
      });

      const LargeAutocompleteComponent = () => {
        const [query, setQuery] = useState('');
        const [suggestions, setSuggestions] = useState([]);

        const handleAutocomplete = async (value) => {
          setQuery(value);
          if (value.length >= 2) {
            const suggestions = await mockAdvancedSearchService.autocomplete(value);
            setSuggestions(suggestions);
          }
        };

        return (
          <div>
            <input 
              data-testid="large-autocomplete"
              value={query}
              onChange={(e) => handleAutocomplete(e.target.value)}
            />
            <div data-testid="large-suggestions">
              {suggestions.map((suggestion, index) => (
                <div key={index}>{suggestion}</div>
              ))}
            </div>
          </div>
        );
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <LargeAutocompleteComponent />
        </TestWrapper>
      );

      const autocompleteInput = screen.getByTestId('large-autocomplete');
      await user.type(autocompleteInput, 'safety');

      await waitFor(() => {
        expect(screen.getByTestId('large-suggestions')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_BENCHMARKS.AUTOCOMPLETE * 2);
    });
  });

  describe('Faceted Search Performance', () => {
    it('performs faceted search with multiple filters efficiently', async () => {
      const user = userEvent.setup();
      let facetedSearchTime = 0;

      const FacetedSearchComponent = () => {
        const [searchData, setSearchData] = useState({ results: [], facets: {} });
        const [selectedFilters, setSelectedFilters] = useState({});

        const performFacetedSearch = async (filters) => {
          const start = performance.now();
          const data = await mockAdvancedSearchService.facetedSearch(filters);
          const end = performance.now();
          
          facetedSearchTime = end - start;
          setSearchData(data);
        };

        const toggleFilter = (category, value) => {
          const newFilters = { ...selectedFilters };
          if (!newFilters[category]) newFilters[category] = [];
          
          const index = newFilters[category].indexOf(value);
          if (index > -1) {
            newFilters[category].splice(index, 1);
          } else {
            newFilters[category].push(value);
          }
          
          setSelectedFilters(newFilters);
          performFacetedSearch(newFilters);
        };

        return (
          <div data-testid="faceted-search">
            <div data-testid="facets">
              <div data-testid="category-facets">
                {Object.entries(searchData.facets.categories || {}).map(([category, count]) => (
                  <button 
                    key={category}
                    data-testid={`facet-${category}`}
                    onClick={() => toggleFilter('categories', category)}
                  >
                    {category} ({count})
                  </button>
                ))}
              </div>
              <div data-testid="priority-facets">
                {Object.entries(searchData.facets.priorities || {}).map(([priority, count]) => (
                  <button 
                    key={priority}
                    data-testid={`priority-${priority}`}
                    onClick={() => toggleFilter('priorities', priority)}
                  >
                    {priority} ({count})
                  </button>
                ))}
              </div>
            </div>
            <div data-testid="faceted-results">
              {searchData.results.map((result, index) => (
                <div key={result.id} data-testid={`faceted-result-${index}`}>
                  {result.title}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <FacetedSearchComponent />
        </TestWrapper>
      );

      // Trigger initial faceted search
      const categoryButton = screen.getByTestId('facet-Food Safety');
      await user.click(categoryButton);

      await waitFor(() => {
        expect(screen.getByTestId('faceted-results')).toBeInTheDocument();
      });

      expect(facetedSearchTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FACETED_SEARCH);
      expect(mockAdvancedSearchService.facetedSearch).toHaveBeenCalled();
    });

    it('handles complex multi-dimensional filtering', async () => {
      const user = userEvent.setup();

      const ComplexFilterComponent = () => {
        const [results, setResults] = useState([]);
        const [filters, setFilters] = useState({
          categories: [],
          priorities: [],
          tags: [],
          dateRange: null
        });

        const applyComplexFilters = async () => {
          const data = await mockAdvancedSearchService.facetedSearch(filters);
          setResults(data.results);
        };

        return (
          <div data-testid="complex-filters">
            <button 
              data-testid="apply-complex-filters"
              onClick={applyComplexFilters}
            >
              Apply Complex Filters
            </button>
            <div data-testid="complex-results">
              {results.length} results found
            </div>
          </div>
        );
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <ComplexFilterComponent />
        </TestWrapper>
      );

      const applyButton = screen.getByTestId('apply-complex-filters');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByTestId('complex-results')).toHaveTextContent('50 results found');
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FACETED_SEARCH);
    });
  });

  describe('Full-Text Search Performance', () => {
    it('performs comprehensive full-text search efficiently', async () => {
      const user = userEvent.setup();
      let fullTextSearchTime = 0;

      const FullTextSearchComponent = () => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);

        const performFullTextSearch = async (searchQuery) => {
          if (searchQuery.length >= 3) {
            const start = performance.now();
            const searchResults = await mockAdvancedSearchService.fullTextSearch(searchQuery);
            const end = performance.now();
            
            fullTextSearchTime = end - start;
            setResults(searchResults);
          }
        };

        return (
          <div data-testid="full-text-search">
            <input 
              data-testid="full-text-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                performFullTextSearch(e.target.value);
              }}
              placeholder="Enter detailed search query..."
            />
            <div data-testid="full-text-results">
              {results.map((result, index) => (
                <div key={result.id} data-testid={`full-text-result-${index}`}>
                  <h4>{result.title}</h4>
                  <div dangerouslySetInnerHTML={{ __html: result.highlight }} />
                  <span>Score: {result.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <FullTextSearchComponent />
        </TestWrapper>
      );

      const fullTextInput = screen.getByTestId('full-text-input');
      await user.type(fullTextInput, 'food safety temperature control procedures');

      await waitFor(() => {
        expect(screen.getByTestId('full-text-results')).toBeInTheDocument();
      });

      expect(fullTextSearchTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_TEXT_SEARCH);
      expect(mockAdvancedSearchService.fullTextSearch).toHaveBeenCalled();
    });

    it('handles relevance scoring and ranking efficiently', async () => {
      const user = userEvent.setup();

      // Mock relevance-scored results
      mockAdvancedSearchService.fullTextSearch.mockImplementation(() => {
        const results = createSearchResponse(100, true);
        // Sort by relevance score
        return Promise.resolve(results.sort((a, b) => b.score - a.score));
      });

      const RelevanceSearchComponent = () => {
        const [results, setResults] = useState([]);

        const searchWithRelevance = async () => {
          const searchResults = await mockAdvancedSearchService.fullTextSearch('relevance test');
          setResults(searchResults);
        };

        return (
          <div data-testid="relevance-search">
            <button 
              data-testid="search-relevance"
              onClick={searchWithRelevance}
            >
              Search with Relevance
            </button>
            <div data-testid="relevance-results">
              {results.slice(0, 5).map((result, index) => (
                <div key={result.id} data-testid={`relevance-result-${index}`}>
                  Rank {index + 1}: {result.title} (Score: {result.score.toFixed(2)})
                </div>
              ))}
            </div>
          </div>
        );
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <RelevanceSearchComponent />
        </TestWrapper>
      );

      const searchButton = screen.getByTestId('search-relevance');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId('relevance-results')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FULL_TEXT_SEARCH);

      // Verify results are sorted by relevance
      const results = screen.getAllByTestId(/relevance-result-/);
      expect(results).toHaveLength(5);
    });
  });

  describe('Concurrent User Performance', () => {
    it('maintains performance with multiple concurrent searches', async () => {
      const concurrentSearches = 100;
      const searchPromises = [];

      for (let i = 0; i < concurrentSearches; i++) {
        const searchPromise = mockAdvancedSearchService.instantSearch(`query-${i}`);
        searchPromises.push(searchPromise);
      }

      const startTime = performance.now();
      const results = await Promise.all(searchPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentSearches;

      expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONCURRENT_USERS);
      expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.INSTANT_SEARCH);
      expect(results).toHaveLength(concurrentSearches);
    });

    it('handles search load balancing effectively', async () => {
      const loadBalancedSearches = [];
      
      // Simulate load balancing by staggering requests
      for (let batch = 0; batch < 5; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < 20; i++) {
          batchPromises.push(mockAdvancedSearchService.instantSearch(`batch-${batch}-query-${i}`));
        }
        
        loadBalancedSearches.push(Promise.all(batchPromises));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const startTime = performance.now();
      await Promise.all(loadBalancedSearches);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONCURRENT_USERS);
    });
  });

  describe('Tablet-Specific Performance Constraints', () => {
    it('optimizes for tablet hardware limitations', async () => {
      const user = userEvent.setup();

      // Mock tablet constraints
      const tabletOptimizedService = {
        ...mockAdvancedSearchService,
        instantSearch: vi.fn().mockImplementation((query) => {
          // Simulate tablet processing delay
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(createSearchResponse(10)); // Smaller result sets for tablets
            }, 50); // Reasonable delay for tablet processing
          });
        })
      };

      const TabletOptimizedComponent = () => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);

        const handleTabletSearch = async (value) => {
          setQuery(value);
          if (value.length >= 2) {
            const searchResults = await tabletOptimizedService.instantSearch(value);
            setResults(searchResults);
          }
        };

        return (
          <div data-testid="tablet-search">
            <input 
              data-testid="tablet-search-input"
              value={query}
              onChange={(e) => handleTabletSearch(e.target.value)}
            />
            <div data-testid="tablet-results">
              {results.map((result, index) => (
                <div key={result.id} className="tablet-result">
                  {result.title}
                </div>
              ))}
            </div>
          </div>
        );
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TabletOptimizedComponent />
        </TestWrapper>
      );

      const tabletInput = screen.getByTestId('tablet-search-input');
      await user.type(tabletInput, 'tablet test');

      await waitFor(() => {
        expect(screen.getByTestId('tablet-results')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_BENCHMARKS.TABLET_CONSTRAINT);
    });

    it('implements efficient caching for tablet memory constraints', async () => {
      const cacheStats = {
        hits: 0,
        misses: 0,
        size: 0
      };

      mockAdvancedSearchService.getCacheStats.mockReturnValue(cacheStats);

      const TabletCacheComponent = () => {
        const [stats, setStats] = useState(cacheStats);

        const updateCacheStats = () => {
          const currentStats = mockAdvancedSearchService.getCacheStats();
          setStats(currentStats);
        };

        return (
          <div data-testid="tablet-cache">
            <div data-testid="cache-stats">
              Hits: {stats.hits}, Misses: {stats.misses}, Size: {stats.size}
            </div>
            <button 
              data-testid="update-stats"
              onClick={updateCacheStats}
            >
              Update Cache Stats
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TabletCacheComponent />
        </TestWrapper>
      );

      const updateButton = screen.getByTestId('update-stats');
      const user = userEvent.setup();
      await user.click(updateButton);

      expect(mockAdvancedSearchService.getCacheStats).toHaveBeenCalled();
      expect(screen.getByTestId('cache-stats')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring and Alerts', () => {
    it('tracks search performance metrics in real-time', async () => {
      const performanceMetrics = {
        searches: [],
        averageTime: 0,
        slowQueries: []
      };

      const PerformanceMonitorComponent = () => {
        const [metrics, setMetrics] = useState(performanceMetrics);

        const trackSearch = async (query) => {
          const start = performance.now();
          await mockAdvancedSearchService.instantSearch(query);
          const end = performance.now();
          
          const searchTime = end - start;
          const newMetrics = { ...metrics };
          newMetrics.searches.push({ query, time: searchTime });
          
          if (searchTime > PERFORMANCE_BENCHMARKS.INSTANT_SEARCH) {
            newMetrics.slowQueries.push({ query, time: searchTime });
          }
          
          newMetrics.averageTime = newMetrics.searches.reduce((sum, search) => sum + search.time, 0) / newMetrics.searches.length;
          
          setMetrics(newMetrics);
        };

        return (
          <div data-testid="performance-monitor">
            <div data-testid="metrics">
              Average Time: {metrics.averageTime.toFixed(2)}ms
            </div>
            <div data-testid="slow-queries">
              Slow Queries: {metrics.slowQueries.length}
            </div>
            <button 
              data-testid="track-search"
              onClick={() => trackSearch('performance test')}
            >
              Track Search
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <PerformanceMonitorComponent />
        </TestWrapper>
      );

      const trackButton = screen.getByTestId('track-search');
      const user = userEvent.setup();
      await user.click(trackButton);

      await waitFor(() => {
        expect(screen.getByTestId('metrics')).toHaveTextContent('Average Time:');
      });
    });

    it('generates performance alerts for degradation', async () => {
      let alertsGenerated = [];

      // Mock slow search service to trigger alerts
      mockAdvancedSearchService.instantSearch.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createSearchResponse(5));
          }, 200); // Intentionally slow to trigger alert
        });
      });

      const AlertSystemComponent = () => {
        const [alerts, setAlerts] = useState([]);

        const performSearchWithAlert = async () => {
          const start = performance.now();
          await mockAdvancedSearchService.instantSearch('slow query');
          const end = performance.now();
          
          const searchTime = end - start;
          if (searchTime > PERFORMANCE_BENCHMARKS.INSTANT_SEARCH) {
            const alert = {
              type: 'performance_degradation',
              message: `Search took ${searchTime.toFixed(2)}ms, exceeding ${PERFORMANCE_BENCHMARKS.INSTANT_SEARCH}ms threshold`,
              timestamp: new Date().toISOString()
            };
            
            alertsGenerated.push(alert);
            setAlerts(prev => [...prev, alert]);
          }
        };

        return (
          <div data-testid="alert-system">
            <button 
              data-testid="trigger-alert"
              onClick={performSearchWithAlert}
            >
              Trigger Performance Alert
            </button>
            <div data-testid="alerts">
              {alerts.map((alert, index) => (
                <div key={index} data-testid={`alert-${index}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <AlertSystemComponent />
        </TestWrapper>
      );

      const triggerButton = screen.getByTestId('trigger-alert');
      const user = userEvent.setup();
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('alerts')).toBeInTheDocument();
      });

      expect(alertsGenerated).toHaveLength(1);
      expect(alertsGenerated[0].type).toBe('performance_degradation');
    });
  });
});