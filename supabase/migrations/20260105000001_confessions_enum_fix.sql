-- Fix Confessions Status Enum and Policies
-- Aligning schema with Creator Studio Spec ('Draft', 'Published', 'Archived')

-- 1. Migrate existing data (if any)
UPDATE public.confessions SET status = 'Published' WHERE status = 'active';
UPDATE public.confessions SET status = 'Draft' WHERE status = 'hidden';
UPDATE public.confessions SET status = 'Archived' WHERE status = 'deleted';

-- 2. Update Constraint
ALTER TABLE public.confessions DROP CONSTRAINT IF EXISTS confessions_status_check;
ALTER TABLE public.confessions ADD CONSTRAINT confessions_status_check 
  CHECK (status IN ('Draft', 'Published', 'Archived'));

-- 3. Update Default
ALTER TABLE public.confessions ALTER COLUMN status SET DEFAULT 'Draft';

-- 4. Update Policies
DROP POLICY IF EXISTS "Anyone can view active confessions" ON public.confessions;

CREATE POLICY "Anyone can view Published confessions" ON public.confessions
  FOR SELECT USING (status = 'Published');

-- Ensure creator policy covers all statuses (it did before, but good to be safe)
DROP POLICY IF EXISTS "Creators can manage own confessions" ON public.confessions;
CREATE POLICY "Creators can manage own confessions" ON public.confessions
  FOR ALL USING (auth.uid() = creator_id);
