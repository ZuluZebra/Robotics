-- Enable Row Level Security on teacher_classes table if not already enabled
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view their own assignments" ON teacher_classes;
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON teacher_classes;

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view their own assignments" ON teacher_classes
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert/update/delete teacher assignments
CREATE POLICY "Admins can manage teacher assignments" ON teacher_classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
