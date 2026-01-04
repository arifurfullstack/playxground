-- Add is_banned to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Add is_hidden to posts table  
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Create reports table for reported content/users
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_target_check CHECK (
    (reported_user_id IS NOT NULL AND reported_post_id IS NULL) OR
    (reported_user_id IS NULL AND reported_post_id IS NOT NULL)
  )
);

-- Create admin_audit_logs table for audit trail
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports table
CREATE POLICY "Users can create reports" ON public.reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.reports
FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.reports
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports" ON public.reports
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for admin_audit_logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create audit logs" ON public.admin_audit_logs
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update posts RLS to hide hidden posts and posts from banned users
DROP POLICY IF EXISTS "Public posts viewable by everyone" ON public.posts;

CREATE POLICY "Public posts viewable by everyone" ON public.posts
FOR SELECT USING (
  -- Hide hidden posts and posts from banned users for non-admins
  (
    NOT COALESCE(is_hidden, false) 
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = posts.creator_id 
      AND profiles.is_banned = true
    )
    AND (
      NOT COALESCE(is_locked, false) 
      OR EXISTS (
        SELECT 1 FROM subscriptions
        WHERE subscriptions.fan_id = auth.uid() 
        AND subscriptions.creator_id = posts.creator_id 
        AND subscriptions.status = 'active'
      )
      OR creator_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update profiles policy to allow admins to update any profile (for banning)
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user roles
CREATE POLICY "Admins can update user roles" ON public.user_roles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete posts
CREATE POLICY "Admins can delete any post" ON public.posts
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any post (for hiding)
CREATE POLICY "Admins can update any post" ON public.posts
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on reports
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;