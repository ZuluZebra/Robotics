'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ParentAbsenceNotification } from '@/types/models'

export interface ParentPortalData {
  id: string
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
  school_name?: string
  school_address?: string
  school_phone?: string
  school_email?: string
  bank_name?: string
  account_holder?: string
  account_number?: string
  branch_code?: string
  payment_reference?: string
  class_id?: string
  class_name?: string
  class_grade?: string
  schedule_days?: string[]
  start_time?: string
  end_time?: string
  room_number?: string
  teacher_names?: string[]
}

export interface UpdateParentInfoData {
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  emergency_contact?: string
  emergency_phone?: string
  medical_notes?: string
  date_of_birth?: string
}

export async function generateParentAccessToken(studentId: string) {
  const supabase = await createClient()

  try {
    const { data: existingToken, error: fetchError } = await supabase
      .from('parent_access_tokens')
      .select('token')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single()

    if (existingToken && !fetchError) {
      return {
        success: true,
        token: existingToken.token,
        isNew: false,
      }
    }

    const { data, error } = await supabase
      .from('parent_access_tokens')
      .insert([{ student_id: studentId }])
      .select('token')
      .single()

    if (error) throw error

    return {
      success: true,
      token: data.token,
      isNew: true,
    }
  } catch (error) {
    console.error('Error generating parent access token:', error)
    return {
      success: false,
      error: 'Failed to generate access token',
    }
  }
}

export async function getStudentDataByToken(token: string): Promise<{
  success: boolean
  data?: ParentPortalData
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('parent_access_tokens')
      .select('student_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return { success: false, error: 'Invalid access link' }
    }

    if (!tokenData.is_active) {
      return { success: false, error: 'This access link has been deactivated' }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'This access link has expired' }
    }

    await supabase
      .from('parent_access_tokens')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('token', token)

    const { data: studentData, error: studentError } = await supabase
      .from('parent_portal_student_details')
      .select('*')
      .eq('id', tokenData.student_id)
      .single()

    if (studentError || !studentData) {
      return { success: false, error: 'Student not found' }
    }

    return { success: true, data: studentData as ParentPortalData }
  } catch (error) {
    console.error('Error fetching student data:', error)
    return { success: false, error: 'Failed to load student information' }
  }
}

export async function updateParentInfo(
  token: string,
  updates: UpdateParentInfoData
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('parent_access_tokens')
      .select('student_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData || !tokenData.is_active) {
      return { success: false, error: 'Invalid or inactive access link' }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Access link has expired' }
    }

    if (updates.parent_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.parent_email)) {
        return { success: false, error: 'Invalid email format' }
      }
    }

    const allowedUpdates: Partial<UpdateParentInfoData> = {}
    const allowedFields: (keyof UpdateParentInfoData)[] = [
      'parent_name',
      'parent_email',
      'parent_phone',
      'emergency_contact',
      'emergency_phone',
      'medical_notes',
      'date_of_birth',
    ]

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        allowedUpdates[field] = updates[field]
      }
    })

    const { error: updateError } = await supabase
      .from('students')
      .update(allowedUpdates)
      .eq('id', tokenData.student_id)

    if (updateError) throw updateError

    revalidatePath(`/parent/${token}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating parent info:', error)
    return { success: false, error: 'Failed to update information' }
  }
}

export async function deactivateParentToken(studentId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('parent_access_tokens')
      .update({ is_active: false })
      .eq('student_id', studentId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deactivating token:', error)
    return { success: false, error: 'Failed to deactivate access link' }
  }
}

export async function notifyAbsence(
  token: string,
  data: {
    class_id: string
    absence_date: string
    reason: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('parent_access_tokens')
      .select('student_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData || !tokenData.is_active) {
      return { success: false, error: 'Invalid or inactive access link' }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Access link has expired' }
    }

    // Validate absence date is today or in the future
    const absenceDate = new Date(data.absence_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    absenceDate.setHours(0, 0, 0, 0)

    if (absenceDate < today) {
      return { success: false, error: 'Can only notify for today or future dates' }
    }

    const { error: insertError } = await supabase
      .from('parent_absence_notifications')
      .insert([
        {
          student_id: tokenData.student_id,
          class_id: data.class_id,
          absence_date: data.absence_date,
          reason: data.reason,
          notes: data.notes || null,
        },
      ])

    if (insertError) {
      if (insertError.message.includes('duplicate')) {
        return { success: false, error: 'You have already notified absence for this date' }
      }
      throw insertError
    }

    // Create attendance alert for pre-notified absence
    await supabase
      .from('attendance_alerts')
      .insert([
        {
          student_id: tokenData.student_id,
          alert_type: 'pre_notified_absence',
          alert_date: new Date().toISOString().split('T')[0],
          consecutive_absences: 0,
          weeks_absent: 0,
          is_debtor: false,
          notes: `Parent notified: ${data.reason}. ${data.notes || ''}`.trim(),
        },
      ])

    revalidatePath(`/parent/${token}`)

    return { success: true }
  } catch (error) {
    console.error('Error notifying absence:', error)
    return { success: false, error: 'Failed to notify absence' }
  }
}

export async function getUpcomingAbsences(token: string): Promise<{
  success: boolean
  data?: ParentAbsenceNotification[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('parent_access_tokens')
      .select('student_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData || !tokenData.is_active) {
      return { success: false, error: 'Invalid or inactive access link' }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Access link has expired' }
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: notifications, error: fetchError } = await supabase
      .from('parent_absence_notifications')
      .select('*')
      .eq('student_id', tokenData.student_id)
      .gte('absence_date', today)
      .order('absence_date', { ascending: true })

    if (fetchError) throw fetchError

    return { success: true, data: notifications as ParentAbsenceNotification[] }
  } catch (error) {
    console.error('Error fetching upcoming absences:', error)
    return { success: false, error: 'Failed to fetch absences' }
  }
}

export async function cancelAbsenceNotification(
  token: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('parent_access_tokens')
      .select('student_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData || !tokenData.is_active) {
      return { success: false, error: 'Invalid or inactive access link' }
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Access link has expired' }
    }

    // Verify notification belongs to this student
    const { data: notification, error: fetchError } = await supabase
      .from('parent_absence_notifications')
      .select('student_id')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: 'Notification not found' }
    }

    if (notification.student_id !== tokenData.student_id) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error: deleteError } = await supabase
      .from('parent_absence_notifications')
      .delete()
      .eq('id', notificationId)

    if (deleteError) throw deleteError

    // Delete corresponding pre_notified_absence alert if exists
    await supabase
      .from('attendance_alerts')
      .delete()
      .eq('student_id', tokenData.student_id)
      .eq('alert_type', 'pre_notified_absence')
      .eq('is_resolved', false)

    revalidatePath(`/parent/${token}`)

    return { success: true }
  } catch (error) {
    console.error('Error canceling absence notification:', error)
    return { success: false, error: 'Failed to cancel notification' }
  }
}
