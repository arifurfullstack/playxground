-- Flash Drops Room Schema

-- Types
DO $$ BEGIN
    CREATE TYPE flash_drop_rarity AS ENUM ('Common', 'Rare', 'Epic', 'Legendary');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flash_drop_kind AS ENUM ('Photo Set', 'Video', 'Live Replay', 'DM Pack', 'Vault');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drops Table
CREATE TABLE IF NOT EXISTS flash_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind flash_drop_kind NOT NULL,
    rarity flash_drop_rarity NOT NULL DEFAULT 'Common',
    price DECIMAL(10,2) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'live', -- scheduled, live, ended
    media_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unlocks Table
CREATE TABLE IF NOT EXISTS flash_drop_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    drop_id UUID NOT NULL REFERENCES flash_drops(id) ON DELETE CASCADE,
    is_gift BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_id UUID REFERENCES profiles(id),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, drop_id)
);

-- Auctions Table
CREATE TABLE IF NOT EXISTS flash_drop_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES flash_drops(id) ON DELETE CASCADE,
    current_bid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Ended, Cancelled
    winner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bids Table
CREATE TABLE IF NOT EXISTS flash_drop_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES flash_drop_auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pins Table
CREATE TABLE IF NOT EXISTS flash_drop_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    drop_id UUID NOT NULL REFERENCES flash_drops(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-Snipe Status
CREATE TABLE IF NOT EXISTS flash_drop_autosnipe (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    escrow_amount DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies

ALTER TABLE flash_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_drop_autosnipe ENABLE ROW LEVEL SECURITY;

-- drops: anyone can view
CREATE POLICY "Public drops are viewable by everyone" ON flash_drops
    FOR SELECT USING (TRUE);

-- unlocks: users see their own
CREATE POLICY "Users can view their own drop unlocks" ON flash_drop_unlocks
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);

-- auctions: anyone can view
CREATE POLICY "Auctions are viewable by everyone" ON flash_drop_auctions
    FOR SELECT USING (TRUE);

-- bids: anyone can view
CREATE POLICY "Bids are viewable by everyone" ON flash_drop_bids
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own bids" ON flash_drop_bids
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- pins: creators see all in their room, fans see active
CREATE POLICY "Drop pins are viewable by everyone" ON flash_drop_pins
    FOR SELECT USING (TRUE);

-- autosnipe: users see their own
CREATE POLICY "Users can view/update their own autosnipe" ON flash_drop_autosnipe
    FOR ALL USING (auth.uid() = user_id);
