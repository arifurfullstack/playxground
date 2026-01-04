-- NUCLEAR DEBUG OPTION
-- This temporarily removes all security to prove the data exists and is readable.

BEGIN;

-- 1. Grant usage on schema (just in case)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Grant table access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. DISABLE RLS completely for testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY;

COMMIT;
