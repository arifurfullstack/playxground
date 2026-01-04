-- X Chat Room and Messages Schema

-- Types
DO $$ BEGIN
    CREATE TYPE x_chat_lane AS ENUM ('Priority', 'Paid', 'Free');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE x_chat_status AS ENUM ('Queued', 'Answered', 'Refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rooms Table
CREATE TABLE IF NOT EXISTS x_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    pricing_config JSONB DEFAULT '{}'::jsonb,
    slow_mode_config JSONB DEFAULT '{"enabled": false, "seconds": 60}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS x_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES x_chat_rooms(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_handle TEXT NOT NULL,
    lane x_chat_lane NOT NULL DEFAULT 'Free',
    body TEXT NOT NULL,
    paid_amount_cents INTEGER DEFAULT 0,
    paid_type TEXT, -- BOOST, STICKER, etc.
    status x_chat_status NOT NULL DEFAULT 'Queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Answers Table
CREATE TABLE IF NOT EXISTS x_chat_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES x_chat_messages(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add answer_id back to messages for easy lookup if needed (optional, but answers table has message_id)
-- ALTER TABLE x_chat_messages ADD COLUMN answer_id UUID REFERENCES x_chat_answers(id);

-- RLS Policies
ALTER TABLE x_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_chat_answers ENABLE ROW LEVEL SECURITY;

-- rooms: anyone can view
CREATE POLICY "X Chat rooms are viewable by everyone" ON x_chat_rooms
    FOR SELECT USING (TRUE);

-- rooms: creators can update theirs
CREATE POLICY "Creators can update their own X Chat rooms" ON x_chat_rooms
    FOR UPDATE USING (auth.uid() = creator_id);

-- messages: anyone can view queued/answered
CREATE POLICY "X Chat messages are viewable by everyone" ON x_chat_messages
    FOR SELECT USING (TRUE);

-- messages: users can insert their own
CREATE POLICY "Users can insert their own X Chat messages" ON x_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- messages: creators can update status
CREATE POLICY "Creators can update status of X Chat messages" ON x_chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM x_chat_rooms
            WHERE x_chat_rooms.id = x_chat_messages.room_id
            AND x_chat_rooms.creator_id = auth.uid()
        )
    );

-- answers: anyone can view
CREATE POLICY "X Chat answers are viewable by everyone" ON x_chat_answers
    FOR SELECT USING (TRUE);

-- answers: creators can insert
CREATE POLICY "Creators can insert answers to their X Chat messages" ON x_chat_answers
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
