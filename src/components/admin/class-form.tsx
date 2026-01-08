'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Class, School, UserProfile } from '@/types/models'
import { Loader2 } from 'lucide-react'

interface ClassFormProps {
  schoolClass?: Class
  schoolId?: string
  onSuccess: () => void
  onCancel: () => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function ClassForm({
  schoolClass,
  schoolId,
  onSuccess,
  onCancel,
}: ClassFormProps) {
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [selectedSchool, setSelectedSchool] = useState(schoolId || '')
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    schoolClass?.schedule_days || []
  )
  const [formData, setFormData] = useState({
    name: schoolClass?.name || '',
    grade: schoolClass?.grade || '',
    start_time: schoolClass?.start_time || '',
    end_time: schoolClass?.end_time || '',
    room_number: schoolClass?.room_number || '',
    capacity: schoolClass?.capacity || '',
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (schoolsError) throw schoolsError
        setSchools(schoolsData || [])

        const { data: teachersData, error: teachersError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'teacher')
          .order('full_name')

        if (teachersError) throw teachersError
        setTeachers(teachersData || [])

        // If editing, fetch currently assigned teachers
        if (schoolClass?.id) {
          const { data: assignedData, error: assignedError } = await supabase
            .from('teacher_classes')
            .select('teacher_id')
            .eq('class_id', schoolClass.id)

          if (!assignedError) {
            setSelectedTeachers(assignedData?.map((item) => item.teacher_id) || [])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [supabase, schoolClass?.id])

  const handleDayToggle = (day: string) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchool) {
      toast.error('Please select a school')
      return
    }
    if (scheduleDays.length === 0) {
      toast.error('Please select at least one day')
      return
    }

    setLoading(true)

    try {
      const payload = {
        school_id: selectedSchool,
        name: formData.name,
        grade: formData.grade,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        room_number: formData.room_number || null,
        capacity: formData.capacity ? parseInt(formData.capacity as string) : null,
        schedule_days: scheduleDays,
      }

      let classId = schoolClass?.id

      if (schoolClass?.id) {
        // Update
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', schoolClass.id)

        if (error) throw error
        toast.success('Class updated successfully!')
      } else {
        // Create
        const { data, error } = await supabase
          .from('classes')
          .insert([payload])
          .select('id')

        if (error) throw error
        classId = data?.[0]?.id
        toast.success('Class created successfully!')
      }

      // Handle teacher assignments
      if (classId) {
        // Delete existing assignments
        await supabase.from('teacher_classes').delete().eq('class_id', classId)

        // Insert new assignments
        if (selectedTeachers.length > 0) {
          const { error: insertError } = await supabase
            .from('teacher_classes')
            .insert(
              selectedTeachers.map((teacherId) => ({
                teacher_id: teacherId,
                class_id: classId,
              }))
            )

          if (insertError) throw insertError
        }
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save class')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schoolClass ? 'Edit Class' : 'Create Class'}</CardTitle>
        <CardDescription>
          {schoolClass ? 'Update class information' : 'Add a new class to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="school">School *</Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger id="school">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Grade 5A"
              />
            </div>
            <div>
              <Label htmlFor="grade">Grade *</Label>
              <Input
                id="grade"
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="e.g., 5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g., 101"
              />
            </div>
            <div>
              <Label htmlFor="capacity">Class Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          <div>
            <Label>Assign Teachers</Label>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded p-3">
              {teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teachers available</p>
              ) : (
                teachers.map((teacher) => (
                  <div key={teacher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeachers([...selectedTeachers, teacher.id])
                        } else {
                          setSelectedTeachers(selectedTeachers.filter((id) => id !== teacher.id))
                        }
                      }}
                    />
                    <label htmlFor={`teacher-${teacher.id}`} className="cursor-pointer text-sm">
                      {teacher.full_name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>Schedule Days *</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {DAYS.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={scheduleDays.includes(day)}
                    onCheckedChange={() => handleDayToggle(day)}
                  />
                  <label htmlFor={day} className="cursor-pointer text-sm">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Class'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
