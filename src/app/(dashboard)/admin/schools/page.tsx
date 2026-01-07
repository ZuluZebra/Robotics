'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SchoolForm } from '@/components/admin/school-form'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { School } from '@/types/models'
import { Plus, Edit2, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const supabase = createClient()

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name')

      if (error) throw error
      setSchools(data || [])
    } catch (error) {
      console.error('Error fetching schools:', error)
      toast.error('Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchools()
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('School deleted successfully!')
      fetchSchools()
    } catch (error) {
      console.error('Error deleting school:', error)
      toast.error('Failed to delete school')
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    setSelectedSchool(null)
    fetchSchools()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-600 mt-2">Manage schools in the system</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSchool(null)
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add School
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSchool ? 'Edit School' : 'Create School'}
            </DialogTitle>
          </DialogHeader>
          <SchoolForm
            school={selectedSchool || undefined}
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowForm(false)
              setSelectedSchool(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>
            {schools.length} school{schools.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Address', accessor: 'address' },
              { header: 'Phone', accessor: 'phone' },
              { header: 'Email', accessor: 'email' },
              {
                header: 'Principal',
                accessor: (school: School) => school.principal_name || '—',
              },
            ]}
            data={schools}
            loading={loading}
            actions={(school) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSchool(school)
                    setShowForm(true)
                  }}
                  aria-label="Edit school"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(school.id)}
                  aria-label="Delete school"
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
