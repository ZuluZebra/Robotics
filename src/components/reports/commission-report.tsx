'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserProfile, TeacherStudentAbsences } from '@/types/models'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface CommissionReportProps {
  dateRange?: {
    start: string
    end: string
  }
}

export function CommissionReport({ dateRange }: CommissionReportProps) {
  const [loading, setLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [reportData, setReportData] = useState<TeacherStudentAbsences[]>([])
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'teacher')
          .order('full_name')
        if (error) throw error
        setTeachers(data || [])
        setLoading(false)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to load teachers')
        setLoading(false)
      }
    }
    fetchTeachers()
  }, [supabase])

  useEffect(() => {
    if (!selectedTeacher) {
      setReportData([])
      return
    }
    const fetchReportData = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_student_absences')
          .select('*')
          .eq('teacher_id', selectedTeacher)
          .order('class_name, student_name')
        if (error) throw error

        // Filter by date range on client side
        let filteredData = data || []
        if (dateRange) {
          const startDate = new Date(dateRange.start)
          const endDate = new Date(dateRange.end)

          filteredData = filteredData.filter((item) => {
            // Include absences if they occurred within the date range
            if (item.first_absence_date) {
              const firstDate = new Date(item.first_absence_date)
              const lastDate = item.last_absence_date ? new Date(item.last_absence_date) : firstDate
              // Check if there's any overlap between the absence period and the date range
              return firstDate <= endDate && lastDate >= startDate
            }
            return false
          })

          // Also recalculate total_absences based on the filtered date range
          // This requires querying attendance_records directly
          const { data: absenceData, error: absenceError } = await supabase
            .from('attendance_records')
            .select('student_id, class_id')
            .eq('status', 'absent')
            .gte('attendance_date', dateRange.start)
            .lte('attendance_date', dateRange.end)

          if (!absenceError && absenceData) {
            // Count absences per student
            const absenceCounts: Record<string, number> = {}
            absenceData.forEach((record: any) => {
              const key = `${record.student_id}-${record.class_id}`
              absenceCounts[key] = (absenceCounts[key] || 0) + 1
            })

            // Update filtered data with correct absence counts
            filteredData = filteredData.map((item) => ({
              ...item,
              total_absences: absenceCounts[`${item.student_id}-${item.class_id}`] || 0,
            }))
          }
        }

        setReportData(filteredData)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to load report')
      }
    }
    fetchReportData()
  }, [selectedTeacher, dateRange, supabase])

  const toggleClassExpanded = (classId: string) => {
    const newSet = new Set(expandedClasses)
    newSet.has(classId) ? newSet.delete(classId) : newSet.add(classId)
    setExpandedClasses(newSet)
  }

  const groupedByClass: Record<string, any> = reportData.reduce((acc: Record<string, any>, item) => {
    const key = item.class_id
    if (!acc[key]) {
      acc[key] = { class_id: item.class_id, class_name: item.class_name, students: [] }
    }
    acc[key].students.push(item)
    return acc
  }, {})

  const selectedTeacherData = teachers.find((t) => t.id === selectedTeacher)
  const totalAbsences = reportData.reduce((sum, item) => sum + item.total_absences, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Commission Report</CardTitle>
          <CardDescription>View teacher absence data for commission calculation</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="teacher-select">Teacher *</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger id="teacher-select">
                <SelectValue placeholder="Select a teacher..." />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedTeacher && !loading && (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{selectedTeacherData?.full_name}</CardTitle>
                {dateRange && (
                  <CardDescription>
                    Period: {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
                  </CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Classes</p>
                  <p className="text-2xl font-bold">{Object.keys(groupedByClass).length}</p>
                </div>
                <div className="p-4 bg-red-50 rounded">
                  <p className="text-sm text-gray-600">Total Absences</p>
                  <p className="text-2xl font-bold">{totalAbsences}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.values(groupedByClass).map((classGroup: any) => (
            <Card key={classGroup.class_id}>
              <CardHeader className="cursor-pointer hover:bg-muted" onClick={() => toggleClassExpanded(classGroup.class_id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{classGroup.class_name}</CardTitle>
                    <CardDescription>{classGroup.students.length} students</CardDescription>
                  </div>
                  {expandedClasses.has(classGroup.class_id) ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
              {expandedClasses.has(classGroup.class_id) && (
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3">Student</th>
                        <th className="text-right py-3 px-3">Absences</th>
                        <th className="text-left py-3 px-3 text-xs">First Absence</th>
                        <th className="text-left py-3 px-3 text-xs">Last Absence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classGroup.students.map((student: any) => (
                        <tr key={student.student_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">{student.student_name}</td>
                          <td className="py-3 px-3 text-right">{student.total_absences}</td>
                          <td className="py-3 px-3 text-xs">{student.first_absence_date ? new Date(student.first_absence_date).toLocaleDateString() : '-'}</td>
                          <td className="py-3 px-3 text-xs">{student.last_absence_date ? new Date(student.last_absence_date).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          ))}
        </>
      )}

      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
    </div>
  )
}
