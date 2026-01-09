'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ClassSelector } from './class-selector'
import { StudentSearch } from './student-search'
import { CompactAttendanceList } from './compact-attendance-list'
import { WeeklyStats } from './weekly-stats'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Student, AttendanceRecord, ParentAbsenceNotification } from '@/types/models'
import { Loader2 } from 'lucide-react'

export function AttendanceForm() {
  const { user, isAdmin, isTeacher, assignedClasses } = useAuth()
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [useTeacherMode, setUseTeacherMode] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [studentStates, setStudentStates] = useState<
    Record<
      string,
      { isPresent: boolean; absenceReason: string; comments: string }
    >
  >({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Date picker state
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; dayName: string }>>([])

  // Parent notifications state
  const [parentNotifications, setParentNotifications] = useState<
    Record<string, ParentAbsenceNotification>
  >({})

  const supabase = createClient()

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Calculate available dates based on class schedule
  const calculateAvailableDates = (scheduleDays: string[]) => {
    if (!scheduleDays || scheduleDays.length === 0) return []

    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Normalize schedule days to handle different formats (full names, abbreviations, lowercase)
    const normalizedScheduleDays = scheduleDays.map((day) => {
      const lower = day.toLowerCase()
      // Handle abbreviations
      const abbrev = lower.substring(0, 3)
      const fullDay = fullDayNames.find((d) => d.toLowerCase().startsWith(abbrev))
      return fullDay || day // Fall back to original if no match
    })

    const dates: Array<{ date: string; dayName: string }> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Go back 30 days and find all matching schedule days
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayOfWeek = date.getDay()
      const dayName = fullDayNames[dayOfWeek]

      if (normalizedScheduleDays.includes(dayName)) {
        const dateStr = date.toISOString().split('T')[0]
        dates.push({
          date: dateStr,
          dayName: dayName,
        })
      }
    }

    return dates
  }

  // Determine if we should use teacher mode
  const shouldUseTeacherMode = (useTeacherMode || isTeacher) && assignedClasses.length > 0
  const isAdminTeacher = isAdmin && assignedClasses.length > 0

  // Fetch students when class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([])
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', selectedClass)
          .eq('is_active', true)
          .order('last_name, first_name')

        if (error) throw error

        setStudents(data || [])

        // Initialize student states
        const initialStates: Record<string, any> = {}
        data?.forEach((student) => {
          initialStates[student.id] = {
            isPresent: true,
            absenceReason: '',
            comments: '',
          }
        })
        setStudentStates(initialStates)

        // Fetch attendance records for selected date
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', selectedClass)
          .eq('attendance_date', selectedDate)

        if (recordsError) throw recordsError

        const recordsMap: Record<string, AttendanceRecord> = {}
        recordsData?.forEach((record) => {
          recordsMap[record.student_id] = record
          // Update initial states with existing records
          if (initialStates[record.student_id]) {
            initialStates[record.student_id].isPresent =
              record.status === 'present'
            initialStates[record.student_id].absenceReason =
              record.absence_reason || ''
            initialStates[record.student_id].comments = record.comments || ''
          }
        })

        // Fetch parent absence notifications for selected date
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('parent_absence_notifications')
          .select('*')
          .eq('class_id', selectedClass)
          .eq('absence_date', selectedDate)
          .eq('is_processed', false)

        if (notificationsError) throw notificationsError

        const notificationsMap: Record<string, ParentAbsenceNotification> = {}
        notificationsData?.forEach((notification) => {
          notificationsMap[notification.student_id] = notification
          // Auto-mark pre-notified students as absent if they don't have existing records
          if (!recordsMap[notification.student_id] && initialStates[notification.student_id]) {
            initialStates[notification.student_id].isPresent = false
            initialStates[notification.student_id].absenceReason =
              notification.reason || 'Parent notified'
            initialStates[notification.student_id].comments = notification.notes || ''
          }
        })

        setParentNotifications(notificationsMap)
        setStudentStates(initialStates)
      } catch (error) {
        console.error('Error fetching students:', error)
        toast.error('Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass, selectedDate, supabase])

  // Filter students based on search
  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        `${student.first_name} ${student.last_name}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [students, searchQuery]
  )

  // Calculate current stats for real-time display
  const currentStats = useMemo(() => {
    const presentCount = Object.values(studentStates).filter(
      (s) => s.isPresent
    ).length
    return {
      present: presentCount,
      total: students.length,
    }
  }, [studentStates, students.length])

  const handleSave = async () => {
    if (!selectedClass || !user) return

    setSaving(true)
    try {
      const attendanceData = students.map((student) => ({
        student_id: student.id,
        class_id: selectedClass,
        attendance_date: selectedDate,
        status: studentStates[student.id]?.isPresent ? 'present' : 'absent',
        absence_reason: studentStates[student.id]?.absenceReason || null,
        comments: studentStates[student.id]?.comments || null,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
      }))

      // Delete existing records for this class and date
      await supabase
        .from('attendance_records')
        .delete()
        .eq('class_id', selectedClass)
        .eq('attendance_date', selectedDate)

      // Insert new records
      await supabase
        .from('attendance_records')
        .insert(attendanceData)

      // Mark parent notifications as processed
      if (Object.keys(parentNotifications).length > 0) {
        await supabase
          .from('parent_absence_notifications')
          .update({ is_processed: true })
          .eq('class_id', selectedClass)
          .eq('absence_date', selectedDate)
      }

      toast.success(
        `Attendance marked for ${students.length} students!`
      )
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-600 mt-2">
          Record attendance for your classes
        </p>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose a school and class to mark attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdminTeacher && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Switch
                id="teacher-mode"
                checked={useTeacherMode}
                onCheckedChange={setUseTeacherMode}
              />
              <Label htmlFor="teacher-mode" className="cursor-pointer font-normal">
                Show only my assigned classes
              </Label>
            </div>
          )}
          <ClassSelector
            selectedSchool={selectedSchool}
            selectedClass={selectedClass}
            onSchoolChange={setSelectedSchool}
            onClassChange={(classId, classData) => {
              setSelectedClass(classId)
              if (classData?.schedule_days) {
                const dates = calculateAvailableDates(classData.schedule_days)
                console.log('DEBUG - Schedule Days:', classData.schedule_days)
                console.log('DEBUG - Calculated Dates:', dates)
                setAvailableDates(dates)
                // Auto-select most recent date
                if (dates.length > 0) {
                  console.log('DEBUG - Selected Date:', dates[0].date, dates[0].dayName)
                  setSelectedDate(dates[0].date)
                }
              }
            }}
            teacherMode={shouldUseTeacherMode}
            assignedClasses={assignedClasses}
          />
        </CardContent>
      </Card>

      {selectedClass && (
        <>
          {/* Statistics */}
          <WeeklyStats classId={selectedClass} currentStats={currentStats} />

          {/* Attendance Marking */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle>Students ({students.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  {showDatePicker ? 'Hide Date' : 'Mark Different Date'}
                </Button>
              </div>
              <CardDescription>
                Marking attendance for {formatDateDisplay(selectedDate)}
              </CardDescription>
              {showDatePicker && availableDates.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <p className="text-sm font-medium text-gray-700">Select a class date:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableDates.map((dateOption) => (
                      <button
                        key={dateOption.date}
                        onClick={() => {
                          setSelectedDate(dateOption.date)
                          setShowDatePicker(false)
                        }}
                        className={`p-2 rounded-lg border-2 transition text-sm text-center ${
                          selectedDate === dateOption.date
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 bg-white hover:border-teal-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{dateOption.dayName}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(dateOption.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prominent Date Display */}
              <div className="bg-teal-50 border-2 border-teal-300 rounded-lg p-4 text-center">
                <p className="text-sm text-teal-700 font-medium">Marking Attendance For</p>
                <p className="text-2xl font-bold text-teal-900 mt-1">{formatDateDisplay(selectedDate)}</p>
              </div>

              {/* Search */}
              <StudentSearch
                value={searchQuery}
                onChange={setSearchQuery}
              />

              {/* Student List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    {students.length === 0
                      ? 'No students in this class'
                      : 'No students match your search'}
                  </p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <CompactAttendanceList
                    students={filteredStudents}
                    parentNotifications={parentNotifications}
                    studentStates={studentStates}
                    onPresentChange={(studentId, isPresent) =>
                      setStudentStates((prev) => ({
                        ...prev,
                        [studentId]: {
                          ...prev[studentId],
                          isPresent,
                        },
                      }))
                    }
                    onReasonChange={(studentId, reason) =>
                      setStudentStates((prev) => ({
                        ...prev,
                        [studentId]: {
                          ...prev[studentId],
                          absenceReason: reason,
                        },
                      }))
                    }
                    onCommentChange={(studentId, comment) =>
                      setStudentStates((prev) => ({
                        ...prev,
                        [studentId]: {
                          ...prev[studentId],
                          comments: comment,
                        },
                      }))
                    }
                  />
                </div>
              )}

              {/* Save Button */}
              {students.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    className="w-full"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Attendance'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
