
/**
 * Phone number validation and formatting utilities
 * Ensures phone numbers are in the correct format for Supabase Auth
 * 
 * IMPORTANT: Supabase Auth stores phone numbers WITHOUT the + prefix
 * Format: country_code + phone_number (e.g., "393201234567" for Italy)
 */

import { COUNTRY_CODES } from '@/components/CountryCodePicker';

/**
 * Validates if a phone number is in a valid format for a specific country code
 * @param phone - The phone number to validate (without country code)
 * @param countryCode - The country code (e.g., "39" for Italy)
 * @returns Object with validation result and error message if invalid
 */
export function validatePhoneNumber(
  phone: string, 
  countryCode: string
): { valid: boolean; message?: string } {
  const trimmedPhone = phone.trim();
  
  // Check if phone is empty
  if (!trimmedPhone) {
    return { valid: false, message: 'Il numero di cellulare è obbligatorio' };
  }
  
  // Remove all spaces, dashes, and parentheses for validation
  const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
  
  // Check if it contains only digits
  if (!/^[0-9]+$/.test(cleanPhone)) {
    return { 
      valid: false, 
      message: 'Il numero contiene caratteri non validi. Usa solo numeri' 
    };
  }
  
  // Find country info
  const country = COUNTRY_CODES.find(c => c.code === countryCode);
  if (!country) {
    return { 
      valid: false, 
      message: 'Prefisso internazionale non valido' 
    };
  }
  
  // Remove leading zero if present (common in local formats)
  const phoneWithoutLeadingZero = cleanPhone.startsWith('0') 
    ? cleanPhone.substring(1) 
    : cleanPhone;
  
  // Check if phone number has the correct length for the country
  if (countryCode === '39') {
    // Numeri italiani: 9 o 10 cifre
    if (phoneWithoutLeadingZero.length < 9 || phoneWithoutLeadingZero.length > 10) {
      console.log('[validatePhoneNumber] Italian number length invalid:', phoneWithoutLeadingZero.length);
      return {
        valid: false,
        message: `Il numero deve contenere 9 o 10 cifre per l'Italia`,
      };
    }
  } else {
    if (phoneWithoutLeadingZero.length !== country.digits) {
      console.log('[validatePhoneNumber] Number length invalid:', phoneWithoutLeadingZero.length, 'expected:', country.digits);
      return { 
        valid: false, 
        message: `Il numero deve contenere ${country.digits} cifre per ${country.country}` 
      };
    }
  }
  
  // Specific validation for Italian numbers
  if (countryCode === '39') {
    // Italian mobile numbers should start with 3
    if (!phoneWithoutLeadingZero.startsWith('3')) {
      return { 
        valid: false, 
        message: 'Il numero deve essere un cellulare italiano (inizia con 3)' 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Formats a phone number to the format used by Supabase Auth
 * Format: country_code + phone_number (NO + prefix)
 * Example: "393201234567" for Italian number
 * 
 * @param phone - The phone number (without country code)
 * @param countryCode - The country code (e.g., "39" for Italy)
 * @returns The formatted phone number for Supabase Auth
 */
export function formatPhoneForAuth(phone: string, countryCode: string): string {
  // Remove all spaces, dashes, parentheses, and + signs
  const cleanPhone = phone.trim().replace(/[\s\-()+ ]/g, '');
  
  // Remove leading zero if present
  const phoneWithoutLeadingZero = cleanPhone.startsWith('0') 
    ? cleanPhone.substring(1) 
    : cleanPhone;
  
  // Return country code + phone number (no + prefix)
  return `${countryCode}${phoneWithoutLeadingZero}`;
}

/**
 * Formats a phone number for display (adds spaces for readability)
 * @param phone - The phone number in auth format (e.g., "393201234567")
 * @returns The formatted phone number for display (e.g., "+39 320 123 4567")
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
  
  // Add + prefix if not present
  const withPlus = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  // Format Italian numbers: +39 320 123 4567
  if (withPlus.startsWith('+39') && withPlus.length === 13) {
    return `${withPlus.substring(0, 3)} ${withPlus.substring(3, 6)} ${withPlus.substring(6, 9)} ${withPlus.substring(9)}`;
  }
  
  // For other numbers, just add space after country code
  // Find where country code ends (usually 1-3 digits after +)
  let countryCodeEnd = 3; // Default to +XX
  for (const country of COUNTRY_CODES) {
    if (withPlus.startsWith(`+${country.code}`)) {
      countryCodeEnd = country.code.length + 1;
      break;
    }
  }
  
  return `${withPlus.substring(0, countryCodeEnd)} ${withPlus.substring(countryCodeEnd)}`;
}

/**
 * Parses a phone number to extract country code and local number
 * Handles multiple formats: +393201234567, 393201234567, +39 320 1234567, etc.
 * 
 * @param phone - The phone number in any format
 * @returns Object with country code and local number, or null if invalid
 */
export function parsePhoneNumber(phone: string): { 
  countryCode: string; 
  localNumber: string;
  fullNumber: string;
} | null {
  // Remove all spaces, dashes, parentheses
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
  
  // Remove + if present
  const withoutPlus = cleanPhone.startsWith('+') 
    ? cleanPhone.substring(1) 
    : cleanPhone;
  
  // Try to match against known country codes
  for (const country of COUNTRY_CODES) {
    if (withoutPlus.startsWith(country.code)) {
      const localNumber = withoutPlus.substring(country.code.length);
      
      // Remove leading zero from local number if present
      const localWithoutZero = localNumber.startsWith('0') 
        ? localNumber.substring(1) 
        : localNumber;
      
      return {
        countryCode: country.code,
        localNumber: localWithoutZero,
        fullNumber: `${country.code}${localWithoutZero}`,
      };
    }
  }
  
  return null;
}

/**
 * Validates and formats a phone number in one step
 * @param phone - The phone number (without country code)
 * @param countryCode - The country code (e.g., "39" for Italy)
 * @returns Object with validation result, formatted phone, and error message if invalid
 */
export function validateAndFormatPhone(
  phone: string, 
  countryCode: string
): { 
  valid: boolean; 
  formatted?: string; 
  display?: string;
  message?: string;
} {
  const validation = validatePhoneNumber(phone, countryCode);
  
  if (!validation.valid) {
    return validation;
  }
  
  const formatted = formatPhoneForAuth(phone, countryCode);
  const display = formatPhoneForDisplay(formatted);
  
  return {
    valid: true,
    formatted,
    display,
  };
}

/**
 * Legacy function for backward compatibility
 * Tries to auto-detect country code from phone number
 */
export function validateAndFormatPhoneLegacy(phone: string): { 
  valid: boolean; 
  formatted?: string; 
  message?: string 
} {
  const trimmedPhone = phone.trim();
  
  if (!trimmedPhone) {
    return { valid: false, message: 'Il numero di cellulare è obbligatorio' };
  }
  
  // Try to parse the phone number
  const parsed = parsePhoneNumber(trimmedPhone);
  
  if (!parsed) {
    return { 
      valid: false, 
      message: 'Formato numero non valido. Usa il prefisso internazionale (es. +39 per l\'Italia)' 
    };
  }
  
  // Validate the parsed number
  const validation = validatePhoneNumber(parsed.localNumber, parsed.countryCode);
  
  if (!validation.valid) {
    return validation;
  }
  
  return {
    valid: true,
    formatted: parsed.fullNumber,
  };
}
