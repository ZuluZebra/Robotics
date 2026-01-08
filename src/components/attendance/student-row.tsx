'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Student, AttendanceRecord, ParentAbsenceNotification } from '@/types/models'
import { Bell } from 'lucide-react'

interface StudentRowProps {
  student: Student
  attendance?: AttendanceRecord
  parentNotification?: ParentAbsenceNotification
  isPresent: boolean
  absenceReason: string
  comments: string
  onPresentChange: (present: boolean) => void
  onReasonChange: (reason: string) => void
  onCommentChange: (comment: string) => void
}

export function StudentRow({
  student,
  parentNotification,
  isPresent,
  absenceReason,
  comments,
  onPresentChange,
  onReasonChange,
  onCommentChange,
}: StudentRowProps) {
  const studentName = `${student.first_name} ${student.last_name}`

  return (
    <div className={`border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition ${
      parentNotification ? 'bg-amber-50 border-amber-200' : ''
    }`}>
      <div className="flex items-start gap-4">
        <Checkbox
          id={`student-${student.id}`}
          checked={isPresent}
          onCheckedChange={(checked) => onPresentChange(checked as boolean)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <label
              htmlFor={`student-${student.id}`}
              className="font-medium cursor-pointer text-gray-900"
            >
              {studentName}
            </label>
            {parentNotification && (
              <div
                className="group relative"
                title={`Parent notified: ${parentNotification.reason || 'Absence notification'}`}
              >
                <Bell className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                  <div className="font-semibold mb-1">Parent Notified</div>
                  {parentNotification.reason && (
                    <div>Reason: {parentNotification.reason}</div>
                  )}
                  {parentNotification.notes && (
                    <div className="mt-1">Notes: {parentNotification.notes}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">Grade {student.grade}</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          isPresent
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {isPresent ? 'Present' : 'Absent'}
        </span>
      </div>

      {!isPresent && (
        <div className="ml-10 space-y-3 border-l-2 border-gray-300 pl-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Reason for absence (optional)
            </label>
            <Input
              placeholder="e.g., Sick, Medical appointment..."
              value={absenceReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Comments/Apology (optional)
            </label>
            <Textarea
              placeholder="Add any comments or apologies for this absence..."
              value={comments}
              onChange={(e) => onCommentChange(e.target.value)}
              className="text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
