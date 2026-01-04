-- INITIALIZE MISSING TRUTH & DARE ROOM
-- The error "violates foreign key constraint" happens because the Room doesn't exist.
-- This script creates the main "Exclusive Truth or Dare" room.

DO $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- 1. Pick a creator to own the room (e.g. the first user found)
  SELECT id INTO v_creator_id FROM public.profiles LIMIT 1;
  
  IF v_creator_id IS NOT NULL THEN
    -- 2. Insert the Default Room with the ID the app expects
    INSERT INTO public.td_rooms (id, title, creator_id, status)
    VALUES (
      'd69e8460-7067-4fdc-987a-36b3576f34e3', -- Default ID hardcoded in your app
      'Exclusive Truth or Dare',
      v_creator_id,
      'live'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Created Truth & Dare Room successfully!';
  ELSE
    RAISE EXCEPTION '❌ No users found in profiles to assign as creator!';
  END IF;
END $$;
