-- Add city column to profiles table
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;
