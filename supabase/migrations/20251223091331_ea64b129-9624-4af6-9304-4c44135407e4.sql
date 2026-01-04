-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'like' or 'comment'
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification on like
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_creator_id UUID;
BEGIN
  -- Get the post creator
  SELECT creator_id INTO post_creator_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF post_creator_id IS NOT NULL AND post_creator_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id)
    VALUES (post_creator_id, NEW.user_id, 'like', NEW.post_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create notification on comment
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_creator_id UUID;
BEGIN
  -- Get the post creator
  SELECT creator_id INTO post_creator_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF post_creator_id IS NOT NULL AND post_creator_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, content)
    VALUES (post_creator_id, NEW.user_id, 'comment', NEW.post_id, LEFT(NEW.content, 100));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_like();

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();