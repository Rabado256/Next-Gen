-- ============================================================
-- NextGen Travel — Profiles Table Migration
-- Adds missing profile columns (country, phone) to the live DB.
-- Profile saves were failing with:
--   "Could not find the 'country' column of 'profiles'"
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
