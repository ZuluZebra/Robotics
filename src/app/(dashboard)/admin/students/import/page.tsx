'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useEffect } from 'react'
import { Class } from '@/types/models'

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
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (data) setClasses(data)
  }

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

    const fileName = file.name.toLowerCase()
    console.log('File selected:', fileName)
    toast.loading('Reading file...')

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      handleXlsxUpload(file)
    } else if (fileName.endsWith('.csv')) {
      handleCsvUpload(file)
    } else {
      toast.error('Please upload a CSV or Excel file')
    }
  }

  const handleCsvUpload = (file: File) => {
    console.log('Parsing CSV file...')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('CSV parsed, rows:', results.data.length)
        await importStudents(results.data as any[])
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        toast.error('Failed to parse CSV file')
      },
    })
  }

  const handleXlsxUpload = (file: File) => {
    console.log('Reading Excel file...')
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        console.log('File read, parsing workbook...')
        const workbook = XLSX.read(data, { type: 'binary' })
        console.log('Sheets:', workbook.SheetNames)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(worksheet)
        console.log('Excel parsed, rows:', rows.length)
        await importStudents(rows as any[])
      } catch (error) {
        console.error('Excel parse error:', error)
        toast.error('Failed to parse Excel file')
      }
    }
    reader.onerror = () => {
      console.error('File read error')
      toast.error('Failed to read file')
    }
    reader.readAsBinaryString(file)
  }

  const importStudents = async (data: any[]) => {
    console.log('Starting import with', data.length, 'rows')

    if (data.length === 0) {
      toast.error('No data found in file')
      return
    }

    // Detect column format
    const firstRow = data[0]
    const columnNames = Object.keys(firstRow)
    console.log('First row columns:', columnNames)

    // Normalize column names for matching (trim and lowercase)
    const normalizedColumns = new Set(
      columnNames.map(col => col.trim().toLowerCase())
    )

    const hasStudentNameColumn = normalizedColumns.has('student name') || normalizedColumns.has('student_name')
    const hasFirstNameColumn = normalizedColumns.has('first_name')
    const hasNewFormat = normalizedColumns.has('email address') && normalizedColumns.has('parent/guardian name')

    console.log('Column detection:', { hasStudentNameColumn, hasFirstNameColumn, hasNewFormat, normalizedColumns: Array.from(normalizedColumns) })

    if (!hasFirstNameColumn && !hasStudentNameColumn && !hasNewFormat) {
      console.error('No student name column found. Available columns:', columnNames)
      toast.error(`Could not find required columns. Found: ${columnNames.join(', ')}`)
      return
    }

    console.log('Validation passed, starting import...')
    setLoading(true)
    toast.loading('Importing students...')
    const errors: ImportResult['errors'] = []
    let successCount = 0

    try {
      // Get all schools for lookup
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name')
        .eq('is_active', true)

      const defaultSchool = schoolsData?.[0]
      if (!defaultSchool) {
        throw new Error('No active schools found')
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]

        try {
          let firstName = ''
          let lastName = ''
          let grade = ''
          let parentEmail = ''
          let parentName = ''
          let parentPhone = ''

          // Find actual column names (case-insensitive)
          const getRowValue = (row: any, ...possibleNames: string[]) => {
            for (const name of possibleNames) {
              // Try exact match first
              if (name in row) return row[name] || ''
              // Try case-insensitive match
              const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase())
              if (key) return row[key] || ''
            }
            return ''
          }

          // Handle new format (Email Address, Student Name, Grade, Parent/Guardian Name, Parent/Guardian Contact Nr)
          if (hasNewFormat) {
            const studentName = getRowValue(row, 'Student Name', 'student name')
            const nameParts = studentName.trim().split(/\s+/)
            if (nameParts.length < 2) {
              throw new Error(`Invalid student name format: "${studentName}" (expected "First Last")`)
            }
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
            grade = (getRowValue(row, 'What grade is your child in 2025?', 'Grade', 'grade') || '').toString().trim()
            parentEmail = getRowValue(row, 'Email Address', 'email address')
            parentName = getRowValue(row, 'Parent/Guardian Name', 'parent/guardian name', 'Parent Name')
            parentPhone = getRowValue(row, 'Parent/Guardian Contact Nr', 'parent/guardian contact nr', 'Parent Phone')
          } else if (hasStudentNameColumn && !hasFirstNameColumn) {
            // Old Student Name format
            const studentName = getRowValue(row, 'Student Name', 'student name')
            const nameParts = studentName.trim().split(/\s+/)
            if (nameParts.length < 2) {
              throw new Error(`Invalid student name format: "${studentName}" (expected "First Last")`)
            }
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
            grade = (getRowValue(row, 'Grade', 'grade') || '').toString()
            parentName = getRowValue(row, 'Parent Name', 'parent_name')
            parentEmail = getRowValue(row, 'Parent Email', 'parent_email')
            parentPhone = getRowValue(row, 'Parent Phone', 'parent_phone')
          } else {
            // Standard CSV format
            firstName = getRowValue(row, 'first_name')
            lastName = getRowValue(row, 'last_name')
            grade = getRowValue(row, 'grade')
            parentName = getRowValue(row, 'parent_name')
            parentEmail = getRowValue(row, 'parent_email')
            parentPhone = getRowValue(row, 'parent_phone')
          }

          if (!firstName || !lastName) {
            throw new Error('Missing student name')
          }

          // Find class based on grade
          let classId = selectedClass || null

          if (!classId && grade) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id, grade, name')
              .eq('is_active', true)
              .eq('school_id', defaultSchool.id)

            // Find matching class by grade
            const matchingClass = classData?.find(
              (c) => c.grade.toLowerCase().trim() === grade.toLowerCase().trim()
            )

            if (matchingClass) {
              classId = matchingClass.id
            } else {
              // If no exact match, log a warning but continue
              console.warn(`No class found for grade "${grade}"`)
            }
          }

          // Insert student
          const { data: studentData, error } = await supabase
            .from('students')
            .insert([
              {
                first_name: firstName,
                last_name: lastName,
                grade: grade || null,
                student_number: row.student_number || row['ID Number'] || null,
                parent_name: parentName || null,
                parent_email: parentEmail || null,
                parent_phone: parentPhone || null,
                emergency_contact: row.emergency_contact || null,
                emergency_phone: row.emergency_phone || null,
                medical_notes: row.Comment || row.medical_notes || null,
                school_id: defaultSchool.id,
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

      console.log('Import complete:', { successCount, failed: errors.length })

      if (errors.length === 0) {
        toast.success(`Successfully imported ${successCount} students!`)
      } else {
        toast.warning(
          `Imported ${successCount} students with ${errors.length} errors`
        )
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
          <CardTitle>Upload CSV or Excel File</CardTitle>
          <CardDescription>
            Import students from a CSV or Excel file. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={downloadTemplate} variant="outline">
              Download CSV Template
            </Button>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div>
              <Label htmlFor="class-select">Select Class (for Excel imports)</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Optional - select if importing Excel list" />
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

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <input
              key={fileKey}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-2">
              Supports: CSV files or Excel files (.xlsx, .xls)
            </p>
            <p className="text-sm text-gray-500 mt-2 font-semibold">
              Supported formats:
            </p>
            <p className="text-sm text-gray-500">
              • New format: Email Address, Student Name, What grade is your child in 2025?, Parent/Guardian Name, Parent/Guardian Contact Nr
            </p>
            <p className="text-sm text-gray-500">
              • CSV format: first_name, last_name, grade, student_number, parent_name, parent_email, parent_phone
            </p>
            <p className="text-sm text-gray-500">
              Students are automatically assigned to classes based on their grade.
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
