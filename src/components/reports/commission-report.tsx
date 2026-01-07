'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserProfile, TeacherStudentAbsences } from '@/types/models'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export function CommissionReport() {
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
        setReportData(data || [])
      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to load report')
      }
    }
    fetchReportData()
  }, [selectedTeacher, supabase])

  const toggleClassExpanded = (classId: string) => {
    const newSet = new Set(expandedClasses)
    newSet.has(classId) ? newSet.delete(classId) : newSet.add(classId)
    setExpandedClasses(newSet)
  }

  const groupedByClass: any = reportData.reduce((acc, item) => {
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
              <CardTitle>{selectedTeacherData?.full_name}</CardTitle>
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
                        <th className="text-left py-2">Student</th>
                        <th className="text-right py-2">Absences</th>
                        <th className="text-left py-2 text-xs">First</th>
                        <th className="text-left py-2 text-xs">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classGroup.students.map((student: any) => (
                        <tr key={student.student_id} className="border-b">
                          <td className="py-2">{student.student_name}</td>
                          <td className="py-2 text-right">{student.total_absences}</td>
                          <td className="py-2 text-xs">{student.first_absence_date ? new Date(student.first_absence_date).toLocaleDateString() : '—'}</td>
                          <td className="py-2 text-xs">{student.last_absence_date ? new Date(student.last_absence_date).toLocaleDateString() : '—'}</td>
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
