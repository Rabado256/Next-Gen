-- Migration: allow admins to read all itineraries (needed for the admin
-- Excel export feature). Without this policy, RLS blocks the admin dashboard
-- from exporting itinerary data.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent: safe to run even if the policy already exists.

CREATE POLICY "itineraries_select_admin" ON itineraries
  FOR SELECT USING (public.is_admin());

-- Users can still only see their own itineraries; the existing RLS already
-- restricts per-user writes. This adds an admin read-all path only.
