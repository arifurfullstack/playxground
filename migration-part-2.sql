-- Database Migration SQL - PART 2
-- Generated: 2026-01-04T10:35:14.818Z
-- Source: https://psyxaouovbpargnffbtk.supabase.co
-- 
-- Migration for: Feature Tables (Chat, Notifications, Transactions, etc.)
-- 

-- Disable Triggers for User Tables
ALTER TABLE user_roles DISABLE TRIGGER USER;
ALTER TABLE subscriptions DISABLE TRIGGER USER;
ALTER TABLE transactions DISABLE TRIGGER USER;
ALTER TABLE conversations DISABLE TRIGGER USER;
ALTER TABLE messages DISABLE TRIGGER USER;
ALTER TABLE notifications DISABLE TRIGGER USER;
ALTER TABLE invitations DISABLE TRIGGER USER;
-- Add more tables here as needed if they have triggers
-- (X Chat and Flash Drops likely rely on standard constraints or system triggers we can leave alone, or disable if issues arise)


-- Re-enable Triggers
ALTER TABLE user_roles ENABLE TRIGGER USER;
ALTER TABLE subscriptions ENABLE TRIGGER USER;
ALTER TABLE transactions ENABLE TRIGGER USER;
ALTER TABLE conversations ENABLE TRIGGER USER;
ALTER TABLE messages ENABLE TRIGGER USER;
ALTER TABLE notifications ENABLE TRIGGER USER;
ALTER TABLE invitations ENABLE TRIGGER USER;

-- Part 2 Migration complete!
