'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

interface ClassStats {
  class_name: string
  attendance_percentage: number
  present_count: number
  absent_count: number
  total: number
}

interface AttendanceRecord {
  id: string
  attendance_date: string
  student_name: string
  class_name: string
  school_name: string
  status: string
  absence_reason?: string
  comments?: string
}

interface School {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
  school_id: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  class_id: string
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedStudent, setSelectedStudent] = useState<string>('__all__')

  const supabase = createClient()

  // Fetch lookup data on mount
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [schoolsRes, classesRes, studentsRes] = await Promise.all([
          supabase.from('schools').select('id, name').eq('is_active', true),
          supabase.from('classes').select('id, name, school_id').eq('is_active', true),
          supabase.from('students').select('id, first_name, last_name, class_id'),
        ])

        if (schoolsRes.data) setSchools(schoolsRes.data)
        if (classesRes.data) setClasses(classesRes.data)
        if (studentsRes.data) setStudents(studentsRes.data)
      } catch (error) {
        console.error('Error fetching lookup data:', error)
      }
    }

    fetchLookupData()
  }, [supabase])

  // Fetch attendance data and calculate stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        let query = supabase
          .from('attendance_records')
          .select(
            '*, students(first_name, last_name), classes(name, school_id, schools(name))'
          )
          .gte('attendance_date', dateRange.start)
          .lte('attendance_date', dateRange.end)

        // Apply filters
        if (selectedSchool) {
          query = query.eq('classes.school_id', selectedSchool)
        }
        if (selectedClass) {
          query = query.eq('class_id', selectedClass)
        }
        if (selectedStudent && selectedStudent !== '__all__') {
          query = query.eq('student_id', selectedStudent)
        }

        const { data, error } = await query

        if (error) throw error

        // Transform data for display
        const records: AttendanceRecord[] = data?.map((record: any) => ({
          id: record.id,
          attendance_date: record.attendance_date,
          student_name: `${record.students?.first_name || ''} ${record.students?.last_name || ''}`.trim(),
          class_name: record.classes?.name || 'Unknown',
          school_name: record.classes?.schools?.name || 'Unknown',
          status: record.status,
          absence_reason: record.absence_reason,
          comments: record.comments,
        })) || []

        setAttendanceRecords(records)

        // Calculate class stats for charts
        const statsMap: Record<string, ClassStats> = {}
        classes.forEach((cls) => {
          statsMap[cls.id] = {
            class_name: cls.name,
            attendance_percentage: 0,
            present_count: 0,
            absent_count: 0,
            total: 0,
          }
        })

        records.forEach((record) => {
          const classId = Object.keys(statsMap).find(
            (id) => statsMap[id].class_name === record.class_name
          )
          if (classId && statsMap[classId]) {
            if (record.status === 'present') {
              statsMap[classId].present_count++
            } else {
              statsMap[classId].absent_count++
            }
            statsMap[classId].total++
          }
        })

        Object.keys(statsMap).forEach((classId) => {
          const stats = statsMap[classId]
          if (stats.total > 0) {
            stats.attendance_percentage = Math.round(
              (stats.present_count / stats.total) * 100
            )
          }
        })

        setClassStats(Object.values(statsMap).filter((s) => s.total > 0))
      } catch (error) {
        console.error('Error fetching stats:', error)
        toast.error('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchStats()
  }, [dateRange, selectedSchool, selectedClass, selectedStudent, supabase, classes])

  const handleExportToExcel = () => {
    if (attendanceRecords.length === 0) {
      toast.error('No data to export')
      return
    }

    // Summary data
    const summaryData = [
      { Metric: 'Overall Attendance %', Value: `${overallPercentage}%` },
      { Metric: 'Total Present', Value: classStats.reduce((sum, s) => sum + s.present_count, 0) },
      { Metric: 'Total Absent', Value: classStats.reduce((sum, s) => sum + s.absent_count, 0) },
      { Metric: 'Date Range', Value: `${dateRange.start} to ${dateRange.end}` },
    ]

    // Detailed records data
    const data = attendanceRecords.map((record) => ({
      Date: record.attendance_date,
      'Student Name': record.student_name,
      School: record.school_name,
      Class: record.class_name,
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      'Absence Reason': record.absence_reason || '—',
      Comments: record.comments || '—',
    }))

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new()

    // Add Summary sheet
    const summarySummaryWs = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySummaryWs, 'Summary')

    // Add Detailed records sheet
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

    const filename = `attendance-report-${dateRange.start}-to-${dateRange.end}.xlsx`
    XLSX.writeFile(wb, filename)
    toast.success('Report exported successfully!')
  }

  const overallPercentage = classStats.length > 0
    ? Math.round(
        classStats.reduce((sum, s) => sum + s.attendance_percentage, 0) /
        classStats.length
      )
    : 0

  const pieData = [
    {
      name: 'Present',
      value: classStats.reduce((sum, s) => sum + s.present_count, 0),
    },
    {
      name: 'Absent',
      value: classStats.reduce((sum, s) => sum + s.absent_count, 0),
    },
  ]

  const COLORS = ['#10b981', '#ef4444']

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">
          View detailed attendance reports and visualizations
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance records by date, school, class, and student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                />
              </div>
            </div>

            {/* School, Class, Student Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="school-filter">School</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger id="school-filter">
                    <SelectValue placeholder="All Schools" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class-filter">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class-filter">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((cls) => !selectedSchool || cls.school_id === selectedSchool)
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="student-filter">Person Absent</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger id="student-filter">
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Students</SelectItem>
                    {students
                      .filter((student) => !selectedClass || student.class_id === selectedClass)
                      .map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleExportToExcel} className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallPercentage}%</div>
            <p className="text-xs text-gray-600 mt-1">Average across all classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {classStats.reduce((sum, s) => sum + s.present_count, 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Students present in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {classStats.reduce((sum, s) => sum + s.absent_count, 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Students absent in period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {!loading && classStats.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Attendance by Class */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance by Class</CardTitle>
              <CardDescription>
                Attendance percentage for each class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="class_name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attendance_percentage" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Overall Present/Absent */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Attendance Breakdown</CardTitle>
              <CardDescription>
                Present vs Absent in period
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <p className="text-gray-600">No data available for selected date range</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Class Stats */}
      {classStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Details</CardTitle>
            <CardDescription>
              Detailed statistics for each class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Class</th>
                    <th className="text-right py-3 px-4 font-semibold">Present</th>
                    <th className="text-right py-3 px-4 font-semibold">Absent</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {classStats.map((stat) => (
                    <tr key={stat.class_name} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{stat.class_name}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        {stat.present_count}
                      </td>
                      <td className="text-right py-3 px-4 text-red-600 font-medium">
                        {stat.absent_count}
                      </td>
                      <td className="text-right py-3 px-4">{stat.total}</td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${stat.attendance_percentage}%`,
                              }}
                            ></div>
                          </div>
                          <span className="font-semibold">
                            {stat.attendance_percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Attendance Records */}
      {attendanceRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {attendanceRecords.length} record{attendanceRecords.length !== 1 ? 's' : ''} matching filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Student</th>
                    <th className="text-left py-3 px-4 font-semibold">School</th>
                    <th className="text-left py-3 px-4 font-semibold">Class</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Reason</th>
                    <th className="text-left py-3 px-4 font-semibold">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs">{record.attendance_date}</td>
                      <td className="py-3 px-4">{record.student_name}</td>
                      <td className="py-3 px-4">{record.school_name}</td>
                      <td className="py-3 px-4">{record.class_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.absence_reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.comments || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
