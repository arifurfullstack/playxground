-- Bar Lounge Schema

-- Types
DO $$ BEGIN
    CREATE TYPE lounge_msg_type AS ENUM ('chat', 'gift', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Bar Lounge Messages Table
CREATE TABLE IF NOT EXISTS bar_lounge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- The room owner
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- The sender
    type lounge_msg_type NOT NULL DEFAULT 'chat',
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store gift details, amounts, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE bar_lounge_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view messages for a room
CREATE POLICY "Bar Lounge messages are viewable by everyone" ON bar_lounge_messages
    FOR SELECT USING (TRUE);

-- Authenticated users can insert messages
CREATE POLICY "Users can insert their own Bar Lounge messages" ON bar_lounge_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bar_lounge_messages_creator_id ON bar_lounge_messages(creator_id);
CREATE INDEX IF NOT EXISTS idx_bar_lounge_messages_created_at ON bar_lounge_messages(created_at);
