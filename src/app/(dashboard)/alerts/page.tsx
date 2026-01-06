'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AttendanceAlertWithDetails } from '@/types/models'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface FilterState {
  resolved: 'all' | 'unresolved' | 'resolved'
  type: 'all' | 'low_attendance' | 'debtor_low_attendance'
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AttendanceAlertWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    resolved: 'unresolved',
    type: 'all',
  })
  const [selectedAlert, setSelectedAlert] = useState<AttendanceAlertWithDetails | null>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const supabase = createClient()

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('active_alerts_with_details')
        .select('*')

      // Apply filters
      if (filters.resolved === 'unresolved') {
        query = query.eq('is_resolved', false)
      } else if (filters.resolved === 'resolved') {
        query = query.eq('is_resolved', true)
      }

      if (filters.type !== 'all') {
        query = query.eq('alert_type', filters.type)
      }

      const { data, error } = await query.order('alert_date', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchAlerts()
  }, [filters, supabase])

  const handleSendEmail = async () => {
    if (!selectedAlert || !selectedAlert.parent_email) {
      toast.error('No parent email available')
      return
    }

    setEmailLoading(true)

    try {
      // In a real app, this would call an email service
      // For now, we'll just log the notification
      const { error } = await supabase
        .from('email_notifications')
        .insert([
          {
            alert_id: selectedAlert.alert_id,
            recipient_email: selectedAlert.parent_email,
            recipient_type: 'parent',
            subject: `Low Attendance Alert - ${selectedAlert.student_name}`,
            body: `Dear ${selectedAlert.parent_name},\n\nWe are writing to inform you that your child, ${selectedAlert.student_name}, has been absent from ${selectedAlert.class_name} for ${selectedAlert.consecutive_absences} sessions in the last two weeks.\n\nPlease contact the school to discuss this matter.\n\nBest regards,\nSchool Administration`,
          },
        ])

      if (error) throw error

      toast.success(`Email sent to ${selectedAlert.parent_email}!`)
      setShowEmailDialog(false)
      setSelectedAlert(null)
      fetchAlerts()
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleMarkResolved = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) throw error
      toast.success('Alert marked as resolved')
      fetchAlerts()
    } catch (error) {
      console.error('Error marking alert resolved:', error)
      toast.error('Failed to mark alert resolved')
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filters.resolved === 'unresolved' && alert.is_resolved) return false
    if (filters.resolved === 'resolved' && !alert.is_resolved) return false
    if (filters.type !== 'all' && alert.alert_type !== filters.type) return false
    return true
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Low Attendance Alerts</h1>
        <p className="text-gray-600 mt-2">
          Monitor students with low attendance and take action
        </p>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Notification Email</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded space-y-2">
                <p className="text-sm font-medium">
                  Student: {selectedAlert.student_name}
                </p>
                <p className="text-sm text-gray-600">
                  Parent: {selectedAlert.parent_name}
                </p>
                <p className="text-sm text-gray-600">
                  Email: {selectedAlert.parent_email}
                </p>
              </div>
              <p className="text-sm text-gray-700">
                Send a notification email to the parent about the low attendance pattern?
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={handleSendEmail}
                  disabled={emailLoading}
                >
                  {emailLoading ? 'Sending...' : 'Send Email'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEmailDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Status
            </label>
            <select
              value={filters.resolved}
              onChange={(e) =>
                setFilters({ ...filters, resolved: e.target.value as FilterState['resolved'] })
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Alert Type
            </label>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters({ ...filters, type: e.target.value as FilterState['type'] })
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="low_attendance">Low Attendance</option>
              <option value="debtor_low_attendance">Debtor + Low Attendance</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} matching filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                header: 'Student',
                accessor: (alert: AttendanceAlertWithDetails) =>
                  `${alert.student_name} (${alert.grade})`,
              },
              {
                header: 'Class',
                accessor: (alert: AttendanceAlertWithDetails) => alert.class_name || '—',
              },
              {
                header: 'Absences',
                accessor: (alert: AttendanceAlertWithDetails) =>
                  `${alert.consecutive_absences} days`,
              },
              {
                header: 'Debtor',
                accessor: (alert: AttendanceAlertWithDetails) =>
                  alert.is_debtor ? (
                    <Badge variant="destructive">Yes</Badge>
                  ) : (
                    <span className="text-gray-600">No</span>
                  ),
              },
              {
                header: 'Status',
                accessor: (alert: AttendanceAlertWithDetails) =>
                  alert.is_resolved ? (
                    <Badge variant="success">Resolved</Badge>
                  ) : (
                    <Badge variant="warning">Unresolved</Badge>
                  ),
              },
            ]}
            data={filteredAlerts}
            loading={loading}
            actions={(alert) => (
              <div className="flex gap-2">
                {!alert.is_resolved && alert.parent_email && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAlert(alert)
                      setShowEmailDialog(true)
                    }}
                    aria-label="Send email notification"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
                {!alert.is_resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkResolved(alert.alert_id)}
                    aria-label="Mark alert as resolved"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
