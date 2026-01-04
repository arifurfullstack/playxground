-- Add categories column to profiles for content type filtering
ALTER TABLE public.profiles 
ADD COLUMN categories text[] DEFAULT '{}';

-- Add index for better query performance on categories
CREATE INDEX idx_profiles_categories ON public.profiles USING GIN(categories);