import React, { useState } from 'react';
import { Check, Loader2, Shield, Globe, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PricingProps {
    companyId: string;
    currentUserId: string;
    onUpgradeSuccess: () => void;
}

const Pricing: React.FC<PricingProps> = ({ companyId, currentUserId, onUpgradeSuccess }) => {
    const [billingCycle, setBillingCycle] = useState<'annual'>('annual');
    const [currency, setCurrency] = useState<'USD' | 'QAR'>('USD');
    const [isLoading, setIsLoading] = useState(false);

    const plans = [
        {
            id: 'pro_annual',
            name: 'Pro Annual',
            price: currency === 'QAR' ? 499 : 139, // Approx USD conversion
            currency: currency,
            features: [
                'Unlimited Invoices & Expenses',
                'Advanced Financial Reports',
                'AI Financial Analyst',
                'Multi-User Access',
                'Priority Support',
                'Secure Document Storage'
            ],
            recommended: true
        }
    ];

    const handleUpgrade = async (plan: any) => {
        try {
            setIsLoading(true);

            // Call Edge Function to create checkout session
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    price_id: plan.id,
                    currency: currency,
                    company_id: companyId,
                    user_id: currentUserId,
                    return_url: window.location.origin
                }
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL returned');
            }

        } catch (err: any) {
            console.error('Checkout failed:', err);
            alert('Failed to start checkout: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Upgrade to Pro</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Unlock the full potential of Intellifin with our comprehensive financial suite.
                        Secure, intelligent, and designed for growth.
                    </p>
                </div>

                {/* Currency Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-slate-800 p-1 rounded-xl flex">
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'USD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            International (USD)
                        </button>
                        <button
                            onClick={() => setCurrency('QAR')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'QAR' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Qatar (QAR)
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
                    {plans.map((plan) => (
                        <div key={plan.id} className="relative bg-slate-800 rounded-3xl p-8 border border-indigo-500/30 shadow-2xl shadow-indigo-900/20 overflow-hidden transform hover:scale-105 transition-all duration-300">
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                    Recommended
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">
                                    {plan.currency === 'USD' ? '$' : 'QAR '}{plan.price}
                                </span>
                                <span className="text-slate-400">/year</span>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-300">
                                        <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan)}
                                disabled={isLoading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                    </>
                                ) : (
                                    <>
                                        Upgrade Now <CreditCard className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" /> Secure payment via {currency === 'USD' ? 'Stripe' : 'MyFatoorah'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Pricing;
