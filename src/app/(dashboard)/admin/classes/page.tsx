'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClassForm } from '@/components/admin/class-form'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Class } from '@/types/models'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { formatSchedule, formatTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const supabase = createClient()

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Class deleted successfully!')
      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      toast.error('Failed to delete class')
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    setSelectedClass(null)
    fetchClasses()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-2">Manage classes in the system</p>
        </div>
        <Button
          onClick={() => {
            setSelectedClass(null)
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? 'Edit Class' : 'Create Class'}
            </DialogTitle>
          </DialogHeader>
          <ClassForm
            schoolClass={selectedClass || undefined}
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowForm(false)
              setSelectedClass(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {classes.length} class{classes.length !== 1 ? 'es' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Grade', accessor: 'grade' },
              {
                header: 'Schedule',
                accessor: (schoolClass: Class) =>
                  schoolClass.schedule_days ? formatSchedule(schoolClass.schedule_days) : '—',
              },
              {
                header: 'Time',
                accessor: (schoolClass: Class) =>
                  schoolClass.start_time && schoolClass.end_time
                    ? `${formatTime(schoolClass.start_time)} - ${formatTime(schoolClass.end_time)}`
                    : '—',
              },
              {
                header: 'Room',
                accessor: (schoolClass: Class) => schoolClass.room_number || '—',
              },
            ]}
            data={classes}
            loading={loading}
            actions={(schoolClass) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedClass(schoolClass)
                    setShowForm(true)
                  }}
                  aria-label="Edit class"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(schoolClass.id)}
                  aria-label="Delete class"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
