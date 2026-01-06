import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const studentSchema = z.object({
  school_id: z.string().uuid('Invalid school'),
  class_id: z.string().uuid('Invalid class').optional().or(z.literal('')),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  grade: z.string().min(1, 'Grade is required'),
  student_number: z.string().optional(),
  date_of_birth: z.string().optional(),
  parent_name: z.string().optional(),
  parent_email: z.string().email('Invalid email').optional().or(z.literal('')),
  parent_phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  medical_notes: z.string().optional(),
})

export type StudentInput = z.infer<typeof studentSchema>

export const classSchema = z.object({
  school_id: z.string().uuid('Invalid school'),
  name: z.string().min(1, 'Class name is required'),
  grade: z.string().min(1, 'Grade is required'),
  schedule_days: z.array(z.string()).min(1, 'Select at least one day'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  room_number: z.string().optional(),
  capacity: z.number().min(1).optional(),
})

export type ClassInput = z.infer<typeof classSchema>

export const schoolSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  principal_name: z.string().optional(),
})

export type SchoolInput = z.infer<typeof schoolSchema>

export const attendanceSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  attendance_date: z.string(),
  status: z.enum(['present', 'absent', 'excused']),
  absence_reason: z.string().optional(),
  comments: z.string().optional(),
})

export type AttendanceInput = z.infer<typeof attendanceSchema>

export const paymentSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  payment_date: z.string(),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>

export const userSchema = z.object({
  email: z.string().email('Invalid email'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'teacher']),
  phone: z.string().optional(),
})

export type UserInput = z.infer<typeof userSchema>
