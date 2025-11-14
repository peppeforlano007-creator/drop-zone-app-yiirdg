
/**
 * Centralized Error Handler
 * 
 * This module provides comprehensive error handling and logging
 * for production deployment.
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

    // In production, you would send this to a logging service
    // like Sentry, LogRocket, or your own backend
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
      const userMessage = this.getUserFriendlyMessage(category, message);
      Alert.alert('Errore', userMessage, [{ text: 'OK' }]);
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(category: ErrorCategory, message: string): string {
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
   * Send error to logging service
   */
  private async sendToLoggingService(error: AppError): Promise<void> {
    // In production, implement actual logging service integration
    // For now, we'll just log to console
    
    // Example: Send to Supabase for logging
    try {
      if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
        // You could create an error_logs table in Supabase
        // await supabase.from('error_logs').insert({
        //   message: error.message,
        //   category: error.category,
        //   severity: error.severity,
        //   context: error.context,
        //   timestamp: error.timestamp.toISOString(),
        // });
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
   * Handle Supabase errors
   */
  handleSupabaseError(error: any, context?: Record<string, any>): void {
    let category = ErrorCategory.DATABASE;
    let severity = ErrorSeverity.MEDIUM;
    let message = error.message || 'Database error';

    // Categorize based on error code
    if (error.code === 'PGRST301') {
      category = ErrorCategory.PERMISSION;
      message = 'Accesso negato';
    } else if (error.code === '23505') {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      message = 'Questo elemento esiste già';
    } else if (error.code === '23503') {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      message = 'Riferimento non valido';
    }

    this.handleError(message, category, severity, context, error);
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
