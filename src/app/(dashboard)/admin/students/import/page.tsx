'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

export default function ImportStudentsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const supabase = createClient()

  const downloadTemplate = () => {
    const template = `first_name,last_name,grade,student_number,parent_name,parent_email,parent_phone,school_id,class_id
John,Doe,5,S001,Jane Doe,jane@example.com,555-0001,SCHOOL_ID,CLASS_ID
Jane,Smith,5,S002,John Smith,john@example.com,555-0002,SCHOOL_ID,CLASS_ID`

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template))
    element.setAttribute('download', 'students_template.csv')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast.success('Template downloaded!')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        await importStudents(results.data as any[])
      },
      error: () => {
        toast.error('Failed to parse CSV file')
      },
    })
  }

  const importStudents = async (data: any[]) => {
    setLoading(true)
    const errors: ImportResult['errors'] = []
    let successCount = 0

    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]

        try {
          // Validate required fields
          if (!row.first_name || !row.last_name || !row.grade) {
            throw new Error('Missing required fields (first_name, last_name, grade)')
          }

          // Get school ID if school_name is provided
          let schoolId = row.school_id
          if (row.school_name && !schoolId) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('id')
              .eq('name', row.school_name)
              .single()

            if (!schoolData) {
              throw new Error(`School "${row.school_name}" not found`)
            }
            schoolId = schoolData.id
          }

          if (!schoolId) {
            throw new Error('school_id or school_name is required')
          }

          // Get class ID if class_name is provided
          let classId = row.class_id || null
          if (row.class_name && !classId) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id')
              .eq('name', row.class_name)
              .eq('school_id', schoolId)
              .single()

            if (classData) {
              classId = classData.id
            }
          }

          // Insert student
          const { data: studentData, error } = await supabase
            .from('students')
            .insert([
              {
                first_name: row.first_name,
                last_name: row.last_name,
                grade: row.grade,
                student_number: row.student_number || null,
                parent_name: row.parent_name || null,
                parent_email: row.parent_email || null,
                parent_phone: row.parent_phone || null,
                emergency_contact: row.emergency_contact || null,
                emergency_phone: row.emergency_phone || null,
                medical_notes: row.medical_notes || null,
                school_id: schoolId,
                class_id: classId,
              },
            ])
            .select()

          if (error) throw error

          // Create student account
          if (studentData && studentData[0]) {
            await supabase.from('student_accounts').insert([
              {
                student_id: studentData[0].id,
                current_balance: 0,
                days_overdue: 0,
              },
            ])
          }

          successCount++
        } catch (rowError) {
          errors.push({
            row: i + 2, // +2 because row 1 is header
            error: rowError instanceof Error ? rowError.message : 'Unknown error',
          })
        }
      }

      setResult({
        success: successCount,
        failed: errors.length,
        errors,
      })

      if (errors.length === 0) {
        toast.success(`Successfully imported ${successCount} students!`)
      } else {
        toast.warning(
          `Imported ${successCount} students with ${errors.length} errors`
        )
      }
    } finally {
      setLoading(false)
      setFileKey((prev) => prev + 1)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Import Students</h1>
        <p className="text-gray-600 mt-2">Import multiple students from a CSV file</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Import students from a CSV file. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={downloadTemplate} variant="outline">
            Download Template
          </Button>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <input
              key={fileKey}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-2">
              CSV should include columns: first_name, last_name, grade, student_number, parent_name,
              parent_email, parent_phone, school_id (or school_name), class_id (optional, or class_name)
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Import Complete</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Successfully imported {result.success} student{result.success !== 1 ? 's' : ''}
                      {result.failed > 0 && ` with ${result.failed} error${result.failed !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900">Errors Found</h3>
                      <ul className="text-sm text-yellow-800 mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                >
                  Import Another File
                </Button>
                <Link href="/admin/students">
                  <Button>View All Students</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
