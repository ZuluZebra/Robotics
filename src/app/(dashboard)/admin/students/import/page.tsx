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
    const template = `first_name,last_name,grade,student_number,parent_name,parent_email,parent_phone,school_id,class_id,start_time,end_time
John,Doe,5,,Jane Doe,jane@example.com,555-0001,Springfield Elementary,Grade 5 Robotics,14:00,15:30
Jane,Smith,5,,John Smith,john@example.com,555-0002,Springfield Elementary,Grade 5 Robotics,14:00,15:30`

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
    const toastId = toast.loading('Reading file...')

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      handleXlsxUpload(file, toastId)
    } else if (fileName.endsWith('.csv')) {
      handleCsvUpload(file, toastId)
    } else {
      toast.dismiss(toastId)
      toast.error('Please upload a CSV or Excel file')
    }
  }

  const handleCsvUpload = (file: File, toastId: string | number) => {
    console.log('Parsing CSV file...')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('CSV parsed, rows:', results.data.length)
        console.log('First row keys:', Object.keys(results.data[0] || {}))
        console.log('First row:', results.data[0])
        toast.dismiss(toastId)
        await importStudents(results.data as any[])
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        toast.dismiss(toastId)
        toast.error('Failed to parse CSV file')
      },
    })
  }

  const handleXlsxUpload = (file: File, toastId: string | number) => {
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
        toast.dismiss(toastId)
        await importStudents(rows as any[])
      } catch (error) {
        console.error('Excel parse error:', error)
        toast.dismiss(toastId)
        toast.error('Failed to parse Excel file')
      }
    }
    reader.onerror = () => {
      console.error('File read error')
      toast.dismiss(toastId)
      toast.error('Failed to read file')
    }
    reader.readAsBinaryString(file)
  }

  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const parseDayFromClassName = (className: string): string[] => {
    const DAY_MAPPINGS: Record<string, string[]> = {
      'Monday': ['monday', 'maandag', 'lunes', 'mon'],
      'Tuesday': ['tuesday', 'dinsdag', 'martes', 'tue'],
      'Wednesday': ['wednesday', 'woensdag', 'miércoles', 'wed'],
      'Thursday': ['thursday', 'donderdag', 'jueves', 'thu'],
      'Friday': ['friday', 'vrydag', 'vrijdag', 'viernes', 'fri'],
      'Saturday': ['saturday', 'saterdag', 'zaterdag', 'sábado', 'sat'],
      'Sunday': ['sunday', 'sondag', 'domingo', 'sun']
    }

    const lowerName = className.toLowerCase().trim()

    for (const [englishDay, variations] of Object.entries(DAY_MAPPINGS)) {
      for (const variant of variations) {
        if (lowerName.includes(variant)) {
          return [englishDay]
        }
      }
    }

    // Default to empty array if no day found
    return []
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

    const hasStudentNameColumn = normalizedColumns.has('student name') ||
                                  normalizedColumns.has('student name & surname') ||
                                  normalizedColumns.has('student_name')
    const hasFirstNameColumn = normalizedColumns.has('first_name')
    const hasNewFormat = (normalizedColumns.has('email address') || normalizedColumns.has('student name & surname')) &&
                         (normalizedColumns.has('parent/guardian name') || normalizedColumns.has('parent/guardian name & surname'))

    console.log('Column detection:', { hasStudentNameColumn, hasFirstNameColumn, hasNewFormat, normalizedColumns: Array.from(normalizedColumns) })

    if (!hasFirstNameColumn && !hasStudentNameColumn && !hasNewFormat) {
      console.error('No student name column found. Available columns:', columnNames)
      toast.error(`Could not find required columns. Found: ${columnNames.join(', ')}`)
      return
    }

    console.log('Validation passed, starting import...')
    setLoading(true)
    const toastId = toast.loading('Importing students...')
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

      // Create school name → id map
      const schoolMap = new Map<string, string>()
      schoolsData?.forEach(school => {
        schoolMap.set(school.name.toLowerCase().trim(), school.id)
      })

      // Fetch all classes for lookup
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, school_id, grade, start_time, end_time')
        .eq('is_active', true)

      // Create class name → class map (keyed by name_schoolId for disambiguation)
      const classMap = new Map<string, any>()
      classesData?.forEach(cls => {
        const key = `${cls.name.toLowerCase().trim()}_${cls.school_id}`
        classMap.set(key, cls)
      })

      // Track classes created during this import to avoid duplicates
      const autoCreatedClasses = new Map<string, string>()

      // Function to get or create a class
      const getOrCreateClass = async (
        className: string,
        schoolId: string,
        grade: string,
        startTime: string,
        endTime: string
      ): Promise<string | null> => {
        // Check if already created in this import session
        const cacheKey = `${className.toLowerCase().trim()}_${schoolId}_${grade}_${startTime}_${endTime}`
        if (autoCreatedClasses.has(cacheKey)) {
          return autoCreatedClasses.get(cacheKey)!
        }

        // Check if class exists in database with exact match
        const existingKey = `${className.toLowerCase().trim()}_${schoolId}`
        let existingClass = classMap.get(existingKey)

        // If exists, verify grade and time match
        if (existingClass &&
            existingClass.grade.toLowerCase().trim() === grade.toLowerCase().trim() &&
            existingClass.start_time === startTime &&
            existingClass.end_time === endTime) {
          return existingClass.id
        }

        // Create new class
        try {
          const scheduleDays = parseDayFromClassName(className)

          const { data: newClass, error } = await supabase
            .from('classes')
            .insert([{
              school_id: schoolId,
              name: className,
              grade: grade,
              start_time: startTime || null,
              end_time: endTime || null,
              schedule_days: scheduleDays.length > 0 ? scheduleDays : null,
              is_active: true
            }])
            .select('id')

          if (error) {
            console.error('Failed to create class:', error)
            return null
          }

          const newClassId = newClass[0].id

          // Cache for this import session
          autoCreatedClasses.set(cacheKey, newClassId)

          // Also add to classMap for subsequent lookups
          classMap.set(existingKey, {
            id: newClassId,
            name: className,
            school_id: schoolId,
            grade: grade,
            start_time: startTime,
            end_time: endTime
          })

          console.log(`Auto-created class "${className}" for grade ${grade} at ${startTime}-${endTime}`)

          return newClassId
        } catch (err) {
          console.error('Error creating class:', err)
          return null
        }
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
          let schoolId = ''
          let csvClassId = ''
          let startTime = ''
          let endTime = ''

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

          // Handle new format (Email Address, Student Name & Surname, Student Grade and Class, Parent/Guardian Name & Surname, Parent/Guardian Contact Number)
          if (hasNewFormat) {
            const studentName = getRowValue(row, 'Student Name & Surname', 'Student Name', 'student name')
            const nameParts = studentName.trim().split(/\s+/)
            if (nameParts.length < 2) {
              throw new Error(`Invalid student name format: "${studentName}" (expected "First Last")`)
            }
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
            grade = (getRowValue(row, 'Student Grade and Class', 'What grade is your child in 2025?', 'Grade', 'grade') || '').toString().trim()
            parentEmail = getRowValue(row, 'Email Address', 'email address')
            parentName = getRowValue(row, 'Parent/Guardian Name & Surname', 'Parent/Guardian Name', 'parent/guardian name', 'Parent Name')
            parentPhone = getRowValue(row, 'Parent/Guardian Contact Number', 'Parent/Guardian Contact Nr', 'parent/guardian contact nr', 'Parent Phone')
          } else if (hasStudentNameColumn && !hasFirstNameColumn) {
            // Old Student Name format
            const studentName = getRowValue(row, 'Student Name & Surname', 'Student Name', 'student name')
            const nameParts = studentName.trim().split(/\s+/)
            if (nameParts.length < 2) {
              throw new Error(`Invalid student name format: "${studentName}" (expected "First Last")`)
            }
            firstName = nameParts[0]
            lastName = nameParts.slice(1).join(' ')
            grade = (getRowValue(row, 'Student Grade and Class', 'Grade', 'grade') || '').toString()
            parentName = getRowValue(row, 'Parent/Guardian Name & Surname', 'Parent Name', 'parent_name')
            parentEmail = getRowValue(row, 'Email Address', 'Parent Email', 'parent_email')
            parentPhone = getRowValue(row, 'Parent/Guardian Contact Number', 'Parent Phone', 'parent_phone')
          } else {
            // Standard CSV format
            firstName = getRowValue(row, 'first_name')
            lastName = getRowValue(row, 'last_name')
            grade = getRowValue(row, 'grade')
            parentName = getRowValue(row, 'parent_name')
            parentEmail = getRowValue(row, 'parent_email')
            parentPhone = getRowValue(row, 'parent_phone')
            schoolId = getRowValue(row, 'school_id')
            csvClassId = getRowValue(row, 'class_id')
            startTime = getRowValue(row, 'start_time')
            endTime = getRowValue(row, 'end_time')
          }

          if (!firstName || !lastName) {
            throw new Error('Missing student name')
          }

          // Determine which school to use
          let finalSchoolId = defaultSchool.id
          if (schoolId) {
            if (isUUID(schoolId)) {
              // It's already a UUID
              finalSchoolId = schoolId
            } else {
              // It's a school name - look it up
              const lookupId = schoolMap.get(schoolId.toLowerCase().trim())
              if (lookupId) {
                finalSchoolId = lookupId
              } else {
                console.warn(`School "${schoolId}" not found, using default school "${defaultSchool.name}"`)
              }
            }
          }

          // Find class based on provided class_id or grade
          let classId = selectedClass || null

          if (!classId && csvClassId) {
            if (isUUID(csvClassId)) {
              // It's already a UUID
              classId = csvClassId
            } else {
              // It's a class name - look it up with school context
              const key = `${csvClassId.toLowerCase().trim()}_${finalSchoolId}`
              const matchedClass = classMap.get(key)
              if (matchedClass) {
                classId = matchedClass.id
              } else {
                // Class doesn't exist - auto-create it if we have enough info
                if (grade && startTime && endTime) {
                  console.log(`Class "${csvClassId}" not found - auto-creating...`)
                  classId = await getOrCreateClass(csvClassId, finalSchoolId, grade, startTime, endTime)
                } else {
                  console.warn(`Class "${csvClassId}" not found and insufficient info to create (need grade, start_time, end_time)`)
                }
              }
            }
          }

          // If still no class, try matching by grade + time
          if (!classId && grade) {
            const gradeClasses = classesData?.filter(c =>
              c.school_id === finalSchoolId &&
              c.grade.toLowerCase().trim() === grade.toLowerCase().trim()
            )

            if (gradeClasses && gradeClasses.length > 0) {
              let matchingClass
              if (startTime && endTime) {
                // Match by grade + time
                matchingClass = gradeClasses.find(c =>
                  c.start_time === startTime && c.end_time === endTime
                )
              } else if (gradeClasses.length === 1) {
                // Only one class for this grade, use it
                matchingClass = gradeClasses[0]
              }

              if (matchingClass) {
                classId = matchingClass.id
              } else if (startTime && endTime) {
                console.warn(`No class found for grade "${grade}" at ${startTime}-${endTime} in school "${finalSchoolId}"`)
              }
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
                school_id: finalSchoolId,
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

      console.log('Import complete:', { successCount, failed: errors.length, autoCreated: autoCreatedClasses.size })

      // Dismiss loading toast
      toast.dismiss(toastId)

      // Show summary with auto-created classes count
      const autoCreatedCount = autoCreatedClasses.size
      if (autoCreatedCount > 0) {
        toast.info(`Auto-created ${autoCreatedCount} new class${autoCreatedCount !== 1 ? 'es' : ''}`)
      }

      if (errors.length === 0) {
        toast.success(`Successfully imported ${successCount} students!`)
      } else {
        toast.warning(
          `Imported ${successCount} students with ${errors.length} errors`
        )
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.dismiss(toastId)
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
              Supports: CSV files (comma or tab-separated) or Excel files (.xlsx, .xls)
            </p>
            <p className="text-sm text-gray-500 mt-2 font-semibold">
              Supported formats:
            </p>
            <p className="text-sm text-gray-500">
              • New format: Email Address, Student Name & Surname, Student Grade and Class, Parent/Guardian Name & Surname, Parent/Guardian Contact Number
            </p>
            <p className="text-sm text-gray-500">
              • CSV format: first_name, last_name, grade, student_number, parent_name, parent_email, parent_phone, school_id, class_id, start_time, end_time
            </p>
            <p className="text-sm text-gray-500">
              • school_id and class_id can be either the name (e.g., "Springfield Elementary", "Grade 5 Robotics") or the UUID. Names will be automatically looked up.
            </p>
            <p className="text-sm text-gray-500">
              • Include start_time and end_time (HH:MM format) to help match students to the correct class time.
            </p>
            <p className="text-sm text-gray-500">
              • student_number is optional and can be left empty.
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
