-- ============================================================
-- Migration: Saved searches (Phase 4 - user accounts)
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- Idempotent: safe to run even if objects already exist.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_type text NOT NULL DEFAULT 'destination',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx
  ON public.saved_searches (user_id);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users may only manage their own saved searches
CREATE POLICY "saved_searches_own_insert" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_searches_own_select" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_searches_own_delete" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);
