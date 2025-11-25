
import React, { createContext, useContext, ReactNode } from 'react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  stripePriceId: string;
  stripeProductId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  subscriptionPlanId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  plan?: SubscriptionPlan;
}

interface SubscriptionContextType {
  subscriptions: Subscription[];
  plans: SubscriptionPlan[];
  activeSubscription: Subscription | null;
  loading: boolean;
  createSubscription: (priceId: string, paymentMethodId: string) => Promise<{ clientSecret?: string; error?: string }>;
  cancelSubscription: (subscriptionId: string, cancelImmediately?: boolean) => Promise<{ success: boolean; error?: string }>;
  refreshSubscriptions: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // Subscription feature has been removed - all services are now free
  const subscriptions: Subscription[] = [];
  const plans: SubscriptionPlan[] = [];
  const loading = false;

  const refreshSubscriptions = async () => {
    console.log('Subscription feature has been removed');
  };

  const createSubscription = async (priceId: string, paymentMethodId: string) => {
    console.log('Subscription feature has been removed');
    return { error: 'Subscription feature has been removed. All services are now free.' };
  };

  const cancelSubscription = async (subscriptionId: string, cancelImmediately = false) => {
    console.log('Subscription feature has been removed');
    return { success: false, error: 'Subscription feature has been removed' };
  };

  const hasActiveSubscription = () => {
    return false;
  };

  const activeSubscription = null;

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        plans,
        activeSubscription,
        loading,
        createSubscription,
        cancelSubscription,
        refreshSubscriptions,
        hasActiveSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
