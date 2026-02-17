import React, { useState } from 'react';
import { Check, Loader2, Shield, CreditCard, X, Star, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PricingProps {
    companyId: string;
    currentUserId: string;
    onUpgradeSuccess: () => void;
}

const Pricing: React.FC<PricingProps> = ({ companyId, currentUserId, onUpgradeSuccess }) => {
    const [currency, setCurrency] = useState<'USD' | 'QAR'>('USD');
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: currency === 'QAR' ? 499 : 137,
            currency: currency,
            description: 'Essential financial tools for small teams',
            features: [
                'Unlimited Invoices & Expenses',
                'Financial Reports & Analytics',
                'AI Financial Analyst',
                'Multi-User Access (up to 5)',
                'Priority Support',
            ],
            excluded: [
                'Documentation System (File Upload)',
            ],
            recommended: false,
        },
        {
            id: 'pro',
            name: 'Pro',
            price: currency === 'QAR' ? 599 : 165,
            currency: currency,
            description: 'Complete suite with document management',
            features: [
                'Unlimited Invoices & Expenses',
                'Financial Reports & Analytics',
                'Multi-User Access (up to 5)',
                'Priority Support',
                'Documentation System (File Upload)',
            ],
            excluded: [],
            recommended: true,
        },
    ];

    const handleUpgrade = async (planType: string) => {
        try {
            setIsLoading(planType);

            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    plan_type: planType,
                    currency: currency,
                    company_id: companyId,
                    user_id: currentUserId,
                    return_url: window.location.origin,
                },
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
            setIsLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-5xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Unlock the full potential of Intellifin. Annual billing — secure, intelligent, and designed for growth.
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

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-slate-800 rounded-3xl p-8 border overflow-hidden transform hover:scale-105 transition-all duration-300 ${
                                plan.recommended
                                    ? 'border-indigo-500/50 shadow-2xl shadow-indigo-900/30'
                                    : 'border-slate-700/50 shadow-xl shadow-slate-900/20'
                            }`}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Recommended
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                            <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">
                                    {plan.currency === 'USD' ? '$' : 'QAR '}{plan.price}
                                </span>
                                <span className="text-slate-400">/year</span>
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-300">
                                        <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                                {plan.excluded.map((feature, i) => (
                                    <li key={`ex-${i}`} className="flex items-center gap-3 text-slate-500">
                                        <div className="w-5 h-5 bg-slate-700/50 rounded-full flex items-center justify-center flex-shrink-0">
                                            <X className="w-3 h-3 text-slate-600" />
                                        </div>
                                        <span className="line-through">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={isLoading !== null}
                                className={`w-full py-4 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    plan.recommended
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                        : 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-700/20'
                                }`}
                            >
                                {isLoading === plan.id ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                    </>
                                ) : (
                                    <>
                                        Get {plan.name} <CreditCard className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" /> Secure payment via {currency === 'USD' ? 'Stripe' : 'MyFatoorah'}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Add-on info */}
                <div className="text-center mt-8 text-slate-500 text-sm">
                    <p>Both plans include up to 5 team members. Additional seats available for {currency === 'QAR' ? '99 QAR' : '$27'}/seat/year.</p>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
