-- RESTORE MISSING POLICIES (V2 - Aggressive Fix)
-- Run this in Supabase SQL Editor to fix "Permission Denied" errors

BEGIN;

-- 1. Profiles Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. User Roles Policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR user_id = auth.uid()); -- Redundant but safe

DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;
CREATE POLICY "Users can insert own role on signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Posts Policies
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public posts viewable by everyone" ON public.posts;
CREATE POLICY "Public posts viewable by everyone"
  ON public.posts FOR SELECT
  USING (true); -- Simplified for debugging: allow ALL posts to be seen first

DROP POLICY IF EXISTS "Creators can insert posts" ON public.posts;
CREATE POLICY "Creators can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = creator_id); 

DROP POLICY IF EXISTS "Creators can update own posts" ON public.posts;
CREATE POLICY "Creators can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = creator_id);

-- 4. Game Rooms Policies
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view game rooms" ON public.game_rooms;
CREATE POLICY "Users can view game rooms"
  ON public.game_rooms FOR SELECT
  USING (true); -- Simplified for debugging

COMMIT;
