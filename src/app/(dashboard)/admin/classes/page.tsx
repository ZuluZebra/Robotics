'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClassForm } from '@/components/admin/class-form'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Class, School } from '@/types/models'
import { Plus, Edit2, Trash2, FileDown } from 'lucide-react'
import { formatSchedule, formatTime } from '@/lib/utils'
import { generateClassesPDF, SchoolWithClasses } from '@/lib/pdf/classes-export'

export const dynamic = 'force-dynamic'

export default function ClassesPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<(Class & { teachers?: string[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const supabase = createClient()

  // Fetch schools
  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      const schoolsData = data || []
      setSchools(schoolsData)

      // Auto-select first school
      if (schoolsData.length > 0 && !selectedSchool) {
        setSelectedSchool(schoolsData[0].id)
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
      toast.error('Failed to load schools')
    }
  }

  // Fetch classes for selected school
  const fetchClasses = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name')

      if (error) throw error

      // Fetch teachers for each class
      const classesWithTeachers = await Promise.all(
        (data || []).map(async (schoolClass: Class) => {
          const { data: teacherData, error: teacherError } = await supabase
            .from('teacher_classes')
            .select('teacher_id, user_profiles(full_name)')
            .eq('class_id', schoolClass.id)

          if (teacherError) {
            console.error('Error fetching teachers:', teacherError)
            return { ...schoolClass, teachers: [] }
          }

          const teacherNames = teacherData
            ?.map((tc: any) => tc.user_profiles?.full_name)
            .filter(Boolean) || []

          return { ...schoolClass, teachers: teacherNames }
        })
      )

      setClasses(classesWithTeachers)
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  // Fetch schools on mount
  useEffect(() => {
    fetchSchools()
  }, [supabase])

  // Fetch classes when selected school changes
  useEffect(() => {
    if (selectedSchool) {
      setLoading(true)
      fetchClasses(selectedSchool)
    }
  }, [selectedSchool])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Class deleted successfully!')
      if (selectedSchool) {
        fetchClasses(selectedSchool)
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      toast.error('Failed to delete class')
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    setSelectedClass(null)
    if (selectedSchool) {
      fetchClasses(selectedSchool)
    }
  }

  const fetchAllSchoolsWithClasses = async (): Promise<SchoolWithClasses[]> => {
    try {
      // Fetch all active schools
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (schoolsError) throw schoolsError
      if (!schoolsData || schoolsData.length === 0) {
        throw new Error('No schools found')
      }

      // For each school, fetch classes and enrich with teachers and student counts
      const schoolsWithClasses = await Promise.all(
        schoolsData.map(async (school: School) => {
          // Fetch classes for this school
          const { data: classesData, error: classesError } = await supabase
            .from('classes')
            .select('*')
            .eq('school_id', school.id)
            .order('name')

          if (classesError) throw classesError

          // For each class, fetch teachers and student count in parallel
          const classesWithDetails = await Promise.all(
            (classesData || []).map(async (cls: Class) => {
              // Fetch teachers
              const { data: teacherData } = await supabase
                .from('teacher_classes')
                .select('teacher_id, user_profiles(full_name)')
                .eq('class_id', cls.id)

              const teachers = (teacherData || [])
                .map((tc: any) => tc.user_profiles?.full_name)
                .filter(Boolean)

              // Fetch student count
              const { count: studentCount } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', cls.id)

              return {
                ...cls,
                teachers,
                studentCount: studentCount || 0,
              }
            })
          )

          return {
            ...school,
            classes: classesWithDetails,
          }
        })
      )

      return schoolsWithClasses
    } catch (error) {
      console.error('Error fetching schools with classes:', error)
      throw error
    }
  }

  const handleExportToPDF = async () => {
    setExporting(true)
    const toastId = toast.loading('Generating PDF...')

    try {
      const schoolsData = await fetchAllSchoolsWithClasses()
      generateClassesPDF(schoolsData, 'classes-report.pdf')
      toast.dismiss(toastId)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.dismiss(toastId)
      toast.error(
        error instanceof Error ? error.message : 'Failed to export PDF'
      )
    } finally {
      setExporting(false)
    }
  }

  const selectedSchoolData = schools.find((s) => s.id === selectedSchool)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600 mt-2">Manage classes in the system</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportToPDF}
            disabled={exporting}
            variant="outline"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export to PDF
          </Button>
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
      </div>

      {/* School Selector */}
      {schools.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Select School</h2>
          <div className="flex gap-2 flex-wrap">
            {schools.map((school) => (
              <Button
                key={school.id}
                variant={selectedSchool === school.id ? 'default' : 'outline'}
                onClick={() => setSelectedSchool(school.id)}
                className="min-w-[120px]"
              >
                {school.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClass ? 'Edit Class' : 'Create Class'}
            </DialogTitle>
            <DialogDescription>
              {selectedClass ? 'Update class information and assignments' : 'Add a new class to the selected school'}
            </DialogDescription>
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
      {selectedSchoolData && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedSchoolData.name}</CardTitle>
            <CardDescription>
              {classes.length} class{classes.length !== 1 ? 'es' : ''}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Grade', accessor: 'grade' },
              {
                header: 'Teachers',
                accessor: (schoolClass: any) =>
                  schoolClass.teachers && schoolClass.teachers.length > 0
                    ? schoolClass.teachers.join(', ')
                    : '—',
              },
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
      )}
    </div>
  )
}
