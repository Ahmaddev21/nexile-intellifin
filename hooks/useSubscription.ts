import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Subscription {
    id: string;
    status: 'active' | 'past_due' | 'canceled' | 'trial' | 'expired';
    plan_id: string;
    current_period_end: string;
    currency: string;
}

export const useSubscription = (companyId?: string) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscription = async () => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();

            if (error) throw error;

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
        if (!subscription) return false; // No sub = Inactive (unless we want default trial, but requirement says "User signs up -> status=inactive")

        const isStatusActive = ['active', 'trial'].includes(subscription.status);
        const notExpired = subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : true;

        return isStatusActive && notExpired;
    };

    return { subscription, isLoading, error, isActive, refetch: fetchSubscription };
};
