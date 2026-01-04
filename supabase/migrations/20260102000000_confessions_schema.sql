-- Confessions System Schema

-- Enums for Confessions
DO $$ BEGIN
    CREATE TYPE confession_type AS ENUM ('Text', 'Voice', 'Video');
    CREATE TYPE confession_tier AS ENUM ('Soft', 'Spicy', 'Dirty', 'Dark', 'Forbidden');
    CREATE TYPE confession_status AS ENUM ('Draft', 'Published', 'Archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Confession Items Table
CREATE TABLE IF NOT EXISTS confession_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type confession_type NOT NULL DEFAULT 'Text',
    tier confession_tier NOT NULL DEFAULT 'Spicy',
    status confession_status NOT NULL DEFAULT 'Draft',
    title TEXT NOT NULL,
    teaser TEXT NOT NULL,
    full_text TEXT, -- Only for Text type
    media_asset_id UUID, -- For Voice/Video
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Confession Entitlements (Unlocks)
CREATE TABLE IF NOT EXISTS confession_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    confession_id UUID NOT NULL REFERENCES confession_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price_paid DECIMAL(10,2) NOT NULL,
    UNIQUE(user_id, confession_id)
);

-- RLS
ALTER TABLE confession_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_entitlements ENABLE ROW LEVEL SECURITY;

-- Confession Items Policies
-- Anyone can view basic info of published items
CREATE POLICY "Anyone can view basic info of published confessions"
    ON confession_items FOR SELECT
    USING (status = 'Published');

-- Creators can manage their own confessions
CREATE POLICY "Creators can manage own confessions"
    ON confession_items FOR ALL
    USING (auth.uid() = creator_id);

-- Confession Entitlements Policies
-- Users can view their own entitlements
CREATE POLICY "Users can view own entitlements"
    ON confession_entitlements FOR SELECT
    USING (auth.uid() = user_id);

-- System or authenticated users can create entitlements (usually via payment RPC, but for simplicity we allow insert if authenticated and handle logic in app)
-- In a real production app, this would be restricted to a service role or a specific function.
CREATE POLICY "Users can insert own entitlements"
    ON confession_entitlements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_confessions_creator ON confession_items(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON confession_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_item ON confession_entitlements(confession_id);

-- Triggers for updated_at
CREATE TRIGGER set_confessions_updated_at
    BEFORE UPDATE ON confession_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle status timestamps
CREATE OR REPLACE FUNCTION handle_confession_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Published' AND (OLD.status IS NULL OR OLD.status != 'Published') THEN
        NEW.published_at = NOW();
    ELSIF NEW.status = 'Archived' AND (OLD.status IS NULL OR OLD.status != 'Archived') THEN
        NEW.archived_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_confession_status_change
    BEFORE UPDATE ON confession_items
    FOR EACH ROW EXECUTE FUNCTION handle_confession_status_change();
