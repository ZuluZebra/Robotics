'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Student, School, Class } from '@/types/models'
import { Loader2 } from 'lucide-react'

interface StudentFormProps {
  student?: Student
  onSuccess: () => void
  onCancel: () => void
}

export function StudentForm({ student, onSuccess, onCancel }: StudentFormProps) {
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedSchool, setSelectedSchool] = useState(student?.school_id || '')
  const [selectedClass, setSelectedClass] = useState(student?.class_id || '')
  const [formData, setFormData] = useState({
    first_name: student?.first_name || '',
    last_name: student?.last_name || '',
    grade: student?.grade || '',
    student_number: student?.student_number || '',
    date_of_birth: student?.date_of_birth || '',
    parent_name: student?.parent_name || '',
    parent_email: student?.parent_email || '',
    parent_phone: student?.parent_phone || '',
    emergency_contact: student?.emergency_contact || '',
    emergency_phone: student?.emergency_phone || '',
    medical_notes: student?.medical_notes || '',
  })
  const supabase = createClient()

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

  useEffect(() => {
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
  }, [selectedSchool, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchool) {
      toast.error('Please select a school')
      return
    }

    setLoading(true)

    try {
      const payload = {
        school_id: selectedSchool,
        class_id: selectedClass || null,
        ...formData,
        date_of_birth: formData.date_of_birth || null,
      }

      if (student?.id) {
        // Update
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', student.id)

        if (error) throw error
        toast.success('Student updated successfully!')
      } else {
        // Create
        const { error, data } = await supabase
          .from('students')
          .insert([payload])
          .select()

        if (error) throw error

        // Create student account automatically
        if (data && data[0]) {
          await supabase.from('student_accounts').insert([
            {
              student_id: data[0].id,
              current_balance: 0,
              days_overdue: 0,
            },
          ])
        }

        toast.success('Student created successfully!')
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{student ? 'Edit Student' : 'Create Student'}</CardTitle>
        <CardDescription>
          {student ? 'Update student information' : 'Add a new student to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grade">Grade *</Label>
              <Input
                id="grade"
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="student_number">Student Number</Label>
              <Input
                id="student_number"
                value={formData.student_number}
                onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Parent Information</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="parent_name">Parent Name</Label>
                <Input
                  id="parent_name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent_email">Parent Email</Label>
                  <Input
                    id="parent_email"
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="parent_phone">Parent Phone</Label>
                  <Input
                    id="parent_phone"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Emergency Contact</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="emergency_contact">Contact Name</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="emergency_phone">Contact Phone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="medical_notes">Medical Notes</Label>
            <Textarea
              id="medical_notes"
              value={formData.medical_notes}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
              placeholder="Any allergies or medical conditions..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Student'
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
