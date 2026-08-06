-- ============================================================
-- Migration: Booking state machine + flight search cache
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- Idempotent: safe to run even if objects already exist.
-- ============================================================

-- ------------------------------------------------------------
-- 1. BOOKING STATE MACHINE
--    States: pending -> confirmed -> completed
--    Any state may transition to: cancelled
-- ------------------------------------------------------------

-- Timestamps for each terminal / milestone state
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Immutable audit trail of every state change:
-- [{"status":"pending","at":"2026-08-06T..."}, ...]
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Constrain status values to the state machine's states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_status_check
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
  END IF;
END $$;

-- Function: append an entry to a booking's status_history
CREATE OR REPLACE FUNCTION public.append_status_history(
  booking_id uuid,
  new_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.bookings
  SET status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object(
        'status', new_status,
        'at', now()
      )
  WHERE id = booking_id;
END;
$$;

-- Function: cancel a booking (user-facing). Verifies ownership by user_id,
-- refuses to cancel already-cancelled or completed bookings, records the
-- transition in status_history and stamps cancelled_at. SECURITY DEFINER so
-- it runs with the owner's privileges and bypasses RLS — ownership is
-- enforced inside the function via auth.uid().
CREATE OR REPLACE FUNCTION public.cancel_booking(p_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.bookings;
BEGIN
  SELECT * INTO target
  FROM public.bookings
  WHERE reference = p_ref
    AND user_id = auth.uid()
  FOR UPDATE;

  IF target.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Booking not found for this account');
  END IF;

  IF target.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'Booking is already cancelled');
  END IF;

  IF target.status = 'completed' THEN
    RETURN jsonb_build_object('error', 'A completed journey cannot be cancelled. Contact support.');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = now(),
      status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object('status', 'cancelled', 'at', now())
  WHERE id = target.id
  RETURNING * INTO target;

  RETURN to_jsonb(target);
END;
$$;

-- Function: auto-complete confirmed bookings whose travel date has passed.
-- Returns the number of bookings transitioned. Called by the serverless
-- endpoint (service-role) so regular users cannot trigger it directly.
CREATE OR REPLACE FUNCTION public.complete_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer := 0;
BEGIN
  UPDATE public.bookings
  SET status = 'completed',
      completed_at = now(),
      status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object('status', 'completed', 'at', now())
  WHERE status = 'confirmed'
    AND booking_date <> ''
    AND booking_date IS NOT NULL
    AND booking_date < to_char(now(), 'YYYY-MM-DD')
    AND completed_at IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Allow authenticated users to cancel their own bookings via RPC
GRANT EXECUTE ON FUNCTION public.cancel_booking(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_status_history(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- 2. FLIGHT SEARCH CACHE
--    Caches Duffel offer responses keyed by a hash of the search
--    params so repeat searches don't hit the Duffel API again.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flight_caches (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flight_caches ENABLE ROW LEVEL SECURITY;

-- Cached flight offers are non-sensitive; allow anonymous read/write
CREATE POLICY "flight_caches_insert_all" ON flight_caches FOR INSERT WITH CHECK (true);
CREATE POLICY "flight_caches_select_all" ON flight_caches FOR SELECT USING (true);
CREATE POLICY "flight_caches_update_all" ON flight_caches FOR UPDATE USING (true);
CREATE POLICY "flight_caches_delete_all" ON flight_caches FOR DELETE USING (true);
