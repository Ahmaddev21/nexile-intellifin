-- ============================================================
-- SUBSCRIPTION TIERS MIGRATION
-- Adds Basic/Pro tiers, team_addons, and member limit enforcement
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add plan_type column to subscriptions
-- ============================================================

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan_type text CHECK (plan_type IN ('basic', 'pro')) DEFAULT 'pro';

-- Backfill existing subscriptions as 'pro'
UPDATE public.subscriptions SET plan_type = 'pro' WHERE plan_type IS NULL;

-- ============================================================
-- 2. Create team_addons table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.team_addons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies ON DELETE CASCADE NOT NULL,
    additional_seats integer NOT NULL DEFAULT 1,
    status text CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    expires_at timestamptz,
    payment_gateway text CHECK (payment_gateway IN ('stripe', 'myfatoorah')),
    payment_id text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_addons ENABLE ROW LEVEL SECURITY;

-- RLS: Company members can view their team addons
DROP POLICY IF EXISTS "Company members can view team addons" ON public.team_addons;
CREATE POLICY "Company members can view team addons"
ON public.team_addons FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = team_addons.company_id
        AND cu.user_id = auth.uid()
    )
);

-- Insert/Update restricted to Service Role (Edge Functions) only

-- ============================================================
-- 3. Helper: Get total seat limit for a company
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_seat_limit(p_company_id uuid)
RETURNS integer AS $$
DECLARE
    v_base_limit integer := 5;
    v_addon_seats integer := 0;
BEGIN
    SELECT COALESCE(SUM(additional_seats), 0) INTO v_addon_seats
    FROM public.team_addons
    WHERE company_id = p_company_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());

    RETURN v_base_limit + v_addon_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Helper: Get current team member count
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_team_count(p_company_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.company_users
    WHERE company_id = p_company_id;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Update join_company_by_code to enforce team limit
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_company_by_code(code text)
RETURNS json AS $$
DECLARE
    v_company_id uuid;
    v_company_name text;
    v_currency text;
    v_current_count integer;
    v_seat_limit integer;
BEGIN
    SELECT id, name, currency INTO v_company_id, v_company_name, v_currency
    FROM public.companies
    WHERE join_code = code;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Invalid join code';
    END IF;

    -- Check if user is already a member (allow re-join without counting)
    IF EXISTS (
        SELECT 1 FROM public.company_users
        WHERE company_id = v_company_id AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object(
            'id', v_company_id,
            'name', v_company_name,
            'currency', v_currency
        );
    END IF;

    -- Enforce team member limit
    v_current_count := public.get_current_team_count(v_company_id);
    v_seat_limit := public.get_team_seat_limit(v_company_id);

    IF v_current_count >= v_seat_limit THEN
        RAISE EXCEPTION 'Team member limit reached (% of %). Ask your admin to purchase additional seats.', v_current_count, v_seat_limit;
    END IF;

    -- Add user as member
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (v_company_id, auth.uid(), 'member')
    ON CONFLICT (company_id, user_id) DO NOTHING;

    RETURN json_build_object(
        'id', v_company_id,
        'name', v_company_name,
        'currency', v_currency
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC to get team info (for frontend display)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_info(p_company_id uuid)
RETURNS json AS $$
DECLARE
    v_count integer;
    v_limit integer;
BEGIN
    -- Only allow company members to query
    IF NOT EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.company_id = p_company_id AND cu.user_id = auth.uid()
    ) THEN
        RETURN json_build_object('error', 'unauthorized');
    END IF;

    v_count := public.get_current_team_count(p_company_id);
    v_limit := public.get_team_seat_limit(p_company_id);

    RETURN json_build_object(
        'current_count', v_count,
        'seat_limit', v_limit,
        'seats_available', v_limit - v_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
