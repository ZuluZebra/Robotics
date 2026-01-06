-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
CREATE TYPE payment_status AS ENUM ('current', 'overdue_15', 'overdue_30', 'overdue_60');

-- =============================================
-- TABLES
-- =============================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schools
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    principal_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    schedule_days TEXT[],
    start_time TIME,
    end_time TIME,
    room_number TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher-Class assignments
CREATE TABLE public.teacher_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id)
);

-- Students
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    student_number TEXT UNIQUE,
    date_of_birth DATE,
    parent_name TEXT,
    parent_email TEXT,
    parent_phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    medical_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_name ON students(last_name, first_name);

-- Attendance Records
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'absent',
    absence_reason TEXT,
    comments TEXT,
    marked_by UUID REFERENCES user_profiles(id),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, attendance_date)
);

CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_class ON attendance_records(class_id);
CREATE INDEX idx_attendance_status ON attendance_records(status);

-- Debtor Accounts
CREATE TABLE public.student_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    current_balance DECIMAL(10, 2) DEFAULT 0.00,
    last_payment_date DATE,
    last_payment_amount DECIMAL(10, 2),
    days_overdue INTEGER DEFAULT 0,
    payment_status payment_status DEFAULT 'current',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_status ON student_accounts(payment_status);
CREATE INDEX idx_accounts_student ON student_accounts(student_id);

-- Payment History
CREATE TABLE public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES student_accounts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_account ON payment_history(account_id);
CREATE INDEX idx_payment_date ON payment_history(payment_date);

-- Low Attendance Alerts
CREATE TABLE public.attendance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consecutive_absences INTEGER DEFAULT 0,
    weeks_absent INTEGER DEFAULT 0,
    is_debtor BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES user_profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_student ON attendance_alerts(student_id);
CREATE INDEX idx_alerts_resolved ON attendance_alerts(is_resolved);
CREATE INDEX idx_alerts_date ON attendance_alerts(alert_date);

-- Email Notifications Log
CREATE TABLE public.email_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES attendance_alerts(id),
    recipient_email TEXT NOT NULL,
    recipient_type TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    sent_by UUID REFERENCES user_profiles(id)
);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON student_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate consecutive absences
CREATE OR REPLACE FUNCTION calculate_consecutive_absences(p_student_id UUID, p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
    consecutive_count INTEGER := 0;
BEGIN
    SELECT COUNT(*)
    INTO consecutive_count
    FROM attendance_records
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND status = 'absent'
      AND attendance_date >= CURRENT_DATE - INTERVAL '14 days'
    ORDER BY attendance_date DESC;

    RETURN consecutive_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create alerts for low attendance
CREATE OR REPLACE FUNCTION check_and_create_attendance_alert()
RETURNS TRIGGER AS $$
DECLARE
    consecutive_abs INTEGER;
    is_student_debtor BOOLEAN;
    existing_alert UUID;
BEGIN
    -- Only check if marking absent or excused
    IF NEW.status IN ('absent', 'excused') THEN
        -- Calculate consecutive absences
        consecutive_abs := calculate_consecutive_absences(NEW.student_id, NEW.class_id);

        -- Check if student is a debtor
        SELECT (payment_status IN ('overdue_30', 'overdue_60'))
        INTO is_student_debtor
        FROM student_accounts
        WHERE student_id = NEW.student_id;

        -- Create alert if 10+ absences (2 weeks) and no active alert exists
        IF consecutive_abs >= 10 THEN
            SELECT id INTO existing_alert
            FROM attendance_alerts
            WHERE student_id = NEW.student_id
              AND is_resolved = false
              AND alert_date >= CURRENT_DATE - INTERVAL '30 days'
            LIMIT 1;

            IF existing_alert IS NULL THEN
                INSERT INTO attendance_alerts (
                    student_id,
                    alert_type,
                    consecutive_absences,
                    weeks_absent,
                    is_debtor
                ) VALUES (
                    NEW.student_id,
                    CASE WHEN COALESCE(is_student_debtor, false) THEN 'debtor_low_attendance' ELSE 'low_attendance' END,
                    consecutive_abs,
                    FLOOR(consecutive_abs / 5),
                    COALESCE(is_student_debtor, false)
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attendance_alert
    AFTER INSERT OR UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION check_and_create_attendance_alert();

-- Function to update payment status based on days overdue
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.payment_status := CASE
        WHEN NEW.days_overdue >= 60 THEN 'overdue_60'::payment_status
        WHEN NEW.days_overdue >= 30 THEN 'overdue_30'::payment_status
        WHEN NEW.days_overdue >= 15 THEN 'overdue_15'::payment_status
        ELSE 'current'::payment_status
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_status
    BEFORE INSERT OR UPDATE ON student_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Schools Policies
CREATE POLICY "Everyone can view schools" ON schools
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage schools" ON schools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Classes Policies
CREATE POLICY "Everyone can view classes" ON classes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage classes" ON classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Students Policies
CREATE POLICY "Everyone can view students" ON students
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage students" ON students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Attendance Records Policies
CREATE POLICY "Everyone can view attendance" ON attendance_records
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teachers can mark attendance for their classes" ON attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teacher_classes
            WHERE teacher_id = auth.uid() AND class_id = attendance_records.class_id
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Teachers can update attendance for their classes" ON attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teacher_classes
            WHERE teacher_id = auth.uid() AND class_id = attendance_records.class_id
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete attendance" ON attendance_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Student Accounts Policies
CREATE POLICY "Everyone can view accounts" ON student_accounts
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage accounts" ON student_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Payment History Policies
CREATE POLICY "Everyone can view payment history" ON payment_history
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage payments" ON payment_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Attendance Alerts Policies
CREATE POLICY "Everyone can view alerts" ON attendance_alerts
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage alerts" ON attendance_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Email Notifications Policies
CREATE POLICY "Everyone can view email logs" ON email_notifications
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create email logs" ON email_notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View: Student with account and class info
CREATE OR REPLACE VIEW student_details AS
SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.first_name || ' ' || s.last_name as full_name,
    s.grade,
    s.student_number,
    s.parent_name,
    s.parent_email,
    s.parent_phone,
    s.is_active,
    sc.name as school_name,
    sc.id as school_id,
    c.name as class_name,
    c.id as class_id,
    c.start_time,
    c.end_time,
    sa.current_balance,
    sa.payment_status,
    sa.days_overdue
FROM students s
LEFT JOIN schools sc ON s.school_id = sc.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN student_accounts sa ON s.id = sa.student_id;

-- View: Weekly attendance stats
CREATE OR REPLACE VIEW weekly_attendance_stats AS
SELECT
    ar.class_id,
    c.name as class_name,
    DATE_TRUNC('week', ar.attendance_date) as week_start,
    COUNT(DISTINCT ar.student_id) as total_students,
    COUNT(*) FILTER (WHERE ar.status = 'present') as present_count,
    COUNT(*) FILTER (WHERE ar.status = 'absent') as absent_count,
    COUNT(*) FILTER (WHERE ar.status = 'excused') as excused_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ar.status = 'present')::numeric /
         NULLIF(COUNT(*)::numeric, 0)) * 100,
        2
    ) as attendance_percentage
FROM attendance_records ar
JOIN classes c ON ar.class_id = c.id
WHERE ar.attendance_date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY ar.class_id, c.name, DATE_TRUNC('week', ar.attendance_date);

-- View: Active low attendance alerts with student info
CREATE OR REPLACE VIEW active_alerts_with_details AS
SELECT
    aa.id as alert_id,
    aa.alert_type,
    aa.alert_date,
    aa.consecutive_absences,
    aa.weeks_absent,
    aa.is_debtor,
    s.id as student_id,
    s.first_name || ' ' || s.last_name as student_name,
    s.grade,
    s.parent_name,
    s.parent_email,
    s.parent_phone,
    c.name as class_name,
    sc.name as school_name,
    sa.current_balance,
    sa.days_overdue,
    sa.payment_status
FROM attendance_alerts aa
JOIN students s ON aa.student_id = s.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN schools sc ON s.school_id = sc.id
LEFT JOIN student_accounts sa ON s.id = sa.student_id
WHERE aa.is_resolved = false
ORDER BY aa.alert_date DESC, aa.consecutive_absences DESC;
