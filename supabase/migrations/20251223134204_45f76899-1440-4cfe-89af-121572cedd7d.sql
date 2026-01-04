-- Create storage bucket for message media
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-media', 'message-media', true);

-- Create policies for message media bucket
CREATE POLICY "Authenticated users can upload message media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-media');

CREATE POLICY "Anyone can view message media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'message-media');

CREATE POLICY "Users can delete own message media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'message-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add media_url column to messages table
ALTER TABLE public.messages
ADD COLUMN media_url TEXT DEFAULT NULL;

ALTER TABLE public.messages
ADD COLUMN media_type TEXT DEFAULT NULL;