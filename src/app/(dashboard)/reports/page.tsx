'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface ClassStats {
  class_name: string
  attendance_percentage: number
  present_count: number
  absent_count: number
  total: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .gte('attendance_date', dateRange.start)
          .lte('attendance_date', dateRange.end)

        if (error) throw error

        // Group by class and calculate stats
        const statsMap: Record<string, ClassStats> = {}

        // First get all classes
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')

        if (classesData) {
          classesData.forEach((cls) => {
            statsMap[cls.id] = {
              class_name: cls.name,
              attendance_percentage: 0,
              present_count: 0,
              absent_count: 0,
              total: 0,
            }
          })
        }

        // Process attendance records
        data?.forEach((record) => {
          if (statsMap[record.class_id]) {
            if (record.status === 'present') {
              statsMap[record.class_id].present_count++
            } else {
              statsMap[record.class_id].absent_count++
            }
            statsMap[record.class_id].total++
          }
        })

        // Calculate percentages
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
  }, [dateRange, supabase])

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

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
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
    </div>
  )
}
