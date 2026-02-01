
import { supabase } from '../lib/supabase';

export const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    // Fetch company details
    const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

    return {
        token: data.session?.access_token,
        user: data.user,
        company
    };
};

export const signup = async (username, email, password, companyName, currency) => {
    let { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
            }
        }
    });

    if (error) throw error;

    if (data.session && data.user) {
        const { error: companyError } = await supabase.from('companies').insert({
            user_id: data.user.id,
            name: companyName,
            currency: currency || 'USD',
            industry: 'Technology',
            fiscal_year_start: 'January'
        });

        if (companyError) {
            console.error("Failed to create company:", companyError);
        }

        return {
            token: data.session.access_token,
            user: data.user,
            company: { name: companyName, currency }
        };
    }

    // Hard fail if immediate login not possible (indicates Confirm email still ON)
    throw new Error('Immediate login failed. Please disable "Confirm email" in Supabase Auth settings.');
};

export const logout = async () => {
    await supabase.auth.signOut();
};

export const getMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};
