'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TeacherForm } from '@/components/admin/teacher-form'
import { TeacherAssignments } from '@/components/admin/teacher-assignments'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserProfile } from '@/types/models'
import { Plus, Edit2, Trash2, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

type DialogMode = 'form' | 'assignments' | null

export default function UsersPage() {
  const [teachers, setTeachers] = useState<UserProfile[]>([])
  const [teacherClassCounts, setTeacherClassCounts] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<UserProfile | null>(null)
  const supabase = createClient()

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name')

      if (error) throw error
      setTeachers(data || [])

      if (data && data.length > 0) {
        const counts: { [key: string]: number } = {}
        for (const teacher of data) {
          const { data: classData } = await supabase
            .from('teacher_classes')
            .select('id', { count: 'exact' })
            .eq('teacher_id', teacher.id)
          counts[teacher.id] = classData?.length || 0
        }
        setTeacherClassCounts(counts)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id)
      if (error) throw error
      toast.success('Teacher deleted!')
      fetchTeachers()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to delete')
    }
  }

  const handleSuccess = () => {
    setDialogMode(null)
    setSelectedTeacher(null)
    fetchTeachers()
  }

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>User Management</h1>
          <p className='text-gray-600 mt-2'>Manage teachers</p>
        </div>
        <Button onClick={() => { setSelectedTeacher(null); setDialogMode('form') }}>
          <Plus className='h-4 w-4 mr-2' /> Add Teacher
        </Button>
      </div>

      <Dialog open={dialogMode === 'form'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedTeacher ? 'Edit' : 'Create'} Teacher</DialogTitle>
            <DialogDescription>{selectedTeacher ? 'Update teacher information' : 'Add a new teacher to the system'}</DialogDescription>
          </DialogHeader>
          <TeacherForm
            teacher={selectedTeacher || undefined}
            onSuccess={handleSuccess}
            onCancel={() => { setDialogMode(null); setSelectedTeacher(null) }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === 'assignments'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Manage Assignments</DialogTitle>
            <DialogDescription>Select which classes this teacher is responsible for</DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <TeacherAssignments
              teacherId={selectedTeacher.id}
              onSuccess={handleSuccess}
              onCancel={() => { setDialogMode(null); setSelectedTeacher(null) }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>{teachers.length} teacher(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Name', accessor: 'full_name' },
              { header: 'Email', accessor: 'email' },
              { header: 'Phone', accessor: (t: UserProfile) => t.phone || '—' },
              { header: 'Classes', accessor: (t: UserProfile) => teacherClassCounts[t.id] || 0 },
            ]}
            data={teachers}
            loading={loading}
            actions={(teacher) => (
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' onClick={() => { setSelectedTeacher(teacher); setDialogMode('assignments') }}><GraduationCap className='h-4 w-4' /></Button>
                <Button size='sm' variant='outline' onClick={() => { setSelectedTeacher(teacher); setDialogMode('form') }}><Edit2 className='h-4 w-4' /></Button>
                <Button size='sm' variant='outline' onClick={() => handleDelete(teacher.id)}><Trash2 className='h-4 w-4' /></Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}