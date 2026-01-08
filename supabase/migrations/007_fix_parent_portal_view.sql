-- Fix parent_portal_student_details view to ensure class data is included
-- This view may have lost class_id and class_name fields if migration 005 wasn't properly applied

DROP VIEW IF EXISTS public.parent_portal_student_details;

CREATE VIEW public.parent_portal_student_details AS
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
  s.monthly_cost,
  sc.id as school_id,
  sc.name as school_name,
  sc.address as school_address,
  sc.phone as school_phone,
  sc.email as school_email,
  sc.bank_name,
  sc.account_holder,
  sc.account_number,
  sc.branch_code,
  sc.payment_reference,
  c.id as class_id,
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

-- Set security_invoker to use caller's permissions
ALTER VIEW public.parent_portal_student_details SET (security_invoker = true);
