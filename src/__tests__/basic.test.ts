/**
 * Basic Test to Verify Setup
 */

import { describe, it, expect } from 'vitest';

describe('Basic Test Suite', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
  });

  it('should have mocked globals available', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.resetAllMocks).toBe('function');
  });
});