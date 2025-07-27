/**
 * Secure PIN Authentication System
 * Restaurant Krong Thai SOP Management System
 * 
 * Implements secure 4-digit PIN authentication optimized for restaurant 
 * tablet environments with enhanced security measures.
 */

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { envConfig } from '@/lib/env-config';

// PIN validation schema
const PINSchema = z.string()
  .length(4, 'PIN must be exactly 4 digits')
  .regex(/^\d{4}$/, 'PIN must contain only digits');

// PIN strength levels
export enum PINStrength {
  WEAK = 'weak',
  MEDIUM = 'medium', 
  STRONG = 'strong'
}

// Common weak PIN patterns to reject
const WEAK_PIN_PATTERNS = [
  // Sequential patterns
  '0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890',
  '9876', '8765', '7654', '6543', '5432', '4321', '3210',
  
  // Repeated digits
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  
  // Common patterns
  '1212', '2121', '1313', '3131', '1414', '4141', '1515', '5151',
  '2323', '3232', '2424', '4242', '2525', '5252', '2626', '6262',
  '3434', '4343', '3535', '5353', '3636', '6363', '4545', '5454',
  '4646', '6464', '5656', '6565', '5757', '7575', '6767', '7676',
  '6868', '8686', '7878', '8787', '7979', '9797', '8989', '9898',
  
  // Common dates (MMDD format)
  '0101', '0102', '0201', '0202', '1225', '1224', '0401', '0501',
  '0701', '0801', '0901', '1001', '1101', '1201',
  
  // Common personal patterns
  '1980', '1990', '2000', '2010', '2020', '1975', '1985', '1995',
  '0123', '1001', '2002', '3003', '4004', '5005',
  
  // Keyboard patterns
  '1357', '2468', '1590', '7410', '8520', '9630',
];

// PIN authentication result interface
export interface PINAuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  requiresPINChange?: boolean;
}

// PIN validation result interface
export interface PINValidationResult {
  isValid: boolean;
  strength: PINStrength;
  errors: string[];
  suggestions: string[];
}

// PIN change request interface
export interface PINChangeRequest {
  userId: string;
  currentPIN: string;
  newPIN: string;
  confirmPIN: string;
}

/**
 * Secure PIN Authentication Service
 */
export class PINAuthService {
  private static instance: PINAuthService;
  private config = envConfig.server;

  private constructor() {}

  public static getInstance(): PINAuthService {
    if (!PINAuthService.instance) {
      PINAuthService.instance = new PINAuthService();
    }
    return PINAuthService.instance;
  }

  /**
   * Validate PIN format and strength
   */
  public validatePIN(pin: string): PINValidationResult {
    const result: PINValidationResult = {
      isValid: true,
      strength: PINStrength.WEAK,
      errors: [],
      suggestions: []
    };

    // Basic format validation
    try {
      PINSchema.parse(pin);
    } catch (error) {
      result.isValid = false;
      if (error instanceof z.ZodError) {
        result.errors.push(...error.errors.map(e => e.message));
      }
      return result;
    }

    // Check against weak patterns
    if (WEAK_PIN_PATTERNS.includes(pin)) {
      result.isValid = false;
      result.errors.push('PIN uses a common pattern that is easily guessed');
      result.suggestions.push('Avoid sequential numbers (1234), repeated digits (1111), or common patterns');
      return result;
    }

    // Analyze PIN strength
    result.strength = this.analyzePINStrength(pin);
    
    // Apply minimum strength requirement
    const minStrength = this.config.PIN_MIN_STRENGTH;
    if (!this.meetMinimumStrength(result.strength, minStrength)) {
      result.isValid = false;
      result.errors.push(`PIN must be at least ${minStrength} strength`);
      result.suggestions.push(this.getStrengthSuggestions(minStrength));
    }

    return result;
  }

  /**
   * Analyze PIN strength based on patterns and entropy
   */
  private analyzePINStrength(pin: string): PINStrength {
    let score = 0;
    const digits = pin.split('');
    const uniqueDigits = new Set(digits);

    // Factor 1: Unique digits (more unique = stronger)
    const uniqueRatio = uniqueDigits.size / digits.length;
    score += uniqueRatio * 30;

    // Factor 2: No adjacent repeated digits
    let hasAdjacentRepeats = false;
    for (let i = 0; i < digits.length - 1; i++) {
      if (digits[i] === digits[i + 1]) {
        hasAdjacentRepeats = true;
        break;
      }
    }
    if (!hasAdjacentRepeats) score += 20;

    // Factor 3: No sequential patterns
    let hasSequential = false;
    for (let i = 0; i < digits.length - 1; i++) {
      const current = parseInt(digits[i]);
      const next = parseInt(digits[i + 1]);
      if (Math.abs(current - next) === 1) {
        hasSequential = true;
        break;
      }
    }
    if (!hasSequential) score += 25;

    // Factor 4: Avoid predictable patterns (even/odd, arithmetic sequences)
    const isArithmetic = this.isArithmeticSequence(digits.map(Number));
    if (!isArithmetic) score += 15;

    // Factor 5: Distribution of digits
    const digitDistribution = this.calculateDigitDistribution(digits);
    if (digitDistribution > 0.6) score += 10;

    // Determine strength based on score
    if (score >= 80) return PINStrength.STRONG;
    if (score >= 50) return PINStrength.MEDIUM;
    return PINStrength.WEAK;
  }

  /**
   * Check if sequence is arithmetic (e.g., 1357, 2468)
   */
  private isArithmeticSequence(numbers: number[]): boolean {
    if (numbers.length < 3) return false;
    
    const diff = numbers[1] - numbers[0];
    for (let i = 2; i < numbers.length; i++) {
      if (numbers[i] - numbers[i - 1] !== diff) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate digit distribution entropy
   */
  private calculateDigitDistribution(digits: string[]): number {
    const counts = new Map<string, number>();
    digits.forEach(digit => {
      counts.set(digit, (counts.get(digit) || 0) + 1);
    });

    let entropy = 0;
    const total = digits.length;
    counts.forEach(count => {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    });

    return entropy / Math.log2(10); // Normalize to 0-1 range
  }

  /**
   * Check if PIN meets minimum strength requirement
   */
  private meetMinimumStrength(pinStrength: PINStrength, minStrength: string): boolean {
    const strengthOrder = [PINStrength.WEAK, PINStrength.MEDIUM, PINStrength.STRONG];
    const pinIndex = strengthOrder.indexOf(pinStrength);
    const minIndex = strengthOrder.indexOf(minStrength as PINStrength);
    return pinIndex >= minIndex;
  }

  /**
   * Get suggestions for improving PIN strength
   */
  private getStrengthSuggestions(minStrength: string): string {
    const suggestions = {
      [PINStrength.WEAK]: 'Use different digits and avoid obvious patterns',
      [PINStrength.MEDIUM]: 'Use a mix of different digits with no clear pattern',
      [PINStrength.STRONG]: 'Use random digits with high entropy and no patterns'
    };
    return suggestions[minStrength as PINStrength] || suggestions[PINStrength.MEDIUM];
  }

  /**
   * Hash PIN securely using bcrypt
   */
  public async hashPIN(pin: string): Promise<string> {
    // Validate PIN before hashing
    const validation = this.validatePIN(pin);
    if (!validation.isValid) {
      throw new Error(`Invalid PIN: ${validation.errors.join(', ')}`);
    }

    try {
      const saltRounds = this.config.PIN_HASH_ROUNDS;
      return await bcrypt.hash(pin, saltRounds);
    } catch (error) {
      throw new Error('Failed to hash PIN');
    }
  }

  /**
   * Verify PIN against hash with timing attack protection
   */
  public async verifyPIN(pin: string, hash: string): Promise<boolean> {
    try {
      // Validate PIN format first
      PINSchema.parse(pin);
      
      // Use bcrypt compare for secure verification
      return await bcrypt.compare(pin, hash);
    } catch (error) {
      // Always perform a dummy hash operation to prevent timing attacks
      await bcrypt.compare('0000', '$2b$12$dummy.hash.to.prevent.timing.attacks');
      return false;
    }
  }

  /**
   * Generate secure random PIN (for testing/demo purposes)
   */
  public generateSecurePIN(): string {
    let pin: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      // Generate random 4-digit PIN
      pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate secure PIN after maximum attempts');
      }
    } while (!this.validatePIN(pin).isValid);

    return pin;
  }

  /**
   * Check if PIN has expired and needs to be changed
   */
  public isPINExpired(pinChangedAt: Date | null, maxAgeDays: number = 90): boolean {
    if (!pinChangedAt) return true; // Never changed = expired
    
    const now = new Date();
    const ageInDays = (now.getTime() - pinChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > maxAgeDays;
  }

  /**
   * Calculate next allowed attempt time based on exponential backoff
   */
  public calculateLockoutDuration(attemptCount: number): number {
    if (attemptCount <= this.config.PIN_MAX_ATTEMPTS) {
      return 0; // No lockout yet
    }

    // Exponential backoff: base lockout time * 2^(excess attempts)
    const baseLockoutMs = this.config.PIN_LOCKOUT_DURATION_MINUTES * 60 * 1000;
    const excessAttempts = attemptCount - this.config.PIN_MAX_ATTEMPTS;
    return baseLockoutMs * Math.pow(2, Math.min(excessAttempts - 1, 6)); // Cap at 64x base time
  }

  /**
   * Check if account is currently locked out
   */
  public isAccountLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return false;
    return new Date() < lockedUntil;
  }

  /**
   * Sanitize PIN for logging (replace with asterisks)
   */
  public sanitizePINForLogging(pin: string): string {
    return pin.replace(/./g, '*');
  }

  /**
   * Generate PIN change token for secure PIN updates
   */
  public generatePINChangeToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Validate PIN change request
   */
  public validatePINChangeRequest(request: PINChangeRequest): PINValidationResult {
    const result: PINValidationResult = {
      isValid: true,
      strength: PINStrength.WEAK,
      errors: [],
      suggestions: []
    };

    // Check that new PIN is different from current
    if (request.currentPIN === request.newPIN) {
      result.isValid = false;
      result.errors.push('New PIN must be different from current PIN');
    }

    // Check PIN confirmation matches
    if (request.newPIN !== request.confirmPIN) {
      result.isValid = false;
      result.errors.push('PIN confirmation does not match');
    }

    // Validate new PIN strength
    const pinValidation = this.validatePIN(request.newPIN);
    if (!pinValidation.isValid) {
      result.isValid = false;
      result.errors.push(...pinValidation.errors);
      result.suggestions.push(...pinValidation.suggestions);
    } else {
      result.strength = pinValidation.strength;
    }

    return result;
  }
}

// Singleton export
export const pinAuthService = PINAuthService.getInstance();

// Utility functions for common PIN operations
export const PINUtils = {
  /**
   * Generate multiple secure PINs for bulk user creation
   */
  generateMultiplePINs(count: number): string[] {
    const pins: string[] = [];
    const usedPins = new Set<string>();

    while (pins.length < count) {
      try {
        const pin = pinAuthService.generateSecurePIN();
        if (!usedPins.has(pin)) {
          pins.push(pin);
          usedPins.add(pin);
        }
      } catch (error) {
        console.error('Failed to generate PIN:', error);
        break;
      }
    }

    return pins;
  },

  /**
   * Check PIN strength in bulk for administrative review
   */
  auditPINStrengths(pins: string[]): { weak: number; medium: number; strong: number } {
    const counts = { weak: 0, medium: 0, strong: 0 };
    
    pins.forEach(pin => {
      const validation = pinAuthService.validatePIN(pin);
      if (validation.isValid) {
        counts[validation.strength]++;
      } else {
        counts.weak++; // Invalid PINs counted as weak
      }
    });

    return counts;
  },

  /**
   * Generate PIN strength report for security compliance
   */
  generateSecurityReport(totalUsers: number, strongPINs: number, mediumPINs: number, weakPINs: number) {
    const total = strongPINs + mediumPINs + weakPINs;
    
    return {
      totalUsers,
      pinsAnalyzed: total,
      securityScore: ((strongPINs * 3 + mediumPINs * 2 + weakPINs * 1) / (total * 3)) * 100,
      recommendations: [
        strongPINs / total < 0.5 ? 'Encourage more users to use strong PINs' : null,
        weakPINs / total > 0.1 ? 'Require weak PIN users to update their PINs' : null,
        'Consider implementing mandatory PIN rotation every 90 days'
      ].filter(Boolean)
    };
  }
};

// Type exports
export type { PINAuthResult, PINValidationResult, PINChangeRequest };