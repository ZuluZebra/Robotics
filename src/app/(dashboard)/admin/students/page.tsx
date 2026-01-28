'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudentForm } from '@/components/admin/student-form'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Student, Class, School } from '@/types/models'
import { Plus, Edit2, Trash2, FileUp, Eye, Share2, Copy, X } from 'lucide-react'
import Link from 'next/link'
import { generateParentAccessToken } from '@/app/actions/parent-portal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatSchedule, formatTime } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 50

interface StudentWithDetails extends Student {
  school_name?: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>('__all__')
  const [selectedGrade, setSelectedGrade] = useState<string>('__all__')
  const supabase = createClient()

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('*, schools(name)')

      // Apply filters conditionally
      if (selectedSchool && selectedSchool !== '__all__') {
        query = query.eq('school_id', selectedSchool)
      }
      if (selectedGrade && selectedGrade !== '__all__') {
        query = query.eq('grade', selectedGrade)
      }

      const { data, error } = await query
        .order('last_name, first_name')
        .range(0, ITEMS_PER_PAGE - 1)

      if (error) throw error

      const studentsWithDetails = (data || []).map((student: any) => ({
        ...student,
        school_name: student.schools?.name || 'Unknown',
      }))

      setStudents(studentsWithDetails)
      setHasMore((data?.length || 0) >= ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreStudents = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      let query = supabase
        .from('students')
        .select('*, schools(name)')

      // Apply filters conditionally
      if (selectedSchool && selectedSchool !== '__all__') {
        query = query.eq('school_id', selectedSchool)
      }
      if (selectedGrade && selectedGrade !== '__all__') {
        query = query.eq('grade', selectedGrade)
      }

      const { data, error } = await query
        .order('last_name, first_name')
        .range(students.length, students.length + ITEMS_PER_PAGE - 1)

      if (error) throw error
      if (data) {
        const studentsWithDetails = data.map((student: any) => ({
          ...student,
          school_name: student.schools?.name || 'Unknown',
        }))
        setStudents((prev) => [...prev, ...studentsWithDetails])
        setHasMore(data.length >= ITEMS_PER_PAGE)
      }
    } catch (error) {
      console.error('Error loading more students:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [supabase])

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
    setLoading(true)
    fetchStudents()
  }, [selectedSchool, selectedGrade])

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

  const handleGenerateShareLink = async (student: Student) => {
    setGeneratingLink(true)
    setSelectedStudent(student)

    const result = await generateParentAccessToken(student.id)

    if (result.success && result.token) {
      const link = `${window.location.origin}/parent/${result.token}`
      setShareLink(link)
      setShowShareModal(true)
      toast.success(result.isNew ? 'New link created' : 'Retrieved existing link')
    } else {
      toast.error(result.error || 'Failed to generate link')
    }

    setGeneratingLink(false)
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
        <DialogContent className="max-w-2xl">
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

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl">{selectedStudent.first_name} {selectedStudent.last_name}</CardTitle>
                  <CardDescription className="text-blue-100">Student ID: {selectedStudent.student_number}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Student Information</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Grade</p>
                          <p className="text-base font-medium">{selectedStudent.grade}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Student Number</p>
                          <p className="text-base font-medium">{selectedStudent.student_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date of Birth</p>
                          <p className="text-base font-medium">
                            {selectedStudent.date_of_birth
                              ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Parent Information</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Parent Name</p>
                          <p className="text-base font-medium">{selectedStudent.parent_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Parent Email</p>
                          <p className="text-base font-medium text-blue-600">{selectedStudent.parent_email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Parent Phone</p>
                          <p className="text-base font-medium">{selectedStudent.parent_phone || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedClass && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold text-gray-900 mb-4">Class Information</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600">Class Name</p>
                          <p className="text-base font-medium">{selectedClass.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Schedule</p>
                          <p className="text-base font-medium">{formatSchedule(selectedClass.schedule_days)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="text-base font-medium">
                            {selectedClass.start_time && selectedClass.end_time
                              ? `${formatTime(selectedClass.start_time)} - ${formatTime(selectedClass.end_time)}`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Room</p>
                          <p className="text-base font-medium">{selectedClass.room_number || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!selectedClass && selectedStudent.class_id && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-gray-600">Class assigned but information could not be loaded</p>
                    </div>
                  )}
                  {selectedStudent.medical_notes && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold text-gray-900 mb-2">Medical Notes</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedStudent.medical_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Modal Dialog */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Student Portal with Parent</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this link with the parent of{' '}
                <span className="font-semibold">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </span>
                .
              </p>

              <div className="bg-gray-50 p-4 rounded-md border">
                <Label className="text-xs text-gray-600 mb-2 block">Parent Portal Link</Label>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="font-mono text-sm" />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink)
                      toast.success('Link copied!')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This link never expires and allows parents to edit
                  contact information, emergency contacts, medical notes, and date of birth.
                </p>
              </div>
            </div>
          )}
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

          <div className="flex gap-4">
            {/* School Filter */}
            <div className="flex-1">
              <Label htmlFor="school-filter" className="text-sm font-medium mb-2 block">
                School
              </Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger id="school-filter">
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Filter */}
            <div className="flex-1">
              <Label htmlFor="grade-filter" className="text-sm font-medium mb-2 block">
                Grade
              </Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="grade-filter">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Grades</SelectItem>
                  {['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {(selectedSchool !== '__all__' || selectedGrade !== '__all__') && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSchool('__all__')
                    setSelectedGrade('__all__')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          <DataTable
            columns={[
              {
                header: 'Name',
                accessor: (student: StudentWithDetails) => `${student.first_name} ${student.last_name}`,
              },
              { header: 'Student #', accessor: 'student_number' },
              { header: 'Grade', accessor: 'grade' },
              {
                header: 'School',
                accessor: (student: StudentWithDetails) => student.school_name || '—',
              },
              {
                header: 'Parent',
                accessor: (student: StudentWithDetails) => student.parent_name || '—',
              },
              {
                header: 'Parent Email',
                accessor: (student: StudentWithDetails) => student.parent_email || '—',
              },
            ]}
            data={filteredStudents}
            loading={loading}
            actions={(student) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setSelectedStudent(student)
                    setSelectedClass(null)
                    // Fetch class info if student has a class assigned
                    if (student.class_id) {
                      try {
                        const { data, error } = await supabase
                          .from('classes')
                          .select('*')
                          .eq('id', student.class_id)
                          .single()

                        if (!error && data) {
                          setSelectedClass(data)
                        }
                      } catch (err) {
                        console.error('Error fetching class:', err)
                      }
                    }
                    setShowDetails(true)
                  }}
                  aria-label="View student details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateShareLink(student)}
                  disabled={generatingLink}
                  aria-label="Share with parent"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
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
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={loadMoreStudents}
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? 'Loading...' : `Load More (${students.length} loaded)`}
              </Button>
            </div>
          )}
          {!hasMore && students.length > 0 && (
            <div className="flex justify-center pt-4 text-sm text-gray-500">
              All {students.length} students loaded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
