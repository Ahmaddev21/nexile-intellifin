
import { supabase } from '../lib/supabase';

export const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    // Fetch company association
    // We get the company via the company_users table
    const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('role, company:companies(*)')
        .eq('user_id', data.user.id)
        .single();

    if (companyError && companyError.code !== 'PGRST116') {
        // Log error but don't fail login if user has no company yet (edge case)
        console.error("Error fetching company:", companyError);
    }

    return {
        token: data.session?.access_token,
        user: data.user,
        company: companyUser?.company,
        role: companyUser?.role
    };
};

export const signup = async (username, email, password, companyName, currency, joinCode) => {
    // 1. Sign up the user
    let { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username }
        }
    });

    if (error) throw error;

    if (data.session && data.user) {
        let company;
        let role = 'member';

        // 2. Determine: Create Company OR Join Company
        if (joinCode) {
            // JOIN Mode
            const { data: joinData, error: joinError } = await supabase
                .rpc('join_company_by_code', { code: joinCode });

            if (joinError) throw joinError; // Invalid code probably
            company = joinData;

        } else if (companyName) {
            // CREATE Mode
            const { data: createData, error: createError } = await supabase
                .rpc('create_company_with_admin', {
                    name: companyName,
                    currency: currency || 'USD'
                });

            if (createError) throw createError;
            company = createData;
            role = 'admin';
        }

        return {
            token: data.session.access_token,
            user: data.user,
            company,
            role
        };
    }

    // Hard fail if immediate login not possible (Confirm email ON)
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
