
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Payment Context
 * 
 * This context manages payment methods and payment authorizations.
 * Now integrated with Stripe for real payment processing.
 */

export interface PaymentMethod {
  id: string;
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
  loading: boolean;
  addPaymentMethod: (method: PaymentMethod) => void;
  removePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;
  authorizePayment: (productId: string, amount: number, paymentMethodId: string) => Promise<string>;
  capturePayment: (authorizationId: string, finalAmount: number, finalDiscount: number) => Promise<boolean>;
  cancelAuthorization: (authorizationId: string) => Promise<boolean>;
  getDefaultPaymentMethod: () => PaymentMethod | undefined;
  hasPaymentMethod: () => boolean;
  refreshPaymentMethods: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [authorizations, setAuthorizations] = useState<PaymentAuthorization[]>([]);
  const [loading, setLoading] = useState(true);

  // Validate payment method data
  const isValidPaymentMethod = (pm: any): boolean => {
    // Must have a valid Stripe payment method ID
    if (!pm.stripe_payment_method_id || pm.stripe_payment_method_id.length === 0) {
      console.log('Invalid payment method: missing stripe_payment_method_id', pm.id);
      return false;
    }

    // Must have valid last4 digits (exactly 4 digits)
    if (!pm.card_last4 || pm.card_last4.length !== 4) {
      console.log('Invalid payment method: invalid card_last4', pm.id, pm.card_last4);
      return false;
    }

    // Must have a card brand
    if (!pm.card_brand || pm.card_brand.length === 0) {
      console.log('Invalid payment method: missing card_brand', pm.id);
      return false;
    }

    // Must have valid expiry data
    if (!pm.card_exp_month || !pm.card_exp_year) {
      console.log('Invalid payment method: missing expiry data', pm.id);
      return false;
    }

    // Check if card is expired
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    if (pm.card_exp_year < currentYear || 
        (pm.card_exp_year === currentYear && pm.card_exp_month < currentMonth)) {
      console.log('Invalid payment method: card expired', pm.id, `${pm.card_exp_month}/${pm.card_exp_year}`);
      return false;
    }

    return true;
  };

  // Load payment methods from database
  const loadPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPaymentMethods([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading payment methods:', error);
        setLoading(false);
        return;
      }

      console.log('Loaded payment methods from database:', data?.length || 0);

      // Filter out invalid payment methods
      const validMethods = (data || []).filter(isValidPaymentMethod);

      const methods: PaymentMethod[] = validMethods.map(pm => ({
        id: pm.id,
        last4: pm.card_last4,
        brand: pm.card_brand,
        expiryMonth: pm.card_exp_month,
        expiryYear: pm.card_exp_year,
        isDefault: pm.is_default || false,
        stripePaymentMethodId: pm.stripe_payment_method_id,
      }));

      console.log('Valid payment methods:', methods.length, 'out of', (data || []).length);
      
      // If we filtered out invalid methods, mark them as inactive in the database
      const invalidMethods = (data || []).filter(pm => !isValidPaymentMethod(pm));

      if (invalidMethods.length > 0) {
        console.log('Found', invalidMethods.length, 'invalid payment methods, marking as inactive');
        const invalidIds = invalidMethods.map(pm => pm.id);
        
        // Mark invalid methods as inactive
        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({ status: 'inactive' })
          .in('id', invalidIds);

        if (updateError) {
          console.error('Error marking invalid methods as inactive:', updateError);
        }
      }

      // Ensure at least one method is default if we have methods
      if (methods.length > 0 && !methods.some(m => m.isDefault)) {
        console.log('No default payment method found, setting first as default');
        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', methods[0].id);

        if (updateError) {
          console.error('Error setting default payment method:', updateError);
        } else {
          methods[0].isDefault = true;
        }
      }

      setPaymentMethods(methods);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadPaymentMethods:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadPaymentMethods();
      } else if (event === 'SIGNED_OUT') {
        setPaymentMethods([]);
        setAuthorizations([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshPaymentMethods = async () => {
    console.log('Refreshing payment methods...');
    await loadPaymentMethods();
  };

  const addPaymentMethod = (method: PaymentMethod) => {
    console.log('Adding payment method to context:', method);
    setPaymentMethods(prev => {
      // Check if this method already exists
      const exists = prev.some(m => m.id === method.id);
      if (exists) {
        console.log('Payment method already exists in context, skipping');
        return prev;
      }

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

  const removePaymentMethod = async (methodId: string) => {
    console.log('Removing payment method:', methodId);
    
    try {
      // Mark as inactive instead of deleting
      const { error } = await supabase
        .from('payment_methods')
        .update({ status: 'inactive' })
        .eq('id', methodId);

      if (error) {
        console.error('Error removing payment method:', error);
        throw error;
      }

      setPaymentMethods(prev => {
        const filtered = prev.filter(m => m.id !== methodId);
        
        // If we removed the default method and there are others, make the first one default
        const removedMethod = prev.find(m => m.id === methodId);
        if (removedMethod?.isDefault && filtered.length > 0) {
          // Update the first method to be default in the database
          supabase
            .from('payment_methods')
            .update({ is_default: true })
            .eq('id', filtered[0].id)
            .then(() => {
              console.log('Updated default payment method');
            });
          
          filtered[0].isDefault = true;
        }
        
        return filtered;
      });
    } catch (error) {
      console.error('Error in removePaymentMethod:', error);
      throw error;
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    console.log('Setting default payment method:', methodId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Unset all defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the new default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) {
        console.error('Error setting default payment method:', error);
        throw error;
      }

      setPaymentMethods(prev =>
        prev.map(m => ({ ...m, isDefault: m.id === methodId }))
      );
    } catch (error) {
      console.error('Error in setDefaultPaymentMethod:', error);
      throw error;
    }
  };

  const authorizePayment = async (
    productId: string,
    amount: number,
    paymentMethodId: string
  ): Promise<string> => {
    console.log('Authorizing payment:', { productId, amount, paymentMethodId });
    
    // TODO: Implement real Stripe payment authorization via Edge Function
    // For now, simulate the authorization
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
    
    // TODO: Implement real Stripe payment capture via Edge Function
    // For now, simulate the capture
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
    
    // TODO: Implement real Stripe authorization cancellation via Edge Function
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
    const defaultMethod = paymentMethods.find(m => m.isDefault);
    console.log('Getting default payment method:', defaultMethod);
    return defaultMethod;
  };

  const hasPaymentMethod = () => {
    // Check if there are any valid payment methods
    const hasValid = paymentMethods.length > 0;
    console.log('Checking for valid payment methods:', hasValid, 'total:', paymentMethods.length);
    return hasValid;
  };

  return (
    <PaymentContext.Provider
      value={{
        paymentMethods,
        authorizations,
        loading,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        authorizePayment,
        capturePayment,
        cancelAuthorization,
        getDefaultPaymentMethod,
        hasPaymentMethod,
        refreshPaymentMethods,
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
