-- Confessions Feature Schema
-- Implements the "Secret Drop" room for creators and fans.

-- 1. Create Confessions Table
CREATE TABLE IF NOT EXISTS public.confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('Soft', 'Spicy', 'Dirty', 'Dark', 'Forbidden')),
  type TEXT NOT NULL CHECK (type IN ('Text', 'Voice', 'Video')),
  title TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  content_url TEXT, -- The "asset" (full text, audio/video URL)
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Unlocks Table (Fan Entitlement)
CREATE TABLE IF NOT EXISTS public.confession_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  price_paid DECIMAL(10,2) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fan_id, confession_id)
);

-- 3. Reaction Requests (Upsells)
CREATE TABLE IF NOT EXISTS public.reaction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('Text Reply', 'Voice Reaction', 'Mini Video Reaction')),
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Topic Requests ("Unlock for me")
CREATE TABLE IF NOT EXISTS public.topic_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_text TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- Confessions:
-- Anyone can view active confessions (to see the list)
CREATE POLICY "Anyone can view active confessions" ON public.confessions
  FOR SELECT USING (status = 'active');

-- Creators can manage their own
CREATE POLICY "Creators can manage own confessions" ON public.confessions
  FOR ALL USING (auth.uid() = creator_id);

-- Unlocks:
-- Fans can view their own unlocks
CREATE POLICY "Users can view own unlocks" ON public.confession_unlocks
  FOR SELECT USING (auth.uid() = fan_id);

-- Fans can insert (buy) unlocks
CREATE POLICY "Users can buy unlocks" ON public.confession_unlocks
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Reaction Requests:
-- Users see their own
CREATE POLICY "Users view own reaction requests" ON public.reaction_requests
  FOR SELECT USING (auth.uid() = fan_id OR EXISTS (
    SELECT 1 FROM public.confessions c WHERE c.id = confession_id AND c.creator_id = auth.uid()
  ));

CREATE POLICY "Users create reaction requests" ON public.reaction_requests
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Topic Requests:
-- Users see their own
CREATE POLICY "Users view own topic requests" ON public.topic_requests
  FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);

CREATE POLICY "Users create topic requests" ON public.topic_requests
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_unlocks;
