-- PROMOTE USER TO ADMIN
-- 1. You have signed up as myadmin@gmail.com
-- 2. Run this script in Supabase SQL Editor

DO $$
DECLARE
  target_email TEXT := 'myadmin@gmail.com'; 
  target_user_id UUID;
BEGIN
  -- Find the user's ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- Grant 'admin' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS: User % is now an Admin!', target_email;
  ELSE
    RAISE NOTICE 'ERROR: User % not found! Make sure you have confirmed your signup.', target_email;
  END IF;
END $$;
