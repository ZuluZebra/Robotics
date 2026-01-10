import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatTime, formatSchedule } from '@/lib/utils'
import { School, Class } from '@/types/models'

interface ClassWithDetails extends Class {
  teachers: string[]
  studentCount: number
}

export interface SchoolWithClasses extends School {
  classes: ClassWithDetails[]
}

export function generateClassesPDF(
  schools: SchoolWithClasses[],
  filename: string = 'classes-report.pdf'
) {
  if (!schools || schools.length === 0) {
    throw new Error('No schools to export')
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 15
  const marginTop = 15
  const marginRight = 15

  let isFirstPage = true

  schools.forEach((school) => {
    // Add new page for each school (except first)
    if (!isFirstPage) {
      doc.addPage()
    }
    isFirstPage = false

    // Reset Y position for new page
    let yPos = marginTop

    // Render school header with professional styling
    yPos = renderSchoolHeader(
      doc,
      school,
      marginLeft,
      yPos,
      pageWidth - marginLeft - marginRight
    )

    // Add spacing after header
    yPos += 8

    // Render summary statistics
    yPos = renderSummaryStats(
      doc,
      school.classes,
      marginLeft,
      yPos,
      pageWidth - marginLeft - marginRight
    )

    // Add spacing before table
    yPos += 8

    // Render classes table
    renderClassesTable(doc, school.classes, marginLeft, yPos, marginRight)
  })

  // Add page numbers and generation date
  addFooters(doc, pageWidth, marginLeft, marginRight)

  // Download PDF
  doc.save(filename)
}

function renderSchoolHeader(
  doc: jsPDF,
  school: SchoolWithClasses,
  x: number,
  y: number,
  width: number
): number {
  const primaryColor: [number, number, number] = [25, 103, 210] // Blue
  const lightBlue: [number, number, number] = [230, 240, 255] // Light blue background

  // Draw header background
  doc.setFillColor(...lightBlue)
  doc.rect(x - 2, y - 3, width + 4, 22, 'F')

  // School name (large, bold)
  doc.setFontSize(18)
  doc.setTextColor(...primaryColor)
  doc.setFont('', 'bold')
  doc.text(school.name, x, y)
  y += 8

  // Contact info (smaller, gray)
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.setFont('', 'normal')

  const contactInfo: string[] = []
  if (school.principal_name) {
    contactInfo.push(`Principal: ${school.principal_name}`)
  }
  if (school.address) {
    contactInfo.push(`Address: ${school.address}`)
  }
  if (school.phone) {
    contactInfo.push(`Phone: ${school.phone}`)
  }
  if (school.email) {
    contactInfo.push(`Email: ${school.email}`)
  }

  contactInfo.forEach((info) => {
    doc.text(info, x, y)
    y += 4
  })

  // Separator line
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.5)
  doc.line(x - 2, y + 2, x + width + 2, y + 2)
  y += 7

  return y
}

function renderSummaryStats(
  doc: jsPDF,
  classes: ClassWithDetails[],
  x: number,
  y: number,
  width: number
): number {
  if (!classes || classes.length === 0) {
    return y
  }

  // Calculate statistics
  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0)
  const gradeStats = new Map<string, number>()

  classes.forEach((cls) => {
    const grade = cls.grade || 'Unassigned'
    gradeStats.set(grade, (gradeStats.get(grade) || 0) + cls.studentCount)
  })

  // Summary background box
  const boxColor: [number, number, number] = [245, 248, 252] // Very light blue
  doc.setFillColor(...boxColor)
  doc.rect(x, y, width, 18, 'F')

  // Border
  doc.setDrawColor(200, 220, 240)
  doc.setLineWidth(0.3)
  doc.rect(x, y, width, 18)

  // Total students section
  doc.setFontSize(11)
  doc.setTextColor(25, 103, 210)
  doc.setFont('', 'bold')
  doc.text('Summary Statistics', x + 3, y + 6)

  // Total count
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.setFont('', 'normal')
  doc.text(`Total Students: ${totalStudents}`, x + 3, y + 12)

  // Grade breakdown
  let xOffset = x + 55
  const grades = Array.from(gradeStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 5) // Show first 5 grades

  grades.forEach((grade) => {
    if (xOffset > x + width - 30) {
      return // Don't overflow
    }
    doc.setFontSize(9)
    doc.text(`Grade ${grade[0]}: ${grade[1]}`, xOffset, y + 12)
    xOffset += 40
  })

  return y + 20
}

function renderClassesTable(
  doc: jsPDF,
  classes: ClassWithDetails[],
  marginLeft: number,
  startY: number,
  marginRight: number
) {
  if (!classes || classes.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text('No classes available', marginLeft, startY)
    return
  }

  // Prepare table data
  const tableData = classes.map((cls) => [
    cls.name || '—',
    cls.grade || '—',
    formatSchedule(cls.schedule_days || []) || '—',
    cls.start_time && cls.end_time ? `${formatTime(cls.start_time)} - ${formatTime(cls.end_time)}` : '—',
    cls.room_number || '—',
    cls.teachers.length > 0 ? cls.teachers.join(', ') : '—',
    cls.studentCount.toString(),
  ])

  autoTable(doc, {
    startY,
    head: [['Class Name', 'Grade', 'Schedule', 'Time', 'Room', 'Teachers', 'Students']],
    body: tableData,
    margin: { top: startY, left: marginLeft, right: marginRight, bottom: 15 },
    theme: 'grid',
    headStyles: {
      fillColor: [25, 103, 210], // Professional blue
      textColor: [255, 255, 255], // White
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
      valign: 'middle',
      cellPadding: 4,
      lineColor: [25, 103, 210],
      lineWidth: 0.5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Very light blue
    },
    columnStyles: {
      0: { cellWidth: 28 }, // Class Name
      1: { cellWidth: 12, halign: 'center' }, // Grade
      2: { cellWidth: 32, halign: 'center' }, // Schedule
      3: { cellWidth: 38, halign: 'center' }, // Time
      4: { cellWidth: 13, halign: 'center' }, // Room
      5: { cellWidth: 58 }, // Teachers
      6: { cellWidth: 13, halign: 'center' }, // Students
    },
    didDrawPage: () => {
      // Add subtle line between header and table
    },
  })
}

function addFooters(doc: jsPDF, pageWidth: number, marginLeft: number, marginRight: number) {
  const pageCount = (doc as any).internal.pages.length
  const pageSize = doc.internal.pageSize
  const pageHeight = pageSize.getHeight()
  const footerY = pageHeight - 8

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('', 'normal')

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(marginLeft, footerY - 3, pageWidth - marginRight, footerY - 3)

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Date on left
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      marginLeft,
      footerY
    )

    // Page number on right
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginRight - 18, footerY)
  }
}
