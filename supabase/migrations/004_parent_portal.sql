-- Create parent_access_tokens table
CREATE TABLE public.parent_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(student_id)
);

-- Create indexes for performance
CREATE INDEX idx_parent_tokens_token ON parent_access_tokens(token);
CREATE INDEX idx_parent_tokens_student ON parent_access_tokens(student_id);
CREATE INDEX idx_parent_tokens_active ON parent_access_tokens(is_active);

-- Enable Row Level Security
ALTER TABLE parent_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anyone to select active tokens (for validation)
CREATE POLICY "Anyone can validate active tokens" ON parent_access_tokens
  FOR SELECT
  USING (is_active = true);

-- RLS Policy: Only admins can manage parent tokens
CREATE POLICY "Admins can manage parent tokens" ON parent_access_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function to get student_id from token
CREATE OR REPLACE FUNCTION public.get_student_id_from_token(p_token UUID)
RETURNS UUID AS $$
DECLARE
  v_student_id UUID;
BEGIN
  SELECT student_id INTO v_student_id
  FROM parent_access_tokens
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for parent portal student details
CREATE OR REPLACE VIEW parent_portal_student_details AS
SELECT
  s.id,
  s.first_name,
  s.last_name,
  s.grade,
  s.student_number,
  s.date_of_birth,
  s.parent_name,
  s.parent_email,
  s.parent_phone,
  s.emergency_contact,
  s.emergency_phone,
  s.medical_notes,
  sc.name as school_name,
  sc.address as school_address,
  sc.phone as school_phone,
  sc.email as school_email,
  c.name as class_name,
  c.grade as class_grade,
  c.schedule_days,
  c.start_time,
  c.end_time,
  c.room_number,
  ARRAY_AGG(DISTINCT up.full_name) FILTER (WHERE up.full_name IS NOT NULL) as teacher_names
FROM students s
LEFT JOIN schools sc ON s.school_id = sc.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN teacher_classes tc ON c.id = tc.class_id
LEFT JOIN user_profiles up ON tc.teacher_id = up.id
GROUP BY s.id, sc.id, c.id;

-- Set security_invoker on view to use caller's permissions
ALTER VIEW parent_portal_student_details SET (security_invoker = true);
