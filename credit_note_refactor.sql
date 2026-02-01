-- Credit Note Refactor Migration
-- 1. Drop old table if exists (Clean Slate)
DROP TABLE IF EXISTS public.credit_notes CASCADE;

-- 2. Create the new credit_notes table
CREATE TABLE public.credit_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'applied', 'void')) DEFAULT 'applied',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own credit notes" ON public.credit_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit notes" ON public.credit_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit notes" ON public.credit_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit notes" ON public.credit_notes FOR DELETE USING (auth.uid() = user_id);

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_credit_notes_updated_at
    BEFORE UPDATE ON public.credit_notes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Trigger to sync Invoice status and check balance
CREATE OR REPLACE FUNCTION fn_sync_invoice_on_credit_change()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_credited NUMERIC(15, 2);
    v_invoice_amount NUMERIC(15, 2);
    v_new_status TEXT;
BEGIN
    -- Determine target invoice
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get invoice total
    SELECT amount INTO v_invoice_amount FROM public.invoices WHERE id = v_invoice_id;

    -- Calculate total applied credits (excluding void/pending if preferred, but usually applied)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_credited 
    FROM public.credit_notes 
    WHERE invoice_id = v_invoice_id AND status = 'applied';

    -- Validation: Total credit cannot exceed invoice amount
    IF v_total_credited > v_invoice_amount THEN
        RAISE EXCEPTION 'Total credit notes (%.2f) exceed invoice total (%.2f)', v_total_credited, v_invoice_amount;
    END IF;

    -- Determine new status
    IF v_total_credited = v_invoice_amount THEN
        v_new_status := 'fully_credited';
    ELSIF v_total_credited > 0 THEN
        v_new_status := 'partially_credited';
    ELSE
        -- If no credits applied, we logic back to 'sent' or keep current if it was 'paid'
        -- For simplicity, if it was credited and now is not, we set to 'sent' unless it was already handled.
        -- We'll check the current status.
        SELECT status INTO v_new_status FROM public.invoices WHERE id = v_invoice_id;
        IF v_new_status IN ('fully_credited', 'partially_credited') THEN
            v_new_status := 'sent';
        END IF;
    END IF;

    -- Update invoice
    UPDATE public.invoices 
    SET status = v_new_status
    WHERE id = v_invoice_id;

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_invoice_on_credit_change
    AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
    FOR EACH ROW EXECUTE PROCEDURE fn_sync_invoice_on_credit_change();
