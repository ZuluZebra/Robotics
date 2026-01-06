'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Student, AttendanceRecord } from '@/types/models'

interface StudentRowProps {
  student: Student
  attendance?: AttendanceRecord
  isPresent: boolean
  absenceReason: string
  comments: string
  onPresentChange: (present: boolean) => void
  onReasonChange: (reason: string) => void
  onCommentChange: (comment: string) => void
}

export function StudentRow({
  student,
  isPresent,
  absenceReason,
  comments,
  onPresentChange,
  onReasonChange,
  onCommentChange,
}: StudentRowProps) {
  const studentName = `${student.first_name} ${student.last_name}`

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition">
      <div className="flex items-start gap-4">
        <Checkbox
          id={`student-${student.id}`}
          checked={isPresent}
          onCheckedChange={(checked) => onPresentChange(checked as boolean)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`student-${student.id}`}
            className="font-medium cursor-pointer text-gray-900"
          >
            {studentName}
          </label>
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
