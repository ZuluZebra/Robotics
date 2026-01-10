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
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 15
  const marginTop = 15
  const marginRight = 15

  let isFirstPage = true

  schools.forEach((school, schoolIndex) => {
    // Add new page for each school (except first)
    if (!isFirstPage) {
      doc.addPage()
    }
    isFirstPage = false

    // Reset Y position for new page
    let yPos = marginTop

    // Render school header
    yPos = renderSchoolHeader(
      doc,
      school,
      marginLeft,
      yPos,
      pageWidth - marginLeft - marginRight
    )

    // Add spacing after header
    yPos += 5

    // Render classes table
    renderClassesTable(doc, school.classes, marginLeft, yPos, pageWidth, pageHeight, marginRight)
  })

  // Add page numbers and generation date
  addFooters(doc)

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
  const primaryColor = [25, 103, 210] // Blue
  const textColor = [33, 33, 33] // Dark gray

  // School name (large, bold)
  doc.setFontSize(16)
  doc.setTextColor(...primaryColor)
  doc.setFont(undefined, 'bold')
  doc.text(school.name, x, y)
  y += 8

  // Contact info (smaller, gray)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.setFont(undefined, 'normal')

  const contactInfo = []
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
    y += 5
  })

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(x, y + 2, x + width, y + 2)
  y += 7

  return y
}

function renderClassesTable(
  doc: jsPDF,
  classes: ClassWithDetails[],
  marginLeft: number,
  startY: number,
  pageWidth: number,
  pageHeight: number,
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
      fillColor: [25, 103, 210], // Blue
      textColor: [255, 255, 255], // White
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
      padding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      padding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // Light gray
    },
    columnStyles: {
      0: { cellWidth: 30 }, // Class Name
      1: { cellWidth: 15, halign: 'center' }, // Grade
      2: { cellWidth: 35, halign: 'center' }, // Schedule
      3: { cellWidth: 40, halign: 'center' }, // Time
      4: { cellWidth: 15, halign: 'center' }, // Room
      5: { cellWidth: 60 }, // Teachers
      6: { cellWidth: 15, halign: 'center' }, // Students
    },
    didDrawPage: (data) => {
      // Handle page breaks for multiple schools
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.getHeight()
      const pageCount = (doc as any).internal.pages.length

      // Add page number and date to footer of each page
      const pageNum = data.pageNumber
      const totalPages = (doc as any).internal.pages.length
      const footerY = pageHeight - 10

      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        marginLeft,
        footerY
      )
      doc.text(
        `Page ${pageNum}`,
        pageSize.getWidth() - marginRight - 20,
        footerY
      )
    },
  })
}

function addFooters(doc: jsPDF) {
  const pageCount = (doc as any).internal.pages.length
  const pageSize = doc.internal.pageSize
  const pageWidth = pageSize.getWidth()
  const pageHeight = pageSize.getHeight()
  const footerY = pageHeight - 10
  const marginRight = 15
  const marginLeft = 15

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Date on left
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      marginLeft,
      footerY
    )

    // Page number on right
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginRight - 25, footerY)
  }
}
