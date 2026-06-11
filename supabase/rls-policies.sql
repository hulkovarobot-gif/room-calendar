-- ============================================================
-- RLS politiky pro tabulku bookings
-- Spusťte v Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ujistěte se, že RLS je zapnuté
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Zkontrolujte existující politiky před spuštěním:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bookings';
-- Případně smažte kolidující politiky:
--   DROP POLICY IF EXISTS "název_politiky" ON bookings;
-- ============================================================

-- BOOKINGS: čtení (SELECT)
CREATE POLICY "bookings_anon_select" ON bookings
  FOR SELECT TO anon
  USING (true);

-- BOOKINGS: vytváření (INSERT)
CREATE POLICY "bookings_anon_insert" ON bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- BOOKINGS: úprava (UPDATE) — potřebné pro editaci rezervací
CREATE POLICY "bookings_anon_update" ON bookings
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- BOOKINGS: mazání (DELETE) — potřebné pro smazání rezervací
CREATE POLICY "bookings_anon_delete" ON bookings
  FOR DELETE TO anon
  USING (true);

-- ============================================================
-- ROOMS: čtení a zápis pro anon
-- ============================================================

CREATE POLICY "rooms_anon_select" ON rooms
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "rooms_anon_insert" ON rooms
  FOR INSERT TO anon
  WITH CHECK (true);

-- ============================================================
-- Přidání sloupce attendees (počet účastníků)
-- Spusťte v Supabase Dashboard → SQL Editor
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attendees int DEFAULT 1;
