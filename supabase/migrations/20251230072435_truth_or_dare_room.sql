-- Truth or Dare Room Schema Migration
-- Creates tables for game rooms, participants, camera slots, transactions, prompts, and wallets

-- Game Rooms Table
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'truth_or_dare',
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  entry_fee NUMERIC NOT NULL DEFAULT 10,
  free_minutes INTEGER NOT NULL DEFAULT 10,
  per_minute_fee NUMERIC NOT NULL DEFAULT 2,
  max_creator_cams INTEGER NOT NULL DEFAULT 4,
  max_fan_cams INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Room Participants Table
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'fan')),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  on_camera BOOLEAN NOT NULL DEFAULT false,
  wallet_debits_total NUMERIC NOT NULL DEFAULT 0,
  last_billed_at TIMESTAMPTZ,
  free_minutes_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_id, user_id)
);

-- Camera Slots Table
CREATE TABLE IF NOT EXISTS camera_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('creator', 'fan')),
  slot_index INTEGER NOT NULL,
  occupied_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  occupied_at TIMESTAMPTZ,
  UNIQUE(room_id, slot_type, slot_index)
);

-- Room Transactions Table
CREATE TABLE IF NOT EXISTS room_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'entry_fee', 
    'per_minute', 
    'tier_purchase', 
    'custom_truth', 
    'custom_dare', 
    'tip', 
    'crowd_vote_tier',
    'crowd_vote_truth_dare',
    'double_dare',
    'camera_unlock',
    'time_extension',
    'replay'
  )),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator Prompts Table
CREATE TABLE IF NOT EXISTS creator_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('truth', 'dare')),
  prompt_text TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompt Usage Tracking Table
CREATE TABLE IF NOT EXISTS prompt_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES creator_prompts(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, prompt_id)
);

-- User Wallets Table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_creator_id ON game_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_on_camera ON room_participants(room_id, on_camera);
CREATE INDEX IF NOT EXISTS idx_camera_slots_room_id ON camera_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_camera_slots_occupied ON camera_slots(room_id, occupied_by_user_id) WHERE occupied_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_transactions_room_id ON room_transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_room_transactions_user_id ON room_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_room_transactions_type ON room_transactions(type);
CREATE INDEX IF NOT EXISTS idx_creator_prompts_creator_id ON creator_prompts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_prompts_tier ON creator_prompts(tier, enabled);
CREATE INDEX IF NOT EXISTS idx_prompt_usage_room_id ON prompt_usage(room_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- RLS Policies

-- Game Rooms: Anyone can view live rooms, only creators can create
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live game rooms"
  ON game_rooms FOR SELECT
  USING (status = 'live' OR status = 'waiting');

CREATE POLICY "Creators can create game rooms"
  ON game_rooms FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own rooms"
  ON game_rooms FOR UPDATE
  USING (auth.uid() = creator_id);

-- Room Participants: Users can view participants in rooms they're in
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their rooms"
  ON room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = room_participants.room_id
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON room_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Camera Slots: Users can view slots in rooms they're in
ALTER TABLE camera_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view camera slots in their rooms"
  ON camera_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = camera_slots.room_id
      AND rp.user_id = auth.uid()
    )
  );

-- Room Transactions: Users can view their own transactions
ALTER TABLE room_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON room_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
  ON room_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Creator Prompts: Creators can manage their prompts, fans can view enabled prompts
ALTER TABLE creator_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage their prompts"
  ON creator_prompts FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view enabled prompts"
  ON creator_prompts FOR SELECT
  USING (enabled = true);

-- Prompt Usage: Viewable by room participants
ALTER TABLE prompt_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view prompt usage"
  ON prompt_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = prompt_usage.room_id
      AND rp.user_id = auth.uid()
    )
  );

-- User Wallets: Users can only view and update their own wallet
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
  ON user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON user_wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet"
  ON user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to initialize camera slots when a room is created
CREATE OR REPLACE FUNCTION initialize_camera_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Create creator slots
  FOR i IN 1..NEW.max_creator_cams LOOP
    INSERT INTO camera_slots (room_id, slot_type, slot_index)
    VALUES (NEW.id, 'creator', i);
  END LOOP;
  
  -- Create fan slots
  FOR i IN 1..NEW.max_fan_cams LOOP
    INSERT INTO camera_slots (room_id, slot_type, slot_index)
    VALUES (NEW.id, 'fan', i);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_camera_slots_on_room_creation
  AFTER INSERT ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION initialize_camera_slots();

-- Function to update wallet updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallet_timestamp_trigger
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_timestamp();
