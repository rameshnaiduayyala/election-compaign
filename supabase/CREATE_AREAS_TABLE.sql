-- ==============================================================================
-- AREAS MANAGEMENT & VOTER AREA ASSIGNMENT MIGRATION
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create the `areas` table if it does not exist
CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  ward_number text DEFAULT '2',
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on `areas`
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- 3. Policy to allow reading and writing areas by authorized users
DROP POLICY IF EXISTS "allow_all_areas" ON public.areas;
CREATE POLICY "allow_all_areas" ON public.areas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Add `area_id` and `area_name` to `voters` table
ALTER TABLE public.voters 
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;

ALTER TABLE public.voters 
  ADD COLUMN IF NOT EXISTS area_name text;

-- 5. Create index for fast area filtering
CREATE INDEX IF NOT EXISTS voters_area_name_idx ON public.voters(area_name);
CREATE INDEX IF NOT EXISTS voters_area_id_idx ON public.voters(area_id);

-- 6. Insert initial / default areas for Ward 2 Venkayammapeta
INSERT INTO public.areas (name, ward_number, description) VALUES
  ('Ramalayam Veedhi', '2', 'Ramalayam Temple Street & surroundings'),
  ('Main Road Street', '2', 'Main Road Commercial & Residential'),
  ('BC Colony', '2', 'BC Colony community sector'),
  ('Golla Veedhi', '2', 'Golla family residential street'),
  ('Kadiyala Street', '2', 'Kadiyala lane & neighborhood'),
  ('Panchayat Office Ward', '2', 'Panchayat office area')
ON CONFLICT (name) DO NOTHING;

-- Verification query
SELECT * FROM public.areas ORDER BY name;
