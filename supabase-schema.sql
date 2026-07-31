-- ============================================================
-- NextGen Travel — Supabase Schema
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- 1. PROFILES (extends auth.users)
-- Auto-created on signup via trigger; stores preferences & role
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  passport TEXT DEFAULT '',            -- last passport country detected
  identity_card TEXT DEFAULT '',        -- last ID card country detected
  emergency TEXT DEFAULT '',            -- emergency contact phone
  emergency_name TEXT DEFAULT '',       -- emergency contact name
  pref_hotel BOOLEAN DEFAULT false,     -- booking: include hotel?
  pref_food TEXT DEFAULT 'none',        -- dietary preference
  avatar_url TEXT DEFAULT '',
  country TEXT DEFAULT '',              -- user-selected country
  phone TEXT DEFAULT '',                -- contact phone number
  is_admin BOOLEAN DEFAULT false,       -- admin flag
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DESTINATIONS
CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  edition TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price INTEGER DEFAULT 0,
  country TEXT DEFAULT '',
  vibe TEXT DEFAULT 'romantic',
  img TEXT DEFAULT '',
  steps JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dest_id TEXT,
  guest_name TEXT DEFAULT '',
  guest_email TEXT DEFAULT '',
  guest_phone TEXT DEFAULT '',
  booking_date TEXT DEFAULT '',
  guests INTEGER DEFAULT 1,
  total DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  hotel BOOLEAN DEFAULT false,
  hotel_reservation BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed',
  ref TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  payment_id TEXT DEFAULT '',
  passport TEXT DEFAULT '',
  identity_card TEXT DEFAULT '',
  special_requests TEXT DEFAULT '',
  travelers JSONB DEFAULT '[]'::jsonb,
  from_location TEXT DEFAULT '',
  to_location TEXT DEFAULT '',
  doc_type TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  dest_id TEXT REFERENCES destinations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ITINERARIES
CREATE TABLE IF NOT EXISTS itineraries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  days JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  destination_id TEXT DEFAULT '',
  departure_date TEXT DEFAULT '',
  departure_time TEXT DEFAULT '',
  max_capacity INTEGER DEFAULT 20,
  booked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NEWSLETTER SUBSCRIBERS
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  admin_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to avoid recursive RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- PROFILES: users can read/update their own (except is_admin); admins can read all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (is_admin = false OR is_admin IS NULL);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "profiles_insert_trigger" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (public.is_admin());

-- DESTINATIONS: public read, admin write
CREATE POLICY "destinations_select_all" ON destinations FOR SELECT USING (true);
CREATE POLICY "destinations_insert_admin" ON destinations FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "destinations_update_admin" ON destinations FOR UPDATE USING (public.is_admin());
CREATE POLICY "destinations_delete_admin" ON destinations FOR DELETE USING (public.is_admin());

-- BOOKINGS: users see own, admins see all
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_select_admin" ON bookings FOR SELECT USING (public.is_admin());
CREATE POLICY "bookings_update_admin" ON bookings FOR UPDATE USING (public.is_admin());
CREATE POLICY "bookings_delete_admin" ON bookings FOR DELETE USING (public.is_admin());

-- REVIEWS: all authenticated can create, public read
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- TRIPS: admin management only (write), public can read active trips for availability
CREATE POLICY "trips_select_public" ON trips FOR SELECT USING (status = 'active' OR status IS NULL);
CREATE POLICY "trips_select_admin" ON trips FOR SELECT USING (public.is_admin());
CREATE POLICY "trips_insert_admin" ON trips FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "trips_update_admin" ON trips FOR UPDATE USING (public.is_admin());
CREATE POLICY "trips_delete_admin" ON trips FOR DELETE USING (public.is_admin());

-- AUDIT LOGS: admin read, authenticated insert
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "audit_logs_insert_auth" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- OTHER tables: public insert, admin management
CREATE POLICY "contacts_insert_all" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "contacts_select_admin" ON contacts FOR SELECT USING (public.is_admin());
CREATE POLICY "contacts_update_admin" ON contacts FOR UPDATE USING (public.is_admin());
CREATE POLICY "contacts_delete_admin" ON contacts FOR DELETE USING (public.is_admin());

CREATE POLICY "newsletter_insert_all" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_select_admin" ON newsletter_subscribers FOR SELECT USING (public.is_admin());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED DATA: Admin user placeholder
-- ============================================================
-- After creating your Supabase project:
-- 1. Go to Authentication → Users → Add User
-- 2. Create an admin user manually (email: admin@nextgen.com, password: admin123!)
-- 3. Run: UPDATE profiles SET is_admin = true WHERE email = 'admin@nextgen.com';
-- Or use the CLI: node create-admin.js
