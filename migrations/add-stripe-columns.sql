-- ============================================================
-- NextGen Travel — Bookings Table Migration
-- Adds payment fields to existing bookings table
-- (payment_id stores the Paystack transaction reference)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add payment columns (safe — ignores if already exist)
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_id TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passport TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS identity_card TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hotel_reservation BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS travelers JSONB DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meal_preference TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null; END $$;
