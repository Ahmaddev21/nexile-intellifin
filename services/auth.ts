
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

export const uploadAvatar = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
};

export const updateProfileAvatar = async (userId, avatarUrl) => {
    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

    if (error) throw error;

    return avatarUrl;
};

export const getProfile = async (userId) => {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    return data;
};
