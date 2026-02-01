-- Payable Invoices
create table public.payable_invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  vendor_name text not null,
  amount numeric default 0,
  date date,
  due_date date,
  status text check (status in ('draft', 'received', 'paid', 'overdue', 'cancelled')),
  description text,
  created_at timestamptz default now()
);

-- Credit Notes
create table public.credit_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  invoice_id uuid references public.invoices on delete set null,
  amount numeric default 0,
  reason text,
  date date,
  status text check (status in ('draft', 'issued', 'applied')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.payable_invoices enable row level security;
alter table public.credit_notes enable row level security;

-- Policies for Payable Invoices
create policy "Users can view own payable invoices" on public.payable_invoices for select using (auth.uid() = user_id);
create policy "Users can insert own payable invoices" on public.payable_invoices for insert with check (auth.uid() = user_id);
create policy "Users can update own payable invoices" on public.payable_invoices for update using (auth.uid() = user_id);
create policy "Users can delete own payable invoices" on public.payable_invoices for delete using (auth.uid() = user_id);

-- Policies for Credit Notes
create policy "Users can view own credit notes" on public.credit_notes for select using (auth.uid() = user_id);
create policy "Users can insert own credit notes" on public.credit_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own credit notes" on public.credit_notes for update using (auth.uid() = user_id);
create policy "Users can delete own credit notes" on public.credit_notes for delete using (auth.uid() = user_id);
