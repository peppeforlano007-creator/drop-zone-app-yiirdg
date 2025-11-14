
/**
 * Security Helpers and Utilities
 * 
 * This file contains security-related helper functions and validation utilities.
 */

import { supabase } from '@/app/integrations/supabase/client';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Italian format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove spaces and special characters
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Check if it's a valid Italian phone number
  // Accepts: +39xxxxxxxxxx, 39xxxxxxxxxx, or xxxxxxxxxx (10 digits)
  const phoneRegex = /^(\+39|39)?[0-9]{9,10}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} {
  const issues: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (password.length < 6) {
    issues.push('La password deve essere di almeno 6 caratteri');
  }

  if (password.length < 8) {
    issues.push('Consigliato: usa almeno 8 caratteri');
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('Consigliato: includi almeno una lettera maiuscola');
  }

  if (!/[a-z]/.test(password)) {
    issues.push('Consigliato: includi almeno una lettera minuscola');
  }

  if (!/[0-9]/.test(password)) {
    issues.push('Consigliato: includi almeno un numero');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('Consigliato: includi almeno un carattere speciale');
  }

  // Determine strength
  if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    strength = 'strong';
  } else if (password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'medium';
  }

  return {
    isValid: password.length >= 6,
    strength,
    issues,
  };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if user has required role
 */
export async function checkUserRole(requiredRole: string | string[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) return false;

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(profile.role);
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Rate limiting helper (client-side)
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Check if action is rate limited
   * @param key - Unique identifier for the action
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   */
  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      console.warn(`Rate limit exceeded for: ${key}`);
      return true;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return false;
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string) {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll() {
    this.attempts.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Validate numeric input
 */
export function isValidNumber(value: string, min?: number, max?: number): boolean {
  const num = parseFloat(value);
  
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  
  return true;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  
  return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
}

/**
 * Check for SQL injection patterns (basic)
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: { size: number; type: string; name: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File troppo grande. Dimensione massima: ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo di file non supportato. Tipi consentiti: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Generate secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}
