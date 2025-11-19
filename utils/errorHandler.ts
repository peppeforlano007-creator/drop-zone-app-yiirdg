
/**
 * Centralized Error Handler with User-Friendly Messages
 * 
 * This module provides comprehensive error handling and logging
 * for production deployment with Italian user-friendly messages.
 */

import { Alert } from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'auth',
  PAYMENT = 'payment',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

export interface AppError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
  originalError?: any;
}

class ErrorHandler {
  private errors: AppError[] = [];
  private maxStoredErrors = 100;

  /**
   * Log an error with context
   */
  logError(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, any>,
    originalError?: any
  ): void {
    const error: AppError = {
      message,
      category,
      severity,
      timestamp: new Date(),
      context,
      originalError,
    };

    // Store error
    this.errors.push(error);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Console log
    console.error(`[${severity.toUpperCase()}] [${category}] ${message}`, {
      context,
      originalError,
    });

    // Send to logging service
    this.sendToLoggingService(error);
  }

  /**
   * Handle and display error to user
   */
  handleError(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, any>,
    originalError?: any,
    showAlert: boolean = true
  ): void {
    this.logError(message, category, severity, context, originalError);

    if (showAlert && severity !== ErrorSeverity.LOW) {
      const userMessage = this.getUserFriendlyMessage(category, message, originalError);
      Alert.alert('Errore', userMessage, [{ text: 'OK' }]);
    }
  }

  /**
   * Get user-friendly error message in Italian
   */
  private getUserFriendlyMessage(category: ErrorCategory, message: string, originalError?: any): string {
    // Check for specific PostgREST error codes
    if (originalError?.code) {
      const pgrstMessage = this.getPostgRESTErrorMessage(originalError.code, originalError);
      if (pgrstMessage) return pgrstMessage;
    }

    // Check for specific error messages
    if (originalError?.message) {
      const specificMessage = this.getSpecificErrorMessage(originalError.message);
      if (specificMessage) return specificMessage;
    }

    // Fallback to category-based messages
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Problema di connessione. Verifica la tua connessione internet e riprova.';
      case ErrorCategory.DATABASE:
        return 'Errore nel caricamento dei dati. Riprova tra qualche istante.';
      case ErrorCategory.AUTHENTICATION:
        return 'Errore di autenticazione. Effettua nuovamente il login.';
      case ErrorCategory.PAYMENT:
        return 'Errore nel processare il pagamento. Verifica i dati della carta e riprova.';
      case ErrorCategory.VALIDATION:
        return message; // Validation messages are already user-friendly
      case ErrorCategory.PERMISSION:
        return 'Non hai i permessi necessari per questa operazione.';
      default:
        return 'Si è verificato un errore imprevisto. Riprova.';
    }
  }

  /**
   * Get user-friendly message for PostgREST error codes
   */
  private getPostgRESTErrorMessage(code: string, error: any): string | null {
    switch (code) {
      case 'PGRST301':
        return 'Accesso negato. Non hai i permessi per visualizzare questi dati.';
      case 'PGRST204':
        return 'Nessun dato trovato. La risorsa richiesta non esiste.';
      case 'PGRST116':
        return 'Richiesta non valida. Verifica i dati inseriti.';
      case 'PGRST202':
        return 'Errore nella richiesta. Alcuni parametri non sono validi.';
      case '23505':
        return 'Questo elemento esiste già nel sistema.';
      case '23503':
        return 'Impossibile completare l\'operazione. Alcuni dati collegati non sono validi.';
      case '23502':
        return 'Alcuni campi obbligatori sono mancanti.';
      case '42P01':
        return 'Errore di sistema. La risorsa richiesta non è disponibile.';
      case '42501':
        return 'Permessi insufficienti per questa operazione.';
      case '08006':
      case '08003':
      case '08000':
        return 'Errore di connessione al database. Riprova tra qualche istante.';
      default:
        // Check if it's a generic PGRST error
        if (code.startsWith('PGRST')) {
          return 'Errore nel caricamento dei dati. Riprova tra qualche istante.';
        }
        return null;
    }
  }

  /**
   * Get user-friendly message for specific error messages
   */
  private getSpecificErrorMessage(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Problema di connessione. Verifica la tua connessione internet e riprova.';
    }

    if (lowerMessage.includes('timeout')) {
      return 'La richiesta ha impiegato troppo tempo. Riprova.';
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return 'Accesso negato. Effettua nuovamente il login.';
    }

    if (lowerMessage.includes('not found')) {
      return 'La risorsa richiesta non è stata trovata.';
    }

    if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
      return 'Questo elemento esiste già nel sistema.';
    }

    if (lowerMessage.includes('invalid') || lowerMessage.includes('malformed')) {
      return 'Dati non validi. Verifica le informazioni inserite.';
    }

    return null;
  }

  /**
   * Send error to logging service
   */
  private async sendToLoggingService(error: AppError): Promise<void> {
    try {
      if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
        // Log to activity_logs table
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('activity_logs').insert({
          action: 'error_occurred',
          description: `${error.category}: ${error.message}`,
          user_id: user?.id,
          metadata: {
            severity: error.severity,
            context: error.context,
            error_code: error.originalError?.code,
            error_message: error.originalError?.message,
          },
        });
      }
    } catch (loggingError) {
      console.error('Failed to send error to logging service:', loggingError);
    }
  }

  /**
   * Get all stored errors
   */
  getErrors(): AppError[] {
    return [...this.errors];
  }

  /**
   * Clear stored errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Handle Supabase errors with user-friendly messages
   */
  handleSupabaseError(error: any, context?: Record<string, any>, showAlert: boolean = true): void {
    let category = ErrorCategory.DATABASE;
    let severity = ErrorSeverity.MEDIUM;
    let message = error.message || 'Database error';

    // Categorize based on error code
    if (error.code === 'PGRST301' || error.code === '42501') {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
    } else if (error.code === '23505') {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (error.code === '23503' || error.code === '23502') {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    } else if (error.code?.startsWith('08')) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
    }

    this.handleError(message, category, severity, context, error, showAlert);
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: any, context?: Record<string, any>): void {
    this.handleError(
      'Errore di rete',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      context,
      error
    );
  }

  /**
   * Handle payment errors
   */
  handlePaymentError(error: any, context?: Record<string, any>): void {
    this.handleError(
      error.message || 'Errore nel pagamento',
      ErrorCategory.PAYMENT,
      ErrorSeverity.HIGH,
      context,
      error
    );
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any, context?: Record<string, any>): void {
    this.handleError(
      error.message || 'Errore di autenticazione',
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      context,
      error
    );
  }
}

export const errorHandler = new ErrorHandler();

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  category: ErrorCategory,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleError(
      error instanceof Error ? error.message : 'Unknown error',
      category,
      ErrorSeverity.MEDIUM,
      context,
      error
    );
    return null;
  }
}
