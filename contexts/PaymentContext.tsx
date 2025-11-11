
import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Payment Context
 * 
 * This context manages payment methods and payment authorizations.
 * 
 * PRODUCTION INTEGRATION:
 * 
 * To integrate with a real payment backend (e.g., Stripe):
 * 
 * 1. Install Stripe SDK: Already installed (@stripe/stripe-react-native)
 * 
 * 2. Initialize Stripe in your app:
 *    import { StripeProvider } from '@stripe/stripe-react-native';
 *    Wrap your app with <StripeProvider publishableKey="pk_...">
 * 
 * 3. Create a backend API with these endpoints:
 *    - POST /api/payment-methods - Create payment method
 *    - GET /api/payment-methods - List payment methods
 *    - DELETE /api/payment-methods/:id - Remove payment method
 *    - POST /api/authorize-payment - Authorize payment (hold funds)
 *    - POST /api/capture-payment - Capture authorized payment
 *    - POST /api/cancel-authorization - Cancel authorization
 * 
 * 4. Replace the mock implementations below with real API calls
 * 
 * 5. Use Stripe's PaymentIntent API for authorization and capture:
 *    - Create PaymentIntent with capture_method: 'manual'
 *    - Confirm the PaymentIntent to authorize
 *    - Capture the PaymentIntent when drop ends
 * 
 * 6. Handle webhooks from Stripe for payment status updates
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export interface PaymentAuthorization {
  id: string;
  productId: string;
  amount: number;
  authorizedAmount: number;
  paymentMethodId: string;
  status: 'authorized' | 'captured' | 'cancelled' | 'failed';
  createdAt: Date;
  capturedAt?: Date;
  finalAmount?: number;
  finalDiscount?: number;
}

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  authorizations: PaymentAuthorization[];
  addPaymentMethod: (method: PaymentMethod) => void;
  removePaymentMethod: (methodId: string) => void;
  setDefaultPaymentMethod: (methodId: string) => void;
  authorizePayment: (productId: string, amount: number, paymentMethodId: string) => Promise<string>;
  capturePayment: (authorizationId: string, finalAmount: number, finalDiscount: number) => Promise<boolean>;
  cancelAuthorization: (authorizationId: string) => Promise<boolean>;
  getDefaultPaymentMethod: () => PaymentMethod | undefined;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [authorizations, setAuthorizations] = useState<PaymentAuthorization[]>([]);

  const addPaymentMethod = (method: PaymentMethod) => {
    console.log('Adding payment method:', method);
    setPaymentMethods(prev => {
      // If this is the first payment method or it's set as default, make it default
      const isFirstMethod = prev.length === 0;
      const newMethod = { ...method, isDefault: isFirstMethod || method.isDefault };
      
      // If new method is default, unset other defaults
      if (newMethod.isDefault) {
        return [...prev.map(m => ({ ...m, isDefault: false })), newMethod];
      }
      
      return [...prev, newMethod];
    });
  };

  const removePaymentMethod = (methodId: string) => {
    console.log('Removing payment method:', methodId);
    setPaymentMethods(prev => {
      const filtered = prev.filter(m => m.id !== methodId);
      
      // If we removed the default method and there are others, make the first one default
      const removedMethod = prev.find(m => m.id === methodId);
      if (removedMethod?.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      
      return filtered;
    });
  };

  const setDefaultPaymentMethod = (methodId: string) => {
    console.log('Setting default payment method:', methodId);
    setPaymentMethods(prev =>
      prev.map(m => ({ ...m, isDefault: m.id === methodId }))
    );
  };

  const authorizePayment = async (
    productId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<string> => {
    console.log('Authorizing payment:', { productId, amount, paymentMethodId });
    
    // Simulate API call to Stripe to authorize payment
    // In production, this would call your backend which would use Stripe API
    return new Promise((resolve) => {
      setTimeout(() => {
        const authorization: PaymentAuthorization = {
          id: `auth_${Date.now()}`,
          productId,
          amount,
          authorizedAmount: amount,
          paymentMethodId,
          status: 'authorized',
          createdAt: new Date(),
        };
        
        setAuthorizations(prev => [...prev, authorization]);
        resolve(authorization.id);
      }, 1000);
    });
  };

  const capturePayment = async (
    authorizationId: string,
    finalAmount: number,
    finalDiscount: number
  ): Promise<boolean> => {
    console.log('Capturing payment:', { authorizationId, finalAmount, finalDiscount });
    
    // Simulate API call to Stripe to capture the authorized payment
    // In production, this would call your backend which would use Stripe API
    return new Promise((resolve) => {
      setTimeout(() => {
        setAuthorizations(prev =>
          prev.map(auth =>
            auth.id === authorizationId
              ? {
                  ...auth,
                  status: 'captured',
                  finalAmount,
                  finalDiscount,
                  capturedAt: new Date(),
                }
              : auth
          )
        );
        resolve(true);
      }, 1000);
    });
  };

  const cancelAuthorization = async (authorizationId: string): Promise<boolean> => {
    console.log('Cancelling authorization:', authorizationId);
    
    // Simulate API call to Stripe to cancel the authorization
    return new Promise((resolve) => {
      setTimeout(() => {
        setAuthorizations(prev =>
          prev.map(auth =>
            auth.id === authorizationId
              ? { ...auth, status: 'cancelled' }
              : auth
          )
        );
        resolve(true);
      }, 500);
    });
  };

  const getDefaultPaymentMethod = () => {
    return paymentMethods.find(m => m.isDefault);
  };

  return (
    <PaymentContext.Provider
      value={{
        paymentMethods,
        authorizations,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        authorizePayment,
        capturePayment,
        cancelAuthorization,
        getDefaultPaymentMethod,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
