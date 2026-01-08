'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  getStudentDataByToken,
  updateParentInfo,
  notifyAbsence,
  getUpcomingAbsences,
  cancelAbsenceNotification,
} from '@/app/actions/parent-portal'
import { ParentPortalData } from '@/app/actions/parent-portal'
import { ParentAbsenceNotification } from '@/types/models'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { School, Calendar, Users, AlertCircle, Loader, CreditCard, Bell, X } from 'lucide-react'

export default function ParentPortalPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<ParentPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state for editable fields
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Absence notification state
  const [upcomingAbsences, setUpcomingAbsences] = useState<ParentAbsenceNotification[]>([])
  const [absenceReason, setAbsenceReason] = useState('')
  const [absenceDate, setAbsenceDate] = useState('')
  const [absenceNotes, setAbsenceNotes] = useState('')
  const [notifyingAbsence, setNotifyingAbsence] = useState(false)
  const [upcomingClassSessions, setUpcomingClassSessions] = useState<Array<{ date: string; dayName: string; time: string }>>([])

  // Calculate upcoming class sessions based on schedule_days
  const calculateUpcomingClassSessions = (data: ParentPortalData) => {
    if (!data.schedule_days || !Array.isArray(data.schedule_days)) {
      setUpcomingClassSessions([])
      return
    }

    const dayMap: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 0,
    }

    const sessions: Array<{ date: string; dayName: string; time: string }> = []
    const today = new Date()
    let currentDate = new Date(today)

    // Find next 5 upcoming class sessions
    while (sessions.length < 5) {
      const dayOfWeek = currentDate.getDay()
      const dayNames = Object.entries(dayMap)
        .filter(([_, dayNum]) => dayNum === dayOfWeek)
        .map(([name]) => name)

      if (dayNames.length > 0 && data.schedule_days.includes(dayNames[0])) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const timeStr = data.start_time || 'TBA'
        sessions.push({
          date: dateStr,
          dayName: dayNames[0],
          time: timeStr,
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    setUpcomingClassSessions(sessions)
  }

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const result = await getStudentDataByToken(token)

        if (!result.success || !result.data) {
          setError(result.error || 'Unable to load student information')
          setLoading(false)
          return
        }

        setData(result.data)
        // Initialize form fields with current data
        setParentName(result.data.parent_name || '')
        setParentEmail(result.data.parent_email || '')
        setParentPhone(result.data.parent_phone || '')
        setEmergencyContact(result.data.emergency_contact || '')
        setEmergencyPhone(result.data.emergency_phone || '')
        setMedicalNotes(result.data.medical_notes || '')
        setDateOfBirth(result.data.date_of_birth || '')

        // Calculate upcoming class sessions
        calculateUpcomingClassSessions(result.data)

        // Load upcoming absences
        const absencesResult = await getUpcomingAbsences(token)
        if (absencesResult.success && absencesResult.data) {
          setUpcomingAbsences(absencesResult.data)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error loading student data:', err)
        setError('Failed to load student information')
        setLoading(false)
      }
    }

    loadStudentData()
  }, [token])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateParentInfo(token, {
        parent_name: parentName,
        parent_email: parentEmail,
        parent_phone: parentPhone,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
        medical_notes: medicalNotes,
        date_of_birth: dateOfBirth,
      })

      if (result.success) {
        toast.success('Information updated successfully!')
        setEditMode(false)
        // Refresh data
        const refreshResult = await getStudentDataByToken(token)
        if (refreshResult.success && refreshResult.data) {
          setData(refreshResult.data)
        }
      } else {
        toast.error(result.error || 'Failed to update information')
      }
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (data) {
      setParentName(data.parent_name || '')
      setParentEmail(data.parent_email || '')
      setParentPhone(data.parent_phone || '')
      setEmergencyContact(data.emergency_contact || '')
      setEmergencyPhone(data.emergency_phone || '')
      setMedicalNotes(data.medical_notes || '')
      setDateOfBirth(data.date_of_birth || '')
    }
    setEditMode(false)
  }

  const handleNotifyAbsence = async () => {
    if (!data?.class_id || !absenceDate || !absenceReason) {
      toast.error('Please fill in all required fields')
      return
    }

    setNotifyingAbsence(true)
    try {
      const result = await notifyAbsence(token, {
        class_id: data.class_id,
        absence_date: absenceDate,
        reason: absenceReason,
        notes: absenceNotes,
      })

      if (result.success) {
        toast.success('Absence notification sent!')
        setAbsenceDate('')
        setAbsenceReason('')
        setAbsenceNotes('')
        // Reload upcoming absences
        const absencesResult = await getUpcomingAbsences(token)
        if (absencesResult.success && absencesResult.data) {
          setUpcomingAbsences(absencesResult.data)
        }
      } else {
        toast.error(result.error || 'Failed to notify absence')
      }
    } catch (err) {
      console.error('Error notifying absence:', err)
      toast.error('An error occurred while notifying absence')
    } finally {
      setNotifyingAbsence(false)
    }
  }

  const handleCancelNotification = async (notificationId: string) => {
    try {
      const result = await cancelAbsenceNotification(token, notificationId)

      if (result.success) {
        toast.success('Notification cancelled!')
        // Reload upcoming absences
        const absencesResult = await getUpcomingAbsences(token)
        if (absencesResult.success && absencesResult.data) {
          setUpcomingAbsences(absencesResult.data)
        }
      } else {
        toast.error(result.error || 'Failed to cancel notification')
      }
    } catch (err) {
      console.error('Error canceling notification:', err)
      toast.error('An error occurred while canceling')
    }
  }


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <Loader className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading student information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-8">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Access Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <p className="text-gray-600">No student data found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* DEBUG: Show what data we have - Mobile only */}
        <div className="sm:hidden bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800">
          <strong>DEBUG (Mobile):</strong> <br/>
          class_id={data?.class_id || 'NULL'} <br/>
          class_name={data?.class_name || 'NULL'} <br/>
          teacher_names={data?.teacher_names?.length || 0}
        </div>
        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">
              {data.first_name} {data.last_name}
            </h1>
            <div className="mt-2 space-y-1 text-teal-100">
              <p>Grade: {data.grade}</p>
              {data.student_number && <p>Student ID: {data.student_number}</p>}
            </div>
          </div>
        </Card>

        {/* School Information */}
        {data.school_name && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-teal-600" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">School Name</p>
                  <p className="font-medium">{data.school_name}</p>
                </div>
                {data.school_address && (
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{data.school_address}</p>
                  </div>
                )}
                {data.school_phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{data.school_phone}</p>
                  </div>
                )}
                {data.school_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-teal-600">{data.school_email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class Information */}
        {data.class_name && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Class Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Class Name</p>
                  <p className="font-medium">{data.class_name}</p>
                </div>
                {data.class_grade && (
                  <div>
                    <p className="text-sm text-gray-600">Class Grade</p>
                    <p className="font-medium">{data.class_grade}</p>
                  </div>
                )}
                {data.schedule_days && data.schedule_days.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Schedule Days</p>
                    <p className="font-medium">{data.schedule_days.join(', ')}</p>
                  </div>
                )}
                {data.start_time && (
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium">
                      {data.start_time} {data.end_time ? `- ${data.end_time}` : ''}
                    </p>
                  </div>
                )}
                {data.room_number && (
                  <div>
                    <p className="text-sm text-gray-600">Room Number</p>
                    <p className="font-medium">{data.room_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teachers Information */}
        {data.teacher_names && data.teacher_names.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.teacher_names.map((teacher, idx) => (
                  <p key={idx} className="font-medium">
                    {teacher}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notify Absence Card */}
        {data?.class_id ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Notify Absence
              </CardTitle>
              <CardDescription>
                Let us know in advance if your child will be absent from class
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Absence Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Select Class Session *</label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {upcomingClassSessions.length > 0 ? (
                      upcomingClassSessions.map((session) => (
                        <button
                          key={session.date}
                          onClick={() => setAbsenceDate(session.date)}
                          className={`p-3 rounded-lg border-2 transition text-left ${
                            absenceDate === session.date
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 bg-white hover:border-teal-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{session.dayName}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(session.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {session.time !== 'TBA' && ` at ${session.time}`}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">No upcoming class sessions</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Reason *</label>
                  <select
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Sick">Sick</option>
                    <option value="Family Emergency">Family Emergency</option>
                    <option value="Medical Appointment">Medical Appointment</option>
                    <option value="School Event">School Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                  <Textarea
                    value={absenceNotes}
                    onChange={(e) => setAbsenceNotes(e.target.value)}
                    placeholder="Any additional information (optional)..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleNotifyAbsence}
                  disabled={notifyingAbsence || !absenceDate || !absenceReason}
                  className="w-full"
                >
                  {notifyingAbsence ? 'Sending notification...' : 'Send Absence Notification'}
                </Button>
              </div>

              {/* Upcoming Absences */}
              {upcomingAbsences.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-3">Notified Absences</h3>
                  <div className="space-y-2">
                    {upcomingAbsences.map((absence) => (
                      <div key={absence.id} className="flex items-start justify-between bg-amber-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-amber-900">
                            {new Date(absence.absence_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-amber-700">{absence.reason}</p>
                          {absence.notes && <p className="text-xs text-amber-600 mt-1">{absence.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleCancelNotification(absence.id)}
                          className="ml-2 text-amber-600 hover:text-amber-800 flex-shrink-0"
                          aria-label="Cancel notification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Notify Absence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Your child has not been assigned to a class yet. Please contact the school to enroll.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Student & Contact Information - Editable */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student & Contact Information</CardTitle>
              <CardDescription>
                {editMode ? 'Edit your contact information' : 'Your contact and student information'}
              </CardDescription>
            </div>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} variant="default">
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {editMode ? (
              <>
                {/* Edit Mode */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Student Date of Birth</label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-4">Parent Contact Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Parent Name</label>
                        <Input
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Parent Email</label>
                        <Input
                          type="email"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Parent Phone</label>
                        <Input
                          type="tel"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Emergency Contact Name</label>
                        <Input
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Emergency Phone</label>
                        <Input
                          type="tel"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-700">Medical Notes</label>
                    <Textarea
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      className="mt-1"
                      rows={4}
                      placeholder="Any medical information, allergies, or special needs..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" disabled={saving} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Student Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date of Birth</span>
                        <span className="font-medium">
                          {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3">Parent Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name</span>
                        <span className="font-medium">{parentName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email</span>
                        <span className="font-medium text-teal-600">{parentEmail || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone</span>
                        <span className="font-medium">{parentPhone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name</span>
                        <span className="font-medium">{emergencyContact || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone</span>
                        <span className="font-medium">{emergencyPhone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {medicalNotes && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-gray-900 mb-3">Medical Notes</h3>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                        {medicalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Information - Moved to Bottom */}
        {(data.monthly_cost || data.bank_name) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Payment Information
              </CardTitle>
              <CardDescription>
                Monthly robotics program fee and banking details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Monthly Cost */}
              {data.monthly_cost && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-teal-800 font-medium mb-1">Monthly Cost</p>
                  <p className="text-3xl font-bold text-teal-900">
                    R {data.monthly_cost.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Robotics League Banking Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Robotics League Banking Details</h3>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 space-y-4 border border-teal-200">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Bank</span>
                    <span className="font-medium text-right">First National Bank (FNB)</span>
                  </div>

                  <div className="flex justify-between items-start border-t border-teal-200 pt-3">
                    <span className="text-sm text-gray-600">Account Name</span>
                    <span className="font-medium text-right">Robotics League Gold Business Account</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Account Number</span>
                    <span className="font-mono font-medium text-right">62943486028</span>
                  </div>

                  <div className="flex justify-between items-start border-t border-teal-200 pt-3">
                    <span className="text-sm text-gray-600">Branch Code</span>
                    <span className="font-mono font-medium text-right">250655</span>
                  </div>

                  <div className="flex justify-between items-start border-t border-teal-200 pt-3">
                    <span className="text-sm text-gray-600">Payment Reference</span>
                    <span className="font-medium text-right">{data.first_name} {data.last_name}</span>
                  </div>
                </div>
              </div>

              {/* School Banking Details (if available) */}
              {data.bank_name && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">School Banking Details</h3>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {data.bank_name && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Bank</span>
                        <span className="font-medium text-right">{data.bank_name}</span>
                      </div>
                    )}

                    {data.account_holder && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Account Holder</span>
                        <span className="font-medium text-right">{data.account_holder}</span>
                      </div>
                    )}

                    {data.account_number && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Account Number</span>
                        <span className="font-mono font-medium text-right">{data.account_number}</span>
                      </div>
                    )}

                    {data.branch_code && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Branch Code</span>
                        <span className="font-mono font-medium text-right">{data.branch_code}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
