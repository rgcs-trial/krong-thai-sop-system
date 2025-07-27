/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment configuration
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Global test configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/__tests__/**/*.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'cypress/',
      'src/__tests__/mocks/**/*',
      'src/__tests__/utils/**/*'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/*.type.ts',
        'src/middleware.ts',
        'cypress/',
        '.next/',
        'dist/',
        'public/',
        'scripts/',
        'docs/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Higher thresholds for critical translation system files
        './src/hooks/use-translations-db.ts': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        './src/hooks/use-translation-admin.ts': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Test running configuration
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Test output configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    },
    
    // Watch mode configuration
    watch: false,
    
    // Vitest UI configuration
    ui: true,
    open: false,
    
    // Mock configuration
    deps: {
      external: ['react', 'react-dom'],
      inline: ['@testing-library/react']
    },
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
    },
    
    // Retry configuration for flaky tests
    retry: 2,
    
    // Sequence configuration
    sequence: {
      shuffle: false,
      concurrent: true
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './'),
    }
  },
  
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '"http://localhost:54321"',
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '"test-anon-key"'
  }
});