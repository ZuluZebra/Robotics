'use client'

import { useState } from 'react'
import { Student, ParentAbsenceNotification } from '@/types/models'
import { ChevronDown, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CompactAttendanceListProps {
  students: Student[]
  parentNotifications: Record<string, ParentAbsenceNotification>
  studentStates: Record<
    string,
    { isPresent: boolean; absenceReason: string; comments: string }
  >
  onPresentChange: (studentId: string, isPresent: boolean) => void
  onReasonChange: (studentId: string, reason: string) => void
  onCommentChange: (studentId: string, comment: string) => void
}

export function CompactAttendanceList({
  students,
  parentNotifications,
  studentStates,
  onPresentChange,
  onReasonChange,
  onCommentChange,
}: CompactAttendanceListProps) {
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  const getRowColor = (studentId: string, isPresent: boolean) => {
    const hasParentNotification = !!parentNotifications[studentId]

    if (hasParentNotification) {
      // Parent marked absent
      return 'bg-amber-100 hover:bg-amber-150 border-l-4 border-amber-500'
    } else if (isPresent) {
      // Present
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500'
    } else {
      // Absent
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
    }
  }

  const getStatusLabel = (studentId: string, isPresent: boolean) => {
    if (parentNotifications[studentId]) {
      return 'Parent notified'
    }
    return isPresent ? 'Present' : 'Absent'
  }

  return (
    <div className="space-y-1 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-100 font-semibold text-sm border-b sticky top-0">
        <div className="col-span-4">Name</div>
        <div className="col-span-2">Grade</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-3 text-right">Actions</div>
      </div>

      {/* Student Rows */}
      <div className="divide-y">
        {students.map((student) => {
          const isPresent = studentStates[student.id]?.isPresent || false
          const absenceReason = studentStates[student.id]?.absenceReason || ''
          const comments = studentStates[student.id]?.comments || ''
          const hasNotification = !!parentNotifications[student.id]
          const isExpanded = expandedStudentId === student.id

          return (
            <div key={student.id}>
              {/* Compact Row */}
              <button
                onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                className={`w-full grid grid-cols-12 gap-2 px-4 py-3 transition text-left ${getRowColor(
                  student.id,
                  isPresent
                )} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {/* Name */}
                <div className="col-span-4">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {`${student.first_name} ${student.last_name}`}
                    {hasNotification && (
                      <Bell className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600">#{student.student_number}</div>
                </div>

                {/* Grade */}
                <div className="col-span-2 flex items-center text-sm text-gray-700">
                  {student.grade}
                </div>

                {/* Status */}
                <div className="col-span-3 flex items-center">
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded ${
                      hasNotification
                        ? 'bg-amber-200 text-amber-900'
                        : isPresent
                          ? 'bg-green-200 text-green-900'
                          : 'bg-red-200 text-red-900'
                    }`}
                  >
                    {getStatusLabel(student.id, isPresent)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant={isPresent ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPresentChange(student.id, true)
                    }}
                    className="text-xs"
                  >
                    ✓ Here
                  </Button>
                  <Button
                    size="sm"
                    variant={!isPresent ? 'destructive' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPresentChange(student.id, false)
                    }}
                    className="text-xs"
                  >
                    ✕ Absent
                  </Button>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-600 transition ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 py-4 bg-gray-50 border-t space-y-3">
                  {hasNotification && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Parent Absence Notification
                      </p>
                      <p className="text-sm text-amber-800">
                        <strong>Reason:</strong> {parentNotifications[student.id].reason}
                      </p>
                      {parentNotifications[student.id].notes && (
                        <p className="text-sm text-amber-800 mt-1">
                          <strong>Notes:</strong> {parentNotifications[student.id].notes}
                        </p>
                      )}
                    </div>
                  )}

                  {!isPresent && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Reason for absence
                        </label>
                        <Input
                          placeholder="e.g., Sick, Medical appointment..."
                          value={absenceReason}
                          onChange={(e) => onReasonChange(student.id, e.target.value)}
                          className="text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          Comments
                        </label>
                        <Textarea
                          placeholder="Add any comments or apologies for this absence..."
                          value={comments}
                          onChange={(e) => onCommentChange(student.id, e.target.value)}
                          className="text-sm resize-none"
                          rows={2}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
