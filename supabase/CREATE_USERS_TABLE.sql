-- ========================================================
-- CREATE USERS TABLE IN SUPABASE FOR DIRECT LOGIN
-- Supports 4 Role Types:
-- 1. admin: All rights
-- 2. agent: Change/edit Party Tag (isysrcp, isTDP, isJSP, other)
-- 3. user: Read-only access
-- 4. distributor: Change/edit Amount
-- ========================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text,
  password text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user', -- 'admin', 'agent', 'user', 'distributor'
  phone text,
  ward_number text DEFAULT '2',
  is_active boolean NOT NULL DEFAULT true,
  bound_device_id text,
  bound_device_name text,
  bound_device_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and allow application access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_users" ON public.users;
CREATE POLICY "allow_read_users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_insert_users" ON public.users;
CREATE POLICY "allow_insert_users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_users" ON public.users;
CREATE POLICY "allow_update_users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_delete_users" ON public.users;
CREATE POLICY "allow_delete_users" ON public.users FOR DELETE USING (true);

-- Insert Default Accounts
INSERT INTO public.users (username, email, password, full_name, role, ward_number, is_active)
VALUES
  ('superadmin', 'superadmin@election.com', 'superadmin123', 'Super Administrator', 'super_admin', '2', true),
  ('admin', 'admin@election.com', 'admin123', 'Administrator', 'admin', '2', true),
  ('agent', 'agent@election.com', 'agent123', 'Field Booth Agent', 'agent', '2', true),
  ('user', 'user@election.com', 'user123', 'Observer / Readonly User', 'user', '2', true),
  ('distributor', 'distributor@election.com', 'dist123', 'Fund Disbursement Officer', 'distributor', '2', true)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
