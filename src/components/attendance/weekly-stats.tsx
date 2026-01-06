'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getColorForAttendance } from '@/lib/utils'

interface WeeklyStatsProps {
  classId: string
  currentStats?: {
    present: number
    total: number
  }
}

export function WeeklyStats({ classId, currentStats }: WeeklyStatsProps) {
  const [stats, setStats] = useState<{
    present: number
    total: number
    percentage: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      if (!classId) {
        setLoading(false)
        return
      }

      try {
        // Get current week's attendance
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())

        const { data, error } = await supabase
          .from('attendance_records')
          .select('status')
          .eq('class_id', classId)
          .gte('attendance_date', weekStart.toISOString().split('T')[0])
          .lte('attendance_date', today.toISOString().split('T')[0])

        if (error) throw error

        // Count students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId)
          .eq('is_active', true)

        if (studentsError) throw studentsError

        const totalStudents = studentsData?.length || 0
        const presentCount = data?.filter((r) => r.status === 'present').length || 0
        const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

        setStats({
          present: presentCount,
          total: totalStudents,
          percentage,
        })
      } catch (error) {
        console.error('Error fetching weekly stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [classId, supabase])

  // Use current stats if provided (for real-time updates)
  const displayStats = currentStats
    ? {
        present: currentStats.present,
        total: currentStats.total,
        percentage:
          currentStats.total > 0
            ? Math.round((currentStats.present / currentStats.total) * 100)
            : 0,
      }
    : stats

  if (loading && !displayStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!displayStats) {
    return null
  }

  const colorClass = getColorForAttendance(displayStats.percentage)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Attendance</CardTitle>
        <CardDescription>This week's attendance overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Attendance Rate</span>
            <span className={`text-2xl font-bold ${colorClass}`}>
              {displayStats.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                displayStats.percentage >= 90
                  ? 'bg-green-500'
                  : displayStats.percentage >= 75
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${displayStats.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-xl font-bold text-green-600">
              {displayStats.present}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold text-gray-900">
              {displayStats.total}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
