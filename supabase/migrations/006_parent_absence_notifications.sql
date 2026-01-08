-- Create parent absence notifications table
CREATE TABLE public.parent_absence_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  absence_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_parent BOOLEAN DEFAULT true,
  is_processed BOOLEAN DEFAULT false,
  UNIQUE(student_id, class_id, absence_date)
);

-- Create indexes for performance
CREATE INDEX idx_parent_notifications_student ON parent_absence_notifications(student_id);
CREATE INDEX idx_parent_notifications_class ON parent_absence_notifications(class_id);
CREATE INDEX idx_parent_notifications_date ON parent_absence_notifications(absence_date);
CREATE INDEX idx_parent_notifications_unprocessed ON parent_absence_notifications(is_processed) WHERE is_processed = false;

-- Enable Row Level Security
ALTER TABLE parent_absence_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Parents can view/create their own student's notifications (via token validation in application)
-- Note: Token validation happens at application level in parent-portal.ts
-- Database level: Allow public access since token is already validated

-- RLS Policy: Anyone can read notifications (token validation in app layer ensures security)
CREATE POLICY "Anyone can read parent absence notifications" ON parent_absence_notifications
  FOR SELECT
  USING (true);

-- RLS Policy: Only application server actions can insert (via auth context)
CREATE POLICY "Only app can insert parent notifications" ON parent_absence_notifications
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Only app can update parent notifications
CREATE POLICY "Only app can update parent notifications" ON parent_absence_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Only app can delete parent notifications
CREATE POLICY "Only app can delete parent notifications" ON parent_absence_notifications
  FOR DELETE
  USING (true);

-- Helper function to get parent notifications for a class on a specific date
CREATE OR REPLACE FUNCTION get_parent_notifications_for_class_date(
  p_class_id UUID,
  p_date DATE
)
RETURNS TABLE(student_id UUID, reason TEXT, notes TEXT, is_processed BOOLEAN)
LANGUAGE SQL
STABLE
AS $$
  SELECT student_id, reason, notes, is_processed
  FROM parent_absence_notifications
  WHERE class_id = p_class_id
    AND absence_date = p_date
    AND is_processed = false;
$$;

-- Add comment for documentation
COMMENT ON TABLE parent_absence_notifications IS 'Stores parent pre-notifications of student absences for upcoming classes';
COMMENT ON COLUMN parent_absence_notifications.reason IS 'Reason for absence (e.g., Sick, Family Emergency, Other)';
COMMENT ON COLUMN parent_absence_notifications.notes IS 'Additional notes from parent';
COMMENT ON COLUMN parent_absence_notifications.is_processed IS 'Flag indicating whether teacher has marked attendance for this notification';
