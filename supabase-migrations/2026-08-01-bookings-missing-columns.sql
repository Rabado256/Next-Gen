-- Migration: add missing bookings columns to the LIVE Supabase database.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent: safe to run even if a column already exists.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS from_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS to_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'unknown';
