-- AUDIT LOGS V2 — Enhanced with company_id for multi-workspace support
-- Run this AFTER the original audit_logs.sql (or standalone if starting fresh)

-- 1. Add company_id column if it doesn't exist
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2. Drop old RLS policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- 3. Create new RLS policy — All company members can view their company's logs
CREATE POLICY "Company members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
    )
  );

-- 4. No INSERT/UPDATE/DELETE policies for users — only the trigger writes logs
-- (RLS is enabled, so by default all mutations are blocked for users)

-- 5. Replace trigger function to capture company_id automatically
CREATE OR REPLACE FUNCTION public.log_financial_change()
RETURNS trigger AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_company_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_old_data := null;
    v_new_data := to_jsonb(NEW);
    v_company_id := NEW.company_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_company_id := NEW.company_id;
  ELSIF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := null;
    v_company_id := OLD.company_id;
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, company_id)
  VALUES (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    auth.uid(),
    v_company_id
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-apply triggers (same as original, ensures updated function is used)
DROP TRIGGER IF EXISTS audit_log_invoices ON public.invoices;
CREATE TRIGGER audit_log_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE PROCEDURE public.log_financial_change();

DROP TRIGGER IF EXISTS audit_log_expenses ON public.expenses;
CREATE TRIGGER audit_log_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.log_financial_change();

DROP TRIGGER IF EXISTS audit_log_projects ON public.projects;
CREATE TRIGGER audit_log_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.log_financial_change();

DROP TRIGGER IF EXISTS audit_log_payable_invoices ON public.payable_invoices;
CREATE TRIGGER audit_log_payable_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.payable_invoices
  FOR EACH ROW EXECUTE PROCEDURE public.log_financial_change();

DROP TRIGGER IF EXISTS audit_log_credit_notes ON public.credit_notes;
CREATE TRIGGER audit_log_credit_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
  FOR EACH ROW EXECUTE PROCEDURE public.log_financial_change();
