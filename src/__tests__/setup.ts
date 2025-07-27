/**
 * Test Setup Configuration
 * Restaurant Krong Thai SOP Management System
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    reload: vi.fn(),
    asPath: '/',
    pathname: '/',
    query: {},
    route: '/',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  })),
}));

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    forEach: vi.fn(),
  })),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = vi.fn((...args) => {
  // Only show expected errors in tests
  if (
    !args[0]?.toString().includes('Warning: ReactDOM.render is no longer supported') &&
    !args[0]?.toString().includes('Warning: componentWillReceiveProps has been renamed')
  ) {
    originalConsoleError(...args);
  }
});

console.warn = vi.fn((...args) => {
  // Filter out known warnings
  if (
    !args[0]?.toString().includes('deprecated') &&
    !args[0]?.toString().includes('componentWillReceiveProps')
  ) {
    originalConsoleWarn(...args);
  }
});

// Global test utilities
declare global {
  var testUtils: {
    // Test database utilities
    setupTestDatabase(): Promise<void>;
    cleanupTestData(): Promise<void>;
    seedTestTranslations(): Promise<void>;
    
    // Mock utilities
    createMockSupabaseClient(): any;
    createMockQueryClient(): any;
    resetAllMocks(): void;
    
    // Test helpers
    waitForNextTick(): Promise<void>;
    flushPromises(): Promise<void>;
  };
}

// Implement global test utilities
global.testUtils = {
  async setupTestDatabase() {
    // Implementation for setting up test database
    // This would typically create a clean test schema
  },
  
  async cleanupTestData() {
    // Implementation for cleaning up test data
    // This would remove all test data from database
  },
  
  async seedTestTranslations() {
    // Implementation for seeding test translation data
    // This would insert sample translation data for tests
  },
  
  createMockSupabaseClient() {
    return {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      realtime: {
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn().mockReturnThis(),
          unsubscribe: vi.fn().mockReturnThis(),
        })),
      },
    };
  },
  
  createMockQueryClient() {
    return {
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn(),
      resetQueries: vi.fn(),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      prefetchQuery: vi.fn(),
      fetchQuery: vi.fn(),
      cancelQueries: vi.fn(),
      clear: vi.fn(),
    };
  },
  
  resetAllMocks() {
    vi.clearAllMocks();
    vi.clearAllTimers();
    localStorage.clear();
    sessionStorage.clear();
  },
  
  async waitForNextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
  },
  
  async flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
  },
};

// Setup and teardown for each test
beforeEach(() => {
  vi.clearAllTimers();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  global.testUtils.resetAllMocks();
});

// Global teardown
afterAll(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});