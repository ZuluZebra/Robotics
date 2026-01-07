'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { School, Class } from '@/types/models'
import { formatSchedule, formatTime } from '@/lib/utils'

interface ClassSelectorProps {
  onSchoolChange: (schoolId: string) => void
  onClassChange: (classId: string) => void
  selectedSchool: string
  selectedClass: string
  teacherMode?: boolean
  assignedClasses?: Class[]
}

export function ClassSelector({
  onSchoolChange,
  onClassChange,
  selectedSchool,
  selectedClass,
  teacherMode = false,
  assignedClasses = [],
}: ClassSelectorProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const supabase = createClient()

  // Fetch schools
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setSchools(data || [])
      } catch (error) {
        console.error('Error fetching schools:', error)
      }
    }

    fetchSchools()
  }, [supabase])

  // Handle teacher mode - use assigned classes directly
  useEffect(() => {
    if (teacherMode && assignedClasses.length > 0) {
      setClasses(assignedClasses)
      // Auto-select first class if only one exists
      if (assignedClasses.length === 1 && !selectedClass) {
        onClassChange(assignedClasses[0].id)
      }
    }
  }, [teacherMode, assignedClasses, selectedClass, onClassChange])

  // Fetch classes when school changes (normal mode)
  useEffect(() => {
    if (teacherMode) return // Skip in teacher mode

    const fetchClasses = async () => {
      if (!selectedSchool) {
        setClasses([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('school_id', selectedSchool)
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setClasses(data || [])
      } catch (error) {
        console.error('Error fetching classes:', error)
      }
    }

    fetchClasses()
  }, [selectedSchool, supabase, teacherMode])

  return (
    <div className={`grid gap-6 ${teacherMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {!teacherMode && (
        <div className="space-y-2">
          <Label htmlFor="school-select">School</Label>
          <Select value={selectedSchool} onValueChange={onSchoolChange}>
            <SelectTrigger id="school-select">
              <SelectValue placeholder="Select a school..." />
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
      )}

      <div className="space-y-2">
        <Label htmlFor="class-select">Class</Label>
        <Select value={selectedClass} onValueChange={onClassChange} disabled={!teacherMode && !selectedSchool}>
          <SelectTrigger id="class-select">
            <SelectValue placeholder="Select a class..." />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                <div className="flex items-center space-x-2">
                  <span>{cls.name}</span>
                  {cls.start_time && cls.end_time && (
                    <span className="text-xs text-gray-500">
                      ({formatTime(cls.start_time)} - {formatTime(cls.end_time)})
                    </span>
                  )}
                  {cls.schedule_days && cls.schedule_days.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {formatSchedule(cls.schedule_days)}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
