/**
 * Rate Limiting System for Restaurant Krong Thai SOP Management System
 * Provides brute force protection and API rate limiting optimized for restaurant operations
 */

import { SECURITY_CONFIG } from './config';

// Types
interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  retryAfter?: number;
  windowEnd?: Date;
}

interface RateLimitEntry {
  attempts: number;
  windowStart: Date;
  lockedUntil?: Date;
  lastAttempt: Date;
}

interface BruteForceDetection {
  suspiciousActivity: boolean;
  riskScore: number;
  patterns: string[];
}

/**
 * In-memory rate limiting store
 * In production, you might want to use Redis or database-backed storage
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.store.entries()) {
      // Remove entries older than 24 hours
      const maxAge = 24 * 60 * 60 * 1000;
      if (now.getTime() - entry.lastAttempt.getTime() > maxAge) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Rate Limiter Class
 */
export class RateLimiter {
  private static pinStore = new RateLimitStore();
  private static apiStore = new RateLimitStore();
  private static formStore = new RateLimitStore();

  /**
   * Check PIN authentication rate limits
   */
  static async checkPinAttempts(email: string, ipAddress: string): Promise<RateLimitResult> {
    const config = SECURITY_CONFIG.RATE_LIMIT.PIN_ATTEMPTS;
    const key = `pin:${email}:${ipAddress}`;
    
    return this.checkRateLimit(this.pinStore, key, config.MAX_ATTEMPTS, config.WINDOW_MINUTES);
  }

  /**
   * Record PIN authentication attempt
   */
  static async recordPinAttempt(email: string, ipAddress: string, success: boolean): Promise<void> {
    const key = `pin:${email}:${ipAddress}`;
    
    if (success) {
      // Clear rate limit on successful authentication
      this.pinStore.delete(key);
    } else {
      // Increment failed attempts
      await this.incrementAttempts(this.pinStore, key);
      
      // Apply progressive lockout if configured
      if (SECURITY_CONFIG.RATE_LIMIT.PIN_ATTEMPTS.PROGRESSIVE_DELAY) {
        await this.applyProgressiveLockout(key, this.pinStore);
      }
    }
  }

  /**
   * Check API request rate limits
   */
  static async checkApiRequests(ipAddress: string, endpoint?: string): Promise<RateLimitResult> {
    const config = SECURITY_CONFIG.RATE_LIMIT.API_REQUESTS;
    const key = endpoint ? `api:${ipAddress}:${endpoint}` : `api:${ipAddress}`;
    
    return this.checkRateLimit(this.apiStore, key, config.MAX_REQUESTS, config.WINDOW_MINUTES);
  }

  /**
   * Check form submission rate limits
   */
  static async checkFormSubmissions(userId: string, formType: string): Promise<RateLimitResult> {
    const config = SECURITY_CONFIG.RATE_LIMIT.FORM_SUBMISSIONS;
    const key = `form:${userId}:${formType}`;
    
    return this.checkRateLimit(this.formStore, key, config.MAX_SUBMISSIONS, config.WINDOW_MINUTES);
  }

  /**
   * Generic rate limit checker
   */
  private static checkRateLimit(
    store: RateLimitStore,
    key: string,
    maxAttempts: number,
    windowMinutes: number
  ): RateLimitResult {
    const now = new Date();
    const entry = store.get(key);

    // Check if currently locked
    if (entry?.lockedUntil && entry.lockedUntil > now) {
      const retryAfter = Math.ceil((entry.lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        attemptsRemaining: 0,
        retryAfter,
      };
    }

    // Check if window has expired
    const windowDuration = windowMinutes * 60 * 1000;
    if (!entry || (now.getTime() - entry.windowStart.getTime()) > windowDuration) {
      // Reset or create new window
      const newEntry: RateLimitEntry = {
        attempts: 0,
        windowStart: now,
        lastAttempt: now,
      };
      store.set(key, newEntry);
      
      return {
        allowed: true,
        attemptsRemaining: maxAttempts - 1,
        windowEnd: new Date(now.getTime() + windowDuration),
      };
    }

    // Check if limit exceeded
    if (entry.attempts >= maxAttempts) {
      // Apply lockout
      const lockoutDuration = SECURITY_CONFIG.RATE_LIMIT.PIN_ATTEMPTS.LOCKOUT_DURATION;
      entry.lockedUntil = new Date(now.getTime() + lockoutDuration);
      store.set(key, entry);
      
      return {
        allowed: false,
        attemptsRemaining: 0,
        retryAfter: Math.ceil(lockoutDuration / 1000),
      };
    }

    return {
      allowed: true,
      attemptsRemaining: maxAttempts - entry.attempts - 1,
      windowEnd: new Date(entry.windowStart.getTime() + windowDuration),
    };
  }

  /**
   * Increment attempt counter
   */
  private static async incrementAttempts(store: RateLimitStore, key: string): Promise<void> {
    const now = new Date();
    const entry = store.get(key);

    if (entry) {
      entry.attempts += 1;
      entry.lastAttempt = now;
      store.set(key, entry);
    } else {
      store.set(key, {
        attempts: 1,
        windowStart: now,
        lastAttempt: now,
      });
    }
  }

  /**
   * Apply progressive lockout based on attempt history
   */
  private static async applyProgressiveLockout(key: string, store: RateLimitStore): Promise<void> {
    const entry = store.get(key);
    if (!entry) return;

    // Progressive delay: 1 min, 5 min, 15 min, 30 min
    const delays = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];
    const delayIndex = Math.min(entry.attempts - 1, delays.length - 1);
    const delay = delays[delayIndex];

    entry.lockedUntil = new Date(Date.now() + delay);
    store.set(key, entry);
  }

  /**
   * Detect brute force patterns
   */
  static async detectBruteForce(
    ipAddress: string,
    userAgent: string,
    attempts: number
  ): Promise<BruteForceDetection> {
    const patterns: string[] = [];
    let riskScore = 0;

    // High frequency attempts from same IP
    if (attempts > 20) {
      patterns.push('high_frequency_attempts');
      riskScore += 30;
    }

    // Check for user agent variations (potential bot behavior)
    const userAgentKey = `ua:${ipAddress}`;
    const storedEntry = this.apiStore.get(userAgentKey);
    if (storedEntry && this.hasUserAgentVariations(userAgent, storedEntry)) {
      patterns.push('user_agent_variation');
      riskScore += 25;
    }

    // Distributed attack detection (same user agent, different IPs)
    if (this.isDistributedAttack(userAgent)) {
      patterns.push('distributed_attack');
      riskScore += 40;
    }

    // Time-based patterns (attacks outside business hours)
    if (this.isOutsideBusinessHours()) {
      patterns.push('off_hours_activity');
      riskScore += 15;
    }

    return {
      suspiciousActivity: riskScore >= 50,
      riskScore,
      patterns,
    };
  }

  /**
   * Check for user agent variations from same IP
   */
  private static hasUserAgentVariations(currentUA: string, entry: RateLimitEntry): boolean {
    // Simplified check - in production, you'd want more sophisticated analysis
    return Math.random() > 0.8; // Placeholder logic
  }

  /**
   * Detect distributed attacks
   */
  private static isDistributedAttack(userAgent: string): boolean {
    // Check if same user agent is being used from multiple IPs
    // This would require tracking across all entries
    return false; // Placeholder
  }

  /**
   * Check if current time is outside business hours
   */
  private static isOutsideBusinessHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const config = SECURITY_CONFIG.RESTAURANT.OPERATING_HOURS;
    
    const openHour = parseInt(config.OPEN.split(':')[0]);
    const closeHour = parseInt(config.CLOSE.split(':')[0]);
    
    return hours < openHour || hours > closeHour;
  }

  /**
   * Get rate limit statistics
   */
  static async getStats(): Promise<{
    pinAttempts: number;
    apiRequests: number;
    formSubmissions: number;
    activeRestrictions: number;
  }> {
    const now = new Date();
    let activeRestrictions = 0;

    // Count active restrictions
    for (const [, entry] of this.pinStore['store'].entries()) {
      if (entry.lockedUntil && entry.lockedUntil > now) {
        activeRestrictions++;
      }
    }

    return {
      pinAttempts: this.pinStore['store'].size,
      apiRequests: this.apiStore['store'].size,
      formSubmissions: this.formStore['store'].size,
      activeRestrictions,
    };
  }

  /**
   * Clear rate limits for user (admin function)
   */
  static async clearUserLimits(email: string): Promise<void> {
    // Remove all entries for this email
    for (const [key] of this.pinStore['store'].entries()) {
      if (key.includes(email)) {
        this.pinStore.delete(key);
      }
    }
  }

  /**
   * Clear rate limits for IP address (admin function)
   */
  static async clearIpLimits(ipAddress: string): Promise<void> {
    // Remove all entries for this IP
    for (const [key] of this.pinStore['store'].entries()) {
      if (key.includes(ipAddress)) {
        this.pinStore.delete(key);
      }
    }

    for (const [key] of this.apiStore['store'].entries()) {
      if (key.includes(ipAddress)) {
        this.apiStore.delete(key);
      }
    }
  }

  /**
   * Cleanup and destroy stores (for testing/shutdown)
   */
  static cleanup(): void {
    this.pinStore.destroy();
    this.apiStore.destroy();
    this.formStore.destroy();
  }
}