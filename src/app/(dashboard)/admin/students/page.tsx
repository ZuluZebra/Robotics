'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudentForm } from '@/components/admin/student-form'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Student } from '@/types/models'
import { Plus, Edit2, Trash2, FileUp } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('last_name, first_name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [supabase])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Student deleted successfully!')
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    setSelectedStudent(null)
    fetchStudents()
  }

  const filteredStudents = students.filter(
    (s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-2">Manage students in the system</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/students/import">
            <Button variant="outline">
              <FileUp className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
          </Link>
          <Button
            onClick={() => {
              setSelectedStudent(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-96">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? 'Edit Student' : 'Create Student'}
            </DialogTitle>
          </DialogHeader>
          <StudentForm
            student={selectedStudent || undefined}
            onSuccess={handleSuccess}
            onCancel={() => {
              setShowForm(false)
              setSelectedStudent(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            {students.length} student{students.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            placeholder="Search by name or student number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
          />
          <DataTable
            columns={[
              {
                header: 'Name',
                accessor: (student: Student) => `${student.first_name} ${student.last_name}`,
              },
              { header: 'Student #', accessor: 'student_number' },
              { header: 'Grade', accessor: 'grade' },
              {
                header: 'Parent',
                accessor: (student: Student) => student.parent_name || '—',
              },
              {
                header: 'Parent Email',
                accessor: (student: Student) => student.parent_email || '—',
              },
            ]}
            data={filteredStudents}
            loading={loading}
            actions={(student) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStudent(student)
                    setShowForm(true)
                  }}
                  aria-label="Edit student"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(student.id)}
                  aria-label="Delete student"
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
