'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Class } from '@/types/models'
import { Loader2 } from 'lucide-react'

interface TeacherAssignmentsProps {
  teacherId: string
  onSuccess: () => void
  onCancel: () => void
}

export function TeacherAssignments({ teacherId, onSuccess, onCancel }: TeacherAssignmentsProps) {
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all classes
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .eq('is_active', true)

        if (classesError) throw classesError
        setClasses(classesData || [])

        // Fetch assigned classes for this teacher
        const { data: assignedData, error: assignedError } = await supabase
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', teacherId)

        if (assignedError) throw assignedError
        setAssignedClassIds(assignedData?.map((item) => item.class_id) || [])
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load classes')
      } finally {
        setLoadingClasses(false)
      }
    }

    loadData()
  }, [teacherId, supabase])

  const handleAssignmentChange = (classId: string, isChecked: boolean) => {
    if (isChecked) {
      setAssignedClassIds([...assignedClassIds, classId])
    } else {
      setAssignedClassIds(assignedClassIds.filter((id) => id !== classId))
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Delete all existing assignments for this teacher
      const { error: deleteError } = await supabase
        .from('teacher_classes')
        .delete()
        .eq('teacher_id', teacherId)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (assignedClassIds.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_classes')
          .insert(
            assignedClassIds.map((classId) => ({
              teacher_id: teacherId,
              class_id: classId,
            }))
          )

        if (insertError) throw insertError
      }

      toast.success('Class assignments updated successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save assignments')
    } finally {
      setLoading(false)
    }
  }

  if (loadingClasses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Classes to Teacher</CardTitle>
        <CardDescription>Select which classes this teacher is responsible for</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {classes.length === 0 ? (
            <p className="text-muted-foreground">No classes available</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center space-x-3 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id={`class-${cls.id}`}
                    checked={assignedClassIds.includes(cls.id)}
                    onCheckedChange={(checked) => handleAssignmentChange(cls.id, checked as boolean)}
                  />
                  <Label
                    htmlFor={`class-${cls.id}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <div>
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-sm text-muted-foreground">Grade {cls.grade}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assignments'
              )}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
