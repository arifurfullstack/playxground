-- Truth or Dare Complete Room Schema
-- This migration sets up the rooms, participants, camera slots, transactions, and billing logic.

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS public.td_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL DEFAULT 'truth_or_dare',
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    entry_fee DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    free_minutes INTEGER NOT NULL DEFAULT 10,
    per_minute_fee DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
    max_creator_cams INTEGER NOT NULL DEFAULT 4,
    max_fan_cams INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('waiting', 'live', 'ended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS public.td_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.td_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('creator', 'fan')),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    on_camera BOOLEAN DEFAULT FALSE,
    last_billed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 3. Camera Slots Table
CREATE TABLE IF NOT EXISTS public.td_camera_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.td_rooms(id) ON DELETE CASCADE,
    slot_type TEXT NOT NULL CHECK (slot_type IN ('creator', 'fan')),
    slot_index INTEGER NOT NULL,
    occupied_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    occupied_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, slot_type, slot_index)
);

-- 4. Transactions Table (Specific for Room Events)
CREATE TABLE IF NOT EXISTS public.td_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.td_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- entry_fee, per_minute, tier_purchase, custom_truth, custom_dare, tip, crowd_vote, replay
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Prompts Table
CREATE TABLE IF NOT EXISTS public.td_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('truth', 'dare')),
    prompt_text TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Wallet Integration Logic

-- Trigger to deduct from wallet on room transaction
CREATE OR REPLACE FUNCTION public.handle_td_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = NEW.user_id;
  
  -- Ensure enough funds
  IF v_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Deduct from user's wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - NEW.amount
  WHERE id = NEW.user_id;
  
  -- Handle creator shares (90/10 split) for specific types
  IF NEW.type IN ('tip', 'tier_purchase', 'custom_truth', 'custom_dare', 'entry_fee', 'per_minute') THEN
    DECLARE
      v_room_creator_id UUID;
      v_creator_share NUMERIC;
    BEGIN
      SELECT creator_id INTO v_room_creator_id FROM public.td_rooms WHERE id = NEW.room_id;
      
      IF v_room_creator_id IS NOT NULL AND v_room_creator_id != NEW.user_id THEN
        v_creator_share := NEW.amount * 0.9;
        UPDATE public.profiles
        SET pending_balance = COALESCE(pending_balance, 0) + v_creator_share
        WHERE id = v_room_creator_id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_td_transaction
  BEFORE INSERT ON public.td_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_td_transaction();

-- 7. Billing Heartbeat RPC
CREATE OR REPLACE FUNCTION public.bill_me_for_room(p_room_id UUID)
RETURNS void AS $$
DECLARE
  v_role TEXT;
  v_entered_at TIMESTAMPTZ;
  v_last_billed_at TIMESTAMPTZ;
  v_room_per_min NUMERIC;
  v_room_free_mins INTEGER;
  v_total_mins INTEGER;
BEGIN
  -- Get participant info
  SELECT role, entered_at, last_billed_at INTO v_role, v_entered_at, v_last_billed_at
  FROM public.td_participants
  WHERE room_id = p_room_id AND user_id = auth.uid() AND left_at IS NULL;
  
  -- Only fans pay per minute
  IF v_role != 'fan' THEN RETURN; END IF;
  
  -- Get room settings
  SELECT per_minute_fee, free_minutes INTO v_room_per_min, v_room_free_mins 
  FROM public.td_rooms 
  WHERE id = p_room_id;
  
  -- Calculate total minutes in room (rounded down)
  v_total_mins := EXTRACT(EPOCH FROM (NOW() - v_entered_at)) / 60;
  
  -- Only bill if past free minutes and at least 55 seconds have passed since last billing
  IF v_total_mins >= v_room_free_mins AND (v_last_billed_at IS NULL OR v_last_billed_at < NOW() - INTERVAL '55 seconds') THEN
    INSERT INTO public.td_transactions (room_id, user_id, type, amount, status)
    VALUES (p_room_id, auth.uid(), 'per_minute', v_room_per_min, 'completed');
    
    UPDATE public.td_participants
    SET last_billed_at = NOW()
    WHERE room_id = p_room_id AND user_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Camera Slots Initialization Trigger
CREATE OR REPLACE FUNCTION initialize_td_camera_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Create creator slots
  FOR i IN 1..NEW.max_creator_cams LOOP
    INSERT INTO td_camera_slots (room_id, slot_type, slot_index)
    VALUES (NEW.id, 'creator', i);
  END LOOP;
  
  -- Create fan slots
  FOR i IN 1..NEW.max_fan_cams LOOP
    INSERT INTO td_camera_slots (room_id, slot_type, slot_index)
    VALUES (NEW.id, 'fan', i);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_td_camera_slots_on_room_creation
  AFTER INSERT ON td_rooms
  FOR EACH ROW
  EXECUTE FUNCTION initialize_td_camera_slots();

-- 9. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.td_camera_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.td_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.td_transactions;

-- 10. RLS Policies
ALTER TABLE td_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_camera_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE td_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live rooms" ON td_rooms FOR SELECT USING (status = 'live');
CREATE POLICY "Participants can view their room info" ON td_participants FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM td_rooms WHERE id = room_id AND creator_id = auth.uid()));
CREATE POLICY "Fans can join rooms" ON td_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view camera slots" ON td_camera_slots FOR SELECT USING (true);
CREATE POLICY "Users can occupy slots" ON td_camera_slots FOR UPDATE USING (auth.uid() = occupied_by_user_id OR occupied_by_user_id IS NULL);
CREATE POLICY "Users can view their transactions" ON td_transactions FOR SELECT USING (auth.uid() = user_id);

-- 11. Sample Data (Optional, for testing)
INSERT INTO td_rooms (id, title, creator_id)
SELECT 'd69e8460-7067-4fdc-987a-36b3576f34e3', 'Welcome to Truth or Dare!', id
FROM profiles
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO td_prompts (creator_id, tier, prompt_type, prompt_text)
SELECT id, 'bronze', 'truth', 'What is your most embarrassing moment?' FROM profiles LIMIT 1 UNION ALL
SELECT id, 'silver', 'dare', 'Do 10 pushups on camera.' FROM profiles LIMIT 1 UNION ALL
SELECT id, 'gold', 'dare', 'Eat a spoonful of hot sauce.' FROM profiles LIMIT 1
ON CONFLICT DO NOTHING;
