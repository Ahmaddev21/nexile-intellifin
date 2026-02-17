import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Subscription {
    id: string;
    status: 'active' | 'past_due' | 'canceled' | 'trial' | 'expired';
    plan_id: string;
    plan_type: 'basic' | 'pro';
    current_period_end: string;
    currency: string;
}

export const useSubscription = (companyId?: string) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const prevCompanyId = useRef(companyId);

    // When companyId changes, immediately set loading to true
    if (companyId !== prevCompanyId.current) {
        prevCompanyId.current = companyId;
        if (companyId) {
            setIsLoading(true);
        }
    }

    const fetchSubscription = async () => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            console.log('Fetching subscription for company:', companyId);
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();

            if (error) throw error;

            console.log('Subscription data fetched:', data);
            setSubscription(data);
        } catch (err: any) {
            console.error('Error fetching subscription:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [companyId]);

    // Helper to check if active
    const isActive = () => {
        if (!subscription) return false;

        const isStatusActive = ['active', 'trial'].includes(subscription.status);
        const notExpired = subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : true;

        return isStatusActive && notExpired;
    };

    // Helper to check if Pro plan
    const isPro = () => {
        if (!subscription) return false;
        return isActive() && subscription.plan_type === 'pro';
    };

    return { subscription, isLoading, error, isActive, isPro, refetch: fetchSubscription };
};
