
/**
 * Phone number validation and formatting utilities
 * Ensures phone numbers are in E.164 format for Twilio/Supabase
 */

/**
 * Validates if a phone number is in a valid format
 * @param phone - The phone number to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
  const trimmedPhone = phone.trim();
  
  // Check if phone is empty
  if (!trimmedPhone) {
    return { valid: false, message: 'Il numero di cellulare è obbligatorio' };
  }
  
  // Remove all spaces, dashes, and parentheses for validation
  const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
  
  // Check if it starts with +
  if (!cleanPhone.startsWith('+')) {
    return { 
      valid: false, 
      message: 'Il numero deve iniziare con il prefisso internazionale (es. +39 per l\'Italia)' 
    };
  }
  
  // Check if it contains only valid characters (+ and digits)
  if (!/^\+[0-9]+$/.test(cleanPhone)) {
    return { 
      valid: false, 
      message: 'Il numero contiene caratteri non validi. Usa solo numeri e il prefisso +' 
    };
  }
  
  // Check minimum length (country code + at least 7 digits)
  if (cleanPhone.length < 10) {
    return { 
      valid: false, 
      message: 'Il numero è troppo corto. Verifica di aver inserito il numero completo' 
    };
  }
  
  // Check maximum length (E.164 allows max 15 digits including country code)
  if (cleanPhone.length > 16) {
    return { 
      valid: false, 
      message: 'Il numero è troppo lungo. Verifica di aver inserito il numero corretto' 
    };
  }
  
  // Specific validation for Italian numbers (+39)
  if (cleanPhone.startsWith('+39')) {
    // Italian mobile numbers should be +39 followed by 10 digits
    // (3 for mobile prefix like 320, 333, etc. + 7 more digits)
    if (cleanPhone.length !== 13) {
      return { 
        valid: false, 
        message: 'Il numero italiano deve essere +39 seguito da 10 cifre (es. +39 320 123 4567)' 
      };
    }
    
    // Check if it's a valid Italian mobile prefix (starts with 3)
    const mobilePrefix = cleanPhone.substring(3, 4);
    if (mobilePrefix !== '3') {
      return { 
        valid: false, 
        message: 'Il numero deve essere un cellulare italiano (inizia con +39 3...)' 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Formats a phone number to E.164 format
 * Removes all spaces, dashes, and parentheses
 * @param phone - The phone number to format
 * @returns The formatted phone number in E.164 format
 */
export function formatPhoneToE164(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
  
  // If it doesn't start with +, assume it's an Italian number and add +39
  if (!cleanPhone.startsWith('+')) {
    // Remove leading 0 if present (Italian numbers often start with 0 when written locally)
    const withoutLeadingZero = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    return `+39${withoutLeadingZero}`;
  }
  
  return cleanPhone;
}

/**
 * Formats a phone number for display (adds spaces for readability)
 * @param phone - The phone number in E.164 format
 * @returns The formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
  
  // Format Italian numbers: +39 320 123 4567
  if (cleanPhone.startsWith('+39') && cleanPhone.length === 13) {
    return `${cleanPhone.substring(0, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6, 9)} ${cleanPhone.substring(9)}`;
  }
  
  // For other numbers, just add space after country code
  const countryCodeEnd = cleanPhone.indexOf(' ') > 0 ? cleanPhone.indexOf(' ') : 3;
  return `${cleanPhone.substring(0, countryCodeEnd)} ${cleanPhone.substring(countryCodeEnd)}`;
}

/**
 * Validates and formats a phone number in one step
 * @param phone - The phone number to validate and format
 * @returns Object with validation result, formatted phone, and error message if invalid
 */
export function validateAndFormatPhone(phone: string): { 
  valid: boolean; 
  formatted?: string; 
  message?: string 
} {
  const validation = validatePhoneNumber(phone);
  
  if (!validation.valid) {
    return validation;
  }
  
  const formatted = formatPhoneToE164(phone);
  
  return {
    valid: true,
    formatted,
  };
}
