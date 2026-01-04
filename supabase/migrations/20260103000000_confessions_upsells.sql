-- Confession Reactions
CREATE TYPE confession_reaction_type AS ENUM ('Text', 'Voice', 'Video');
CREATE TYPE request_status AS ENUM ('Pending', 'Accepted', 'Completed', 'Refunded', 'Declined');

CREATE TABLE IF NOT EXISTS confession_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    confession_id UUID NOT NULL REFERENCES confession_items(id) ON DELETE CASCADE,
    reaction_type confession_reaction_type NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    message_optional TEXT,
    status request_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Topic Requests ("Unlock for me")
CREATE TABLE IF NOT EXISTS confession_topic_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    topic_text TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    status request_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Countdown Confession Goals
CREATE TABLE IF NOT EXISTS confession_room_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_target DECIMAL(10,2) NOT NULL DEFAULT 250.00,
    goal_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Achieved, Expired
    reward_confession_id UUID REFERENCES confession_items(id), -- Specific confession to unlock
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Goal Contributions (to track who pushed the goal)
CREATE TABLE IF NOT EXISTS confession_goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES confession_room_goals(id) ON DELETE CASCADE,
    fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE confession_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_topic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_room_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE confession_goal_contributions ENABLE ROW LEVEL SECURITY;

-- Fans can see their own reactions, creators can see reactions for them
CREATE POLICY "Fans can view their own reactions" ON confession_reactions
    FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "Creators can view reactions for them" ON confession_reactions
    FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Fans can insert reaction requests" ON confession_reactions
    FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Topic requests policies
CREATE POLICY "Fans can view their own topic requests" ON confession_topic_requests
    FOR SELECT USING (auth.uid() = fan_id);
CREATE POLICY "Creators can view topic requests for them" ON confession_topic_requests
    FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Fans can insert topic requests" ON confession_topic_requests
    FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- Goals policies
CREATE POLICY "Anyone can view room goals" ON confession_room_goals
    FOR SELECT USING (true);
CREATE POLICY "Creators can manage their goals" ON confession_room_goals
    FOR ALL USING (auth.uid() = creator_id);

-- Contributions policies
CREATE POLICY "Anyone can view contributions" ON confession_goal_contributions
    FOR SELECT USING (true);
CREATE POLICY "Fans can insert contributions" ON confession_goal_contributions
    FOR INSERT WITH CHECK (auth.uid() = fan_id);
