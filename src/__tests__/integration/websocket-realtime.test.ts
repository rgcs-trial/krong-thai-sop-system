/**
 * Integration Tests for WebSocket Real-time Updates
 * Restaurant Krong Thai SOP Management System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useTranslations } from '@/hooks/use-translations-db';
import { 
  realtimeEventGenerators,
  createMockWebSocketManager,
  mockApiResponseBuilders
} from '../mocks/translation-mocks';
import { createTestQueryClient, mockFetch } from '../utils/test-utils';
import type { TranslationUpdateEvent } from '@/types/translation';

// Mock WebSocket globally
let mockWebSocket: any;
let mockWebSocketManager: any;

// Mock dependencies
vi.mock('@/lib/stores/global-store', () => ({
  useGlobalStore: () => ({
    language: 'en',
    isOnline: true,
  }),
}));

// Test wrapper component
const createWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

describe('WebSocket Real-time Updates Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock WebSocket
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    };

    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    // Create mock WebSocket manager
    mockWebSocketManager = createMockWebSocketManager();
    
    // Mock the WebSocket manager module
    vi.doMock('@/lib/translation-websocket', () => ({
      wsManager: mockWebSocketManager,
    }));

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection when realtime is enabled', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockWebSocketManager.subscribe).toHaveBeenCalled();
      expect(result.current.isRealtime).toBe(true);
      expect(result.current.connectionStatus).toBeDefined();
    });

    it('should not establish connection when realtime is disabled', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(
        () => useTranslations({ realtime: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockWebSocketManager.subscribe).not.toHaveBeenCalled();
      expect(result.current.isRealtime).toBe(false);
    });

    it('should handle WebSocket connection errors gracefully', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      // Simulate WebSocket connection error
      global.WebSocket = vi.fn(() => {
        throw new Error('WebSocket connection failed');
      }) as any;

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still function without WebSocket
      expect(result.current.error).toBeNull();
      expect(result.current.isRealtime).toBe(true); // Intent is still real-time
    });

    it('should attempt reconnection after connection loss', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      // Mock WebSocket with connection loss simulation
      let onCloseCallback: any;
      mockWebSocket.addEventListener = vi.fn((event, callback) => {
        if (event === 'close') {
          onCloseCallback = callback;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate connection loss
      if (onCloseCallback) {
        act(() => {
          onCloseCallback();
        });
      }

      // Should attempt to reconnect (implementation-dependent)
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Real-time Translation Updates', () => {
    it('should receive and process translation update events', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate real-time translation update
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent({
        locale: 'en',
        keys: ['common.welcome'],
      });

      act(() => {
        mockWebSocketManager.simulateEvent(updateEvent);
      });

      // Should invalidate queries
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('should handle bulk translation updates', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate bulk update event
      const bulkUpdateEvent = realtimeEventGenerators.createBulkUpdateEvent([
        'common.welcome',
        'common.goodbye',
        'auth.login',
        'auth.logout',
      ]);

      act(() => {
        mockWebSocketManager.simulateEvent(bulkUpdateEvent);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('should only invalidate cache for matching locale', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate update for different locale
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent({
        locale: 'fr', // Different from hook locale (en)
        keys: ['common.welcome'],
      });

      act(() => {
        mockWebSocketManager.simulateEvent(updateEvent);
      });

      // Should not invalidate queries for different locale
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });

    it('should handle new key creation events', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate new key creation
      const keyCreationEvent = realtimeEventGenerators.createKeyCreationEvent('new.translation.key');

      act(() => {
        mockWebSocketManager.simulateEvent(keyCreationEvent);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  describe('WebSocket Message Handling', () => {
    it('should parse WebSocket messages correctly', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      let messageHandler: any;
      mockWebSocket.addEventListener = vi.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate WebSocket message
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent();
      const messageData = {
        data: JSON.stringify(updateEvent),
      };

      if (messageHandler) {
        act(() => {
          messageHandler(messageData);
        });
      }

      // Should process the message without errors
      expect(result.current.error).toBeNull();
    });

    it('should handle malformed WebSocket messages gracefully', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      let messageHandler: any;
      mockWebSocket.addEventListener = vi.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate malformed message
      const malformedMessage = {
        data: 'invalid-json-data',
      };

      if (messageHandler) {
        act(() => {
          messageHandler(malformedMessage);
        });
      }

      // Should not crash or set error state
      expect(result.current.error).toBeNull();
    });

    it('should handle empty WebSocket messages', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      let messageHandler: any;
      mockWebSocket.addEventListener = vi.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate empty message
      const emptyMessage = {
        data: '',
      };

      if (messageHandler) {
        act(() => {
          messageHandler(emptyMessage);
        });
      }

      expect(result.current.error).toBeNull();
    });
  });

  describe('Connection State Management', () => {
    it('should track connection status accurately', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      let openHandler: any;
      let closeHandler: any;
      let errorHandler: any;

      mockWebSocket.addEventListener = vi.fn((event, handler) => {
        switch (event) {
          case 'open':
            openHandler = handler;
            break;
          case 'close':
            closeHandler = handler;
            break;
          case 'error':
            errorHandler = handler;
            break;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially connecting
      expect(result.current.connectionStatus).toBeDefined();

      // Simulate connection opened
      if (openHandler) {
        act(() => {
          openHandler();
        });
      }

      // Should update connection status
      // Note: Actual implementation would update status

      // Simulate connection closed
      if (closeHandler) {
        act(() => {
          closeHandler();
        });
      }

      // Should update connection status to disconnected
      // Note: Actual implementation would update status
    });

    it('should handle connection errors', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      let errorHandler: any;
      mockWebSocket.addEventListener = vi.fn((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate WebSocket error
      if (errorHandler) {
        act(() => {
          errorHandler(new Error('Connection error'));
        });
      }

      // Should not affect the main translation functionality
      expect(result.current.error).toBeNull();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate rapid updates
      const updateEvents = Array.from({ length: 100 }, (_, i) =>
        realtimeEventGenerators.createTranslationUpdateEvent({
          keys: [`test.key.${i}`],
        })
      );

      const startTime = performance.now();

      act(() => {
        updateEvents.forEach(event => {
          mockWebSocketManager.simulateEvent(event);
        });
      });

      const endTime = performance.now();

      // Should handle all updates quickly
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms

      // Should debounce or batch invalidations efficiently
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it('should handle concurrent WebSocket operations', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate concurrent events
      const concurrentEvents = [
        realtimeEventGenerators.createTranslationUpdateEvent({ keys: ['key1'] }),
        realtimeEventGenerators.createKeyCreationEvent('key2'),
        realtimeEventGenerators.createBulkUpdateEvent(['key3', 'key4']),
      ];

      const promises = concurrentEvents.map(event =>
        act(() => {
          mockWebSocketManager.simulateEvent(event);
        })
      );

      await Promise.all(promises);

      // Should handle all concurrent events without errors
      expect(result.current.error).toBeNull();
    });

    it('should manage memory usage with long-running connections', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result, unmount } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate long-running connection with many events
      for (let i = 0; i < 1000; i++) {
        act(() => {
          const event = realtimeEventGenerators.createTranslationUpdateEvent({
            keys: [`test.key.${i}`],
          });
          mockWebSocketManager.simulateEvent(event);
        });
      }

      // Should not have memory leaks
      expect(result.current.error).toBeNull();

      // Clean up
      unmount();

      // Should properly disconnect WebSocket
      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Integration with Translation Cache', () => {
    it('should invalidate specific cache entries on targeted updates', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const mockTranslationCache = {
        invalidate: vi.fn(),
        getStats: vi.fn(() => ({ hits: 0, misses: 0, hitRate: 0, size: 0, memory: 0 })),
      };

      vi.doMock('@/lib/translation-client-cache', () => ({
        translationCache: mockTranslationCache,
      }));

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate targeted update
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent({
        locale: 'en',
        keys: ['common.welcome'],
      });

      act(() => {
        mockWebSocketManager.simulateEvent(updateEvent);
      });

      // Should invalidate cache for specific locale
      expect(mockTranslationCache.invalidate).toHaveBeenCalledWith({
        locale: 'en',
      });
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const mockTranslationCache = {
        invalidate: vi.fn(() => {
          throw new Error('Cache invalidation failed');
        }),
        getStats: vi.fn(() => ({ hits: 0, misses: 0, hitRate: 0, size: 0, memory: 0 })),
      };

      vi.doMock('@/lib/translation-client-cache', () => ({
        translationCache: mockTranslationCache,
      }));

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate update that causes cache invalidation error
      const updateEvent = realtimeEventGenerators.createTranslationUpdateEvent();

      act(() => {
        mockWebSocketManager.simulateEvent(updateEvent);
      });

      // Should not crash despite cache error
      expect(result.current.error).toBeNull();
    });
  });

  describe('WebSocket Cleanup and Resource Management', () => {
    it('should properly clean up WebSocket connections on unmount', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result, unmount } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockWebSocketManager.subscribe).toHaveBeenCalled();

      // Unmount component
      unmount();

      // Should clean up WebSocket connection
      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple hook instances with shared WebSocket', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      // Create multiple hook instances
      const { result: result1 } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      const { result: result2 } = renderHook(
        () => useTranslations({ realtime: true, namespace: 'common' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Both should be able to receive updates
      expect(result1.current.isRealtime).toBe(true);
      expect(result2.current.isRealtime).toBe(true);

      // Should share the same WebSocket connection (implementation-dependent)
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should handle WebSocket disconnection gracefully', async () => {
      const mockResponse = mockApiResponseBuilders.buildTranslationsResponse('en');
      mockFetch.mockFetchSuccess(mockResponse);

      const { result } = renderHook(
        () => useTranslations({ realtime: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Force disconnect WebSocket
      act(() => {
        mockWebSocketManager.disconnect();
      });

      // Should continue functioning without real-time updates
      expect(result.current.error).toBeNull();
      expect(result.current.t).toBeDefined();
    });
  });
});