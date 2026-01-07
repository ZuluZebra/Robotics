'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ClassSelector } from './class-selector'
import { StudentSearch } from './student-search'
import { StudentRow } from './student-row'
import { WeeklyStats } from './weekly-stats'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Student, AttendanceRecord } from '@/types/models'
import { Loader2 } from 'lucide-react'

export function AttendanceForm() {
  const { user } = useAuth()
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, AttendanceRecord>
  >({})
  const [studentStates, setStudentStates] = useState<
    Record<
      string,
      { isPresent: boolean; absenceReason: string; comments: string }
    >
  >({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

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

        // Fetch today's attendance records
        const today = new Date().toISOString().split('T')[0]
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', selectedClass)
          .eq('attendance_date', today)

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

        setAttendanceRecords(recordsMap)
        setStudentStates(initialStates)
      } catch (error) {
        console.error('Error fetching students:', error)
        toast.error('Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass, supabase])

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
      const today = new Date().toISOString().split('T')[0]
      const attendanceData = students.map((student) => ({
        student_id: student.id,
        class_id: selectedClass,
        attendance_date: today,
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
        .eq('attendance_date', today)

      // Insert new records
      await supabase
        .from('attendance_records')
        .insert(attendanceData)

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
        <CardContent>
          <ClassSelector
            selectedSchool={selectedSchool}
            selectedClass={selectedClass}
            onSchoolChange={setSelectedSchool}
            onClassChange={setSelectedClass}
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
              <CardTitle>Students ({students.length})</CardTitle>
              <CardDescription>
                Mark attendance for today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      attendance={attendanceRecords[student.id]}
                      isPresent={studentStates[student.id]?.isPresent || false}
                      absenceReason={
                        studentStates[student.id]?.absenceReason || ''
                      }
                      comments={studentStates[student.id]?.comments || ''}
                      onPresentChange={(isPresent) =>
                        setStudentStates((prev) => ({
                          ...prev,
                          [student.id]: {
                            ...prev[student.id],
                            isPresent,
                          },
                        }))
                      }
                      onReasonChange={(reason) =>
                        setStudentStates((prev) => ({
                          ...prev,
                          [student.id]: {
                            ...prev[student.id],
                            absenceReason: reason,
                          },
                        }))
                      }
                      onCommentChange={(comment) =>
                        setStudentStates((prev) => ({
                          ...prev,
                          [student.id]: {
                            ...prev[student.id],
                            comments: comment,
                          },
                        }))
                      }
                    />
                  ))}
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
