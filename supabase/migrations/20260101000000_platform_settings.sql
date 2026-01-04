-- Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize default revenue splits
-- Value represents the PLATFORM share percentage
INSERT INTO platform_settings (key, value, description)
VALUES (
    'revenue_splits',
    '{"suga4u": 10, "truth_or_dare": 10, "bar_lounge": 10, "confessions": 10, "tips": 10}',
    'Platform percentage share for each room type and tips. Value is 0-100.'
) ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage platform settings"
    ON platform_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Fans/Creators can see settings (e.g. to know the split if displayed)
CREATE POLICY "Anyone can view platform settings"
    ON platform_settings FOR SELECT
    USING (true);

-- Trigger for updated_at
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
