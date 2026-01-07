-- View: Student absence counts per teacher and class (for commission tracking)
CREATE OR REPLACE VIEW teacher_student_absences AS
SELECT
    tc.teacher_id,
    tc.class_id,
    up.full_name as teacher_name,
    c.name as class_name,
    sc.name as school_name,
    s.id as student_id,
    s.first_name || ' ' || s.last_name as student_name,
    COUNT(*) FILTER (WHERE ar.status = 'absent') as total_absences,
    MIN(ar.attendance_date) as first_absence_date,
    MAX(ar.attendance_date) as last_absence_date
FROM teacher_classes tc
JOIN user_profiles up ON tc.teacher_id = up.id
JOIN classes c ON tc.class_id = c.id
JOIN schools sc ON c.school_id = sc.id
JOIN students s ON s.class_id = c.id
LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.class_id = c.id
GROUP BY tc.teacher_id, tc.class_id, up.full_name, c.name, sc.name, s.id, s.first_name, s.last_name
ORDER BY teacher_name, class_name, student_name;
