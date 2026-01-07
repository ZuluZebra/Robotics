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
type UserRole = 'admin' | 'teacher'

export default function UsersPage() {
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [teacherClassCounts, setTeacherClassCounts] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const supabase = createClient()

  const fetchUsers = async (role: UserRole) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])

      // Only fetch class counts for teachers
      if (role === 'teacher' && data && data.length > 0) {
        const counts: { [key: string]: number } = {}
        for (const user of data) {
          const { data: classData } = await supabase
            .from('teacher_classes')
            .select('id', { count: 'exact' })
            .eq('teacher_id', user.id)
          counts[user.id] = classData?.length || 0
        }
        setTeacherClassCounts(counts)
      } else {
        setTeacherClassCounts({})
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(`Failed to load ${role}s`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchUsers(userRole)
  }, [userRole, supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id)
      if (error) throw error
      toast.success(`${userRole === 'admin' ? 'Admin' : 'Teacher'} deleted!`)
      fetchUsers(userRole)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to delete')
    }
  }

  const handleSuccess = () => {
    setDialogMode(null)
    setSelectedUser(null)
    fetchUsers(userRole)
  }

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>User Management</h1>
          <p className='text-gray-600 mt-2'>Manage admins and teachers</p>
        </div>
        <Button onClick={() => { setSelectedUser(null); setDialogMode('form') }}>
          <Plus className='h-4 w-4 mr-2' /> Add {userRole === 'admin' ? 'Admin' : 'Teacher'}
        </Button>
      </div>

      {/* Role Tabs */}
      <div className='flex gap-2'>
        <Button
          variant={userRole === 'admin' ? 'default' : 'outline'}
          onClick={() => setUserRole('admin')}
        >
          Admins
        </Button>
        <Button
          variant={userRole === 'teacher' ? 'default' : 'outline'}
          onClick={() => setUserRole('teacher')}
        >
          Teachers
        </Button>
      </div>

      <Dialog open={dialogMode === 'form'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit' : 'Create'} {userRole === 'admin' ? 'Admin' : 'Teacher'}</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? `Update ${userRole} information`
                : `Add a new ${userRole} to the system`
              }
            </DialogDescription>
          </DialogHeader>
          <TeacherForm
            teacher={selectedUser || undefined}
            userRole={userRole}
            onSuccess={handleSuccess}
            onCancel={() => { setDialogMode(null); setSelectedUser(null) }}
          />
        </DialogContent>
      </Dialog>

      {userRole === 'teacher' && (
        <Dialog open={dialogMode === 'assignments'} onOpenChange={(open) => !open && setDialogMode(null)}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>Manage Assignments</DialogTitle>
              <DialogDescription>Select which classes this teacher is responsible for</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <TeacherAssignments
                teacherId={selectedUser.id}
                onSuccess={handleSuccess}
                onCancel={() => { setDialogMode(null); setSelectedUser(null) }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All {userRole === 'admin' ? 'Admins' : 'Teachers'}</CardTitle>
          <CardDescription>
            {users.length} {userRole}{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Name', accessor: 'full_name' },
              { header: 'Email', accessor: 'email' },
              { header: 'Phone', accessor: (u: UserProfile) => u.phone || '—' },
              ...(userRole === 'teacher'
                ? [{ header: 'Classes', accessor: (u: UserProfile) => teacherClassCounts[u.id] || 0 }]
                : []),
            ]}
            data={users}
            loading={loading}
            actions={(user) => (
              <div className='flex gap-2'>
                {userRole === 'teacher' && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => { setSelectedUser(user); setDialogMode('assignments') }}
                    aria-label='Manage class assignments'
                  >
                    <GraduationCap className='h-4 w-4' />
                  </Button>
                )}
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => { setSelectedUser(user); setDialogMode('form') }}
                  aria-label={`Edit ${user.full_name}`}
                >
                  <Edit2 className='h-4 w-4' />
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleDelete(user.id)}
                  aria-label={`Delete ${user.full_name}`}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}