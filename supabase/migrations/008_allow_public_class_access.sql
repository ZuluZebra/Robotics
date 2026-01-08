-- Add RLS policy to allow public/unauthenticated access to view classes
-- This is needed for parent portal token-based access to work on mobile
-- Classes are read-only scheduling information, safe to share publicly

CREATE POLICY "Public can view classes" ON public.classes
FOR SELECT
USING (true);

-- Also allow public to view user_profiles (for teacher names)
CREATE POLICY "Public can view user profiles" ON public.user_profiles
FOR SELECT
USING (true);
