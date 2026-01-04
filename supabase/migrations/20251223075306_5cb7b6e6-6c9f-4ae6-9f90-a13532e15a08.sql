-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true);

-- Allow authenticated users to upload their own media
CREATE POLICY "Creators can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to media
CREATE POLICY "Public can view media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- Allow creators to delete their own media
CREATE POLICY "Creators can delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow creators to update their own media
CREATE POLICY "Creators can update own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);