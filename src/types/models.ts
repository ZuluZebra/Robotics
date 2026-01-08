export type UserRole = 'admin' | 'teacher'
export type AttendanceStatus = 'present' | 'absent' | 'excused'
export type PaymentStatus = 'current' | 'overdue_15' | 'overdue_30' | 'overdue_60'
export type AlertType = 'low_attendance' | 'debtor_low_attendance' | 'pre_notified_absence'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  principal_name?: string
  bank_name?: string
  account_holder?: string
  account_number?: string
  branch_code?: string
  payment_reference?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  school_id: string
  name: string
  grade: string
  schedule_days: string[]
  start_time?: string
  end_time?: string
  room_number?: string
  capacity?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeacherClass {
  id: string
  teacher_id: string
  class_id: string
  assigned_at: string
}

export interface Student {
  id: string
  school_id: string
  class_id?: string
  first_name: string
  last_name: string
  grade: string
  student_number?: string
  date_of_birth?: string
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  emergency_contact?: string
  emergency_phone?: string
  medical_notes?: string
  monthly_cost?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ParentAccessToken {
  id: string
  student_id: string
  token: string
  created_at: string
  expires_at?: string
  is_active: boolean
  last_accessed_at?: string
}

export interface ParentAbsenceNotification {
  id: string
  student_id: string
  class_id: string
  absence_date: string
  reason?: string
  notes?: string
  created_at: string
  created_by_parent: boolean
  is_processed: boolean
}

export interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string
  attendance_date: string
  status: AttendanceStatus
  absence_reason?: string
  comments?: string
  marked_by?: string
  marked_at: string
  updated_at: string
}

export interface StudentAccount {
  id: string
  student_id: string
  current_balance: number
  last_payment_date?: string
  last_payment_amount?: number
  days_overdue: number
  payment_status: PaymentStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface PaymentRecord {
  id: string
  account_id: string
  student_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  notes?: string
  recorded_by?: string
  created_at: string
}

export interface AttendanceAlert {
  id: string
  student_id: string
  alert_type: AlertType
  alert_date: string
  consecutive_absences: number
  weeks_absent: number
  is_debtor: boolean
  is_resolved: boolean
  resolved_at?: string
  resolved_by?: string
  notes?: string
  created_at: string
}

export interface AttendanceAlertWithDetails extends AttendanceAlert {
  alert_id: string
  student_name: string
  grade: string
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  class_name?: string
  school_name?: string
  current_balance?: number
  days_overdue?: number
  payment_status?: PaymentStatus
}

export interface StudentDetail {
  id: string
  first_name: string
  last_name: string
  full_name: string
  grade: string
  student_number?: string
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  is_active: boolean
  school_name?: string
  school_id?: string
  class_name?: string
  class_id?: string
  start_time?: string
  end_time?: string
  current_balance?: number
  payment_status?: PaymentStatus
  days_overdue?: number
}

export interface WeeklyAttendanceStats {
  class_id: string
  class_name: string
  week_start: string
  total_students: number
  present_count: number
  absent_count: number
  excused_count: number
  attendance_percentage: number
}

export interface EmailNotification {
  id: string
  alert_id?: string
  recipient_email: string
  recipient_type: string
  subject: string
  body: string
  sent_at: string
  sent_by?: string
}

export interface BulkImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
    data: Record<string, unknown>
  }>
}

export interface TeacherClassWithDetails extends TeacherClass {
  class_name: string
  school_name: string
  grade: string
}

export interface TeacherWithClasses extends UserProfile {
  assigned_classes?: TeacherClassWithDetails[]
}

export interface TeacherStudentAbsences {
  teacher_id: string
  class_id: string
  teacher_name: string
  class_name: string
  school_name: string
  student_id: string
  student_name: string
  total_absences: number
  first_absence_date?: string
  last_absence_date?: string
}

export interface ClassStats {
  class_name: string
  attendance_percentage: number
  present_count: number
  absent_count: number
  total: number
}
