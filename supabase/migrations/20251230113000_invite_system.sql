-- Invites and Notifications System Migration (Revised)

-- Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'fan')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '1 hour'),
  UNIQUE(room_id, receiver_id, status)
);

-- Adjust existing Notifications Table
DO $$ 
BEGIN
  -- Add data column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='data') THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
  END IF;

  -- Make actor_id nullable if it exists and is not null
  -- Actually, in most cases we want actor_id to be there, but for some system notifs it could be null.
  ALTER TABLE notifications ALTER COLUMN actor_id DROP NOT NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_receiver_id ON invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_invitations_room_id ON invitations(room_id);

-- RLS Policies for Invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing if needed to avoid conflicts during re-run (though Usually we use new files)
DROP POLICY IF EXISTS "Users can view invites sent by them" ON invitations;
DROP POLICY IF EXISTS "Users can view invites received by them" ON invitations;
DROP POLICY IF EXISTS "Creators can create invites" ON invitations;
DROP POLICY IF EXISTS "Recipients can update their invites" ON invitations;

CREATE POLICY "Users can view invites sent by them"
  ON invitations FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view invites received by them"
  ON invitations FOR SELECT
  USING (auth.uid() = receiver_id);

CREATE POLICY "Creators can create invites"
  ON invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update their invites"
  ON invitations FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Backend Logic: Invite User Function
CREATE OR REPLACE FUNCTION invite_user(
  p_room_id UUID,
  p_receiver_id UUID,
  p_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_room_creator_id UUID;
  v_invite_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Check if room exists and get creator
  SELECT creator_id INTO v_room_creator_id
  FROM game_rooms
  WHERE id = p_room_id;
  
  IF v_room_creator_id IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- Check pending invites to prevent duplicates
  IF EXISTS (SELECT 1 FROM invitations WHERE room_id = p_room_id AND receiver_id = p_receiver_id AND status = 'pending') THEN
     RAISE EXCEPTION 'User already has a pending invitation';
  END IF;

  -- Create Invitation
  INSERT INTO invitations (room_id, sender_id, receiver_id, role)
  VALUES (p_room_id, v_sender_id, p_receiver_id, p_role)
  RETURNING id INTO v_invite_id;

  -- Create Notification using existing table structure
  INSERT INTO notifications (user_id, actor_id, type, content, data)
  VALUES (
    p_receiver_id,
    v_sender_id,
    'invite',
    CASE WHEN p_role = 'creator' THEN 'Invited you to team up as a Creator!' ELSE 'Invited you to join a room!' END,
    jsonb_build_object('room_id', p_room_id, 'invite_id', v_invite_id, 'role', p_role)
  );

  RETURN jsonb_build_object('success', true, 'invite_id', v_invite_id);
END;
$$;

-- Backend Logic: Accept Invite Function
CREATE OR REPLACE FUNCTION accept_invite(
  p_invite_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_room RECORD;
  v_creator_count INT;
  v_fan_count INT;
  v_wallet_balance NUMERIC;
  v_entry_fee NUMERIC := 10;
  v_is_vip BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();

  -- Get Invite
  SELECT * INTO v_invite FROM invitations WHERE id = p_invite_id AND status = 'pending';
  
  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  IF v_invite.receiver_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized to accept this invite';
  END IF;

  -- Get Room (Assuming game_rooms exists with max_creator_cams, max_fan_cams)
  -- If those columns are missing in game_rooms, we might need to add them or use defaults.
  -- Based on 20251230072435_truth_or_dare_room.sql, they exist.
  SELECT * INTO v_room FROM game_rooms WHERE id = v_invite.room_id;
  
  -- Check Slots (from room_participants)
  SELECT COUNT(*) INTO v_creator_count FROM room_participants WHERE room_id = v_invite.room_id AND role = 'creator' AND left_at IS NULL;
  SELECT COUNT(*) INTO v_fan_count FROM room_participants WHERE room_id = v_invite.room_id AND role = 'fan' AND left_at IS NULL;

  IF v_invite.role = 'creator' AND v_creator_count >= COALESCE(v_room.max_creator_cams, 4) THEN
    RAISE EXCEPTION 'Creator slots are full';
  END IF;

  IF v_invite.role = 'fan' AND v_fan_count >= COALESCE(v_room.max_fan_cams, 2) THEN
    RAISE EXCEPTION 'Fan slots are full';
  END IF;

  -- Payment Logic for Fans
  IF v_invite.role = 'fan' THEN
     -- Check VIP (subscription_price > 50 is just a proxy for now)
     SELECT (subscription_price >= 250) INTO v_is_vip FROM profiles WHERE id = v_user_id;
     
     IF NOT COALESCE(v_is_vip, false) THEN
        SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE id = v_user_id;
        
        IF COALESCE(v_wallet_balance, 0) < v_entry_fee THEN
           RAISE EXCEPTION 'Insufficient balance. Need $10 to join.';
        END IF;

        -- Deduct Balance
        UPDATE profiles SET wallet_balance = wallet_balance - v_entry_fee WHERE id = v_user_id;
        
        -- Record Transaction (Assume room_transactions exist from T&D migration)
        INSERT INTO room_transactions (room_id, user_id, type, amount, status)
        VALUES (v_invite.room_id, v_user_id, 'entry_fee', v_entry_fee, 'completed');
     END IF;
  END IF;

  -- Add to Participants
  INSERT INTO room_participants (room_id, user_id, role, on_camera)
  VALUES (v_invite.room_id, v_user_id, v_invite.role, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET role = EXCLUDED.role, left_at = NULL, on_camera = true;

  -- Update Invite Status
  UPDATE invitations SET status = 'accepted' WHERE id = p_invite_id;

  RETURN jsonb_build_object('success', true, 'room_id', v_invite.room_id);
END;
$$;
