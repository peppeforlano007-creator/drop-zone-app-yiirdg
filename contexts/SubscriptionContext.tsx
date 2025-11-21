
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/integrations/supabase/client';

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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('amount', { ascending: true });

      if (error) {
        console.error('Error loading subscription plans:', error);
        return;
      }

      const formattedPlans: SubscriptionPlan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        stripePriceId: plan.stripe_price_id,
        stripeProductId: plan.stripe_product_id,
        amount: Number(plan.amount),
        currency: plan.currency,
        interval: plan.interval as 'month' | 'year',
        features: Array.isArray(plan.features) ? plan.features : [],
        isActive: plan.is_active,
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error in loadPlans:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading subscriptions:', error);
        setLoading(false);
        return;
      }

      const formattedSubscriptions: Subscription[] = (data || []).map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        subscriptionPlanId: sub.subscription_plan_id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        stripeCustomerId: sub.stripe_customer_id,
        status: sub.status,
        currentPeriodStart: new Date(sub.current_period_start),
        currentPeriodEnd: new Date(sub.current_period_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
        trialStart: sub.trial_start ? new Date(sub.trial_start) : undefined,
        trialEnd: sub.trial_end ? new Date(sub.trial_end) : undefined,
        plan: sub.subscription_plans ? {
          id: sub.subscription_plans.id,
          name: sub.subscription_plans.name,
          description: sub.subscription_plans.description || '',
          stripePriceId: sub.subscription_plans.stripe_price_id,
          stripeProductId: sub.subscription_plans.stripe_product_id,
          amount: Number(sub.subscription_plans.amount),
          currency: sub.subscription_plans.currency,
          interval: sub.subscription_plans.interval,
          features: Array.isArray(sub.subscription_plans.features) ? sub.subscription_plans.features : [],
          isActive: sub.subscription_plans.is_active,
        } : undefined,
      }));

      setSubscriptions(formattedSubscriptions);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadSubscriptions:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    loadSubscriptions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadSubscriptions();
      } else if (event === 'SIGNED_OUT') {
        setSubscriptions([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshSubscriptions = async () => {
    await loadSubscriptions();
  };

  const createSubscription = async (priceId: string, paymentMethodId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { error: 'Not authenticated' };
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, paymentMethodId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create subscription' };
      }

      await refreshSubscriptions();
      return { clientSecret: result.clientSecret };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { error: error.message || 'Failed to create subscription' };
    }
  };

  const cancelSubscription = async (subscriptionId: string, cancelImmediately = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscriptionId, cancelImmediately }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to cancel subscription' };
      }

      await refreshSubscriptions();
      return { success: true };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: error.message || 'Failed to cancel subscription' };
    }
  };

  const hasActiveSubscription = () => {
    return subscriptions.some(sub => sub.status === 'active' || sub.status === 'trialing');
  };

  const activeSubscription = subscriptions.find(
    sub => sub.status === 'active' || sub.status === 'trialing'
  ) || null;

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
