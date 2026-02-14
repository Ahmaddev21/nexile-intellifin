
import { supabase } from '../lib/supabase';

export const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    let company = undefined;
    let role: string | undefined = undefined;

    // Method 1: Fetch company via company_users join (preferred)
    const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('role, company:companies(*)')
        .eq('user_id', data.user.id)
        .maybeSingle();

    if (companyUser && companyUser.company) {
        company = Array.isArray(companyUser.company) ? companyUser.company[0] : companyUser.company;
        role = companyUser.role;
        console.log('Login: Company found via company_users:', company?.name);
    } else {
        // Method 2: Fallback - direct query on companies table
        console.warn('Login: company_users query failed or empty, trying direct fallback...', companyError);
        const { data: ownCompany } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

        if (ownCompany) {
            company = ownCompany;
            role = 'admin'; // If they own the company, they're admin
            console.log('Login: Company found via direct lookup:', ownCompany.name);
        }
    }

    return {
        token: data.session?.access_token,
        user: data.user,
        company,
        role
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

    // Handle case where signUp doesn't return a session
    // This happens when: email already exists, or email confirmation is ON
    if (!data.session) {
        console.warn('No session after signup - attempting auto sign-in...');
        // Try to sign in immediately (works if email confirmation is OFF)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (signInError) {
            throw new Error('Account created but auto sign-in failed. Please sign in manually.');
        }
        data = signInData as any;
    }

    if (data.session && data.user) {
        let company;
        let role = 'member';

        // 2. Determine: Create Company OR Join Company
        if (joinCode) {
            // JOIN Mode
            const { data: joinData, error: joinError } = await supabase
                .rpc('join_company_by_code', { code: joinCode });

            if (joinError) {
                console.error('Join company error:', joinError);
                throw joinError;
            }
            company = joinData;

        } else if (companyName) {
            // CREATE Mode
            console.log('Creating company:', companyName, currency);
            const { data: createData, error: createError } = await supabase
                .rpc('create_company_with_admin', {
                    name: companyName,
                    currency: currency || 'USD'
                });

            if (createError) {
                console.error('Create company error:', createError);
                throw createError;
            }
            console.log('Company created:', createData);
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
