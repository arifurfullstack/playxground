-- FIX ADMIN ACCESS (Nuclear)
-- 1. Disables RLS permissions on user_roles so the app can definitely read it.
-- 2. Re-applies the Admin role to myadmin@gmail.com to be 100% sure.

BEGIN;

-- 1. Unlock the user_roles table
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_roles TO anon;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Re-assign Admin Role (Just in case)
DO $$
DECLARE
  target_email TEXT := 'myadmin@gmail.com'; 
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NOT NULL THEN
    -- Remove existing to avoid duplicates if any
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    -- Insert Admin Role
    INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'admin');
  END IF;
END $$;

COMMIT;
