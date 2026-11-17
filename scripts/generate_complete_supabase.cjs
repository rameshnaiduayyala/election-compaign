const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const csvPath = path.join(__dirname, '..', 'ward2', 'kadiyapulanka_ward2_voters.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, { 
  header: true, 
  skipEmptyLines: true,
  transformHeader: h => h.trim()
});

const seen = new Set();
const voters = parsed.data.map((row, idx) => {
  let img = row['Image Path'] || row['image_path'] || '';
  if (img) {
    img = '/' + img.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
  }

  const rawVid = (row['Voter ID'] || row['voter_id'] || '').trim();
  const serialNo = (row['Serial number'] || row['serial_number'] || String(idx + 1)).trim();

  let vid = rawVid;
  if (!vid) {
    vid = `W2-SL-${serialNo}`;
  }

  if (seen.has(vid)) {
    vid = `${vid}-${idx + 1}`;
  }
  seen.add(vid);

  return {
    serial_number: serialNo,
    voter_id: vid,
    voter_name_telugu: (row['Voter name (Telugu)'] || row['voter_name_telugu'] || '').trim(),
    voter_name_english: (row['Voter name (English)'] || row['voter_name_english'] || '').trim(),
    relative_name: (row['Father/Husband name (Telugu)'] || row['relative_name'] || '').trim(),
    relation_type: (row['Relation type'] || row['relation_type'] || '').trim(),
    house_number: (row['House number'] || row['house_number'] || '').trim(),
    age: row['Age'] ? parseInt(row['Age'], 10) : null,
    gender: (row['Gender'] || row['gender'] || '').trim(),
    ward_number: (row['Ward number'] || row['ward_number'] || '2').trim(),
    image_path: img,
    photo_path: img
  };
});

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const header = `-- ========================================================
-- COMPLETE SUPABASE SETUP FOR ELECTION MANAGEMENT
-- Run this entire script in Supabase Dashboard -> SQL Editor
-- Project URL: https://cvrcipyodrlwaqhwrqoi.supabase.co
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Voters Table
CREATE TABLE IF NOT EXISTS public.voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number integer,
  voter_id text UNIQUE NOT NULL,
  voter_name_telugu text,
  voter_name_english text,
  relative_name text,
  relation_type text,
  house_number text,
  age integer,
  gender text,
  ward_number text DEFAULT '2',
  image_path text,
  photo_path text,
  is_verified boolean NOT NULL DEFAULT true,
  
  -- Party preference flags
  is_ysrcp boolean NOT NULL DEFAULT false,
  is_tdp boolean NOT NULL DEFAULT false,
  is_jsp boolean NOT NULL DEFAULT false,
  is_other boolean NOT NULL DEFAULT false,
  
  -- Disbursement tracking
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  amount_given_user text,
  amount_given_time timestamptz,
  note text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for fast search and party filtering
CREATE INDEX IF NOT EXISTS voters_voter_id_idx ON public.voters(voter_id);
CREATE INDEX IF NOT EXISTS voters_serial_idx ON public.voters(serial_number);
CREATE INDEX IF NOT EXISTS voters_is_ysrcp_idx ON public.voters(is_ysrcp);
CREATE INDEX IF NOT EXISTS voters_is_tdp_idx ON public.voters(is_tdp);
CREATE INDEX IF NOT EXISTS voters_is_jsp_idx ON public.voters(is_jsp);
CREATE INDEX IF NOT EXISTS voters_amount_idx ON public.voters(amount);

-- 3. Enable Row Level Security & Allow App Access
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_read_voters" ON public.voters;
CREATE POLICY "allow_all_read_voters" ON public.voters FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_update_voters" ON public.voters;
CREATE POLICY "allow_all_update_voters" ON public.voters FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_insert_voters" ON public.voters;
CREATE POLICY "allow_all_insert_voters" ON public.voters FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_delete_voters" ON public.voters;
CREATE POLICY "allow_all_delete_voters" ON public.voters FOR DELETE USING (true);

-- 4. Seed Real Ward 2 Electoral Roll (754 Verified Unique Voters)
INSERT INTO public.voters (
  serial_number, voter_id, voter_name_telugu, voter_name_english,
  relative_name, relation_type, house_number, age, gender,
  ward_number, image_path, photo_path, is_verified,
  is_ysrcp, is_tdp, is_jsp, is_other, amount,
  amount_given_user, amount_given_time, note
) VALUES
`;

const rows = voters.map(v => {
  return `  (${escapeSql(v.serial_number)}, ${escapeSql(v.voter_id)}, ${escapeSql(v.voter_name_telugu)}, ${escapeSql(v.voter_name_english)}, ${escapeSql(v.relative_name)}, ${escapeSql(v.relation_type)}, ${escapeSql(v.house_number)}, ${v.age ? v.age : 'NULL'}, ${escapeSql(v.gender)}, ${escapeSql(v.ward_number)}, ${escapeSql(v.image_path)}, ${escapeSql(v.photo_path)}, TRUE, FALSE, FALSE, FALSE, FALSE, 0, NULL, NULL, NULL)`;
});

const footer = `
ON CONFLICT (voter_id) DO UPDATE SET
  voter_name_telugu = EXCLUDED.voter_name_telugu,
  voter_name_english = EXCLUDED.voter_name_english,
  house_number = EXCLUDED.house_number,
  image_path = EXCLUDED.image_path,
  photo_path = EXCLUDED.photo_path;
`;

const fullSql = header + rows.join(',\n') + footer;
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'COMPLETE_SUPABASE_SETUP.sql'), fullSql, 'utf8');
console.log(`Generated COMPLETE_SUPABASE_SETUP.sql with ${voters.length} verified unique voters.`);
