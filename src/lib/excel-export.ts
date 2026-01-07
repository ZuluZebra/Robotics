import * as XLSX from 'xlsx'

export function exportAttendanceRecords(
  records: Array<{
    attendance_date: string
    student_name: string
    class_name: string
    status: string
    absence_reason?: string
    comments?: string
  }>,
  filename: string
) {
  const data = records.map((r) => ({
    Date: r.attendance_date,
    'Student Name': r.student_name,
    Class: r.class_name,
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    'Absence Reason': r.absence_reason || '',
    Comments: r.comments || '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
  XLSX.writeFile(wb, filename)
}

export function exportClassSummaries(
  summaries: Array<{
    class_name: string
    attendance_percentage: number
    present_count: number
    absent_count: number
    total: number
  }>,
  filename: string
) {
  const data = summaries.map((s) => ({
    'Class Name': s.class_name,
    'Total Students': s.total,
    'Attendance %': s.attendance_percentage.toFixed(2) + '%',
    'Present Count': s.present_count,
    'Absent Count': s.absent_count,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Class Summaries')
  XLSX.writeFile(wb, filename)
}

export function exportCommissionReport(
  data: Array<{
    teacher_name: string
    class_name: string
    student_name: string
    total_absences: number
    first_absence_date?: string
    last_absence_date?: string
  }>,
  filename: string
) {
  const formatted = data.map((item) => ({
    Teacher: item.teacher_name,
    Class: item.class_name,
    Student: item.student_name,
    'Total Absences': item.total_absences,
    'First Absence': item.first_absence_date
      ? new Date(item.first_absence_date).toLocaleDateString()
      : '',
    'Last Absence': item.last_absence_date
      ? new Date(item.last_absence_date).toLocaleDateString()
      : '',
  }))

  const ws = XLSX.utils.json_to_sheet(formatted)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commission Report')
  XLSX.writeFile(wb, filename)
}
