'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { StudentAccount, Student } from '@/types/models'
import { Loader2, Eye, DollarSign } from 'lucide-react'

interface StudentAccountWithDetails extends StudentAccount {
  student_name: string
  student_id: string
}

export default function DebtorsPage() {
  const [accounts, setAccounts] = useState<StudentAccountWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<StudentAccountWithDetails | null>(null)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
  })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const supabase = createClient()

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('student_accounts')
        .select(`
          *,
          students(first_name, last_name)
        `)
        .order('days_overdue', { ascending: false })

      if (error) throw error

      // Transform data to include student_name
      const accountsWithDetails: StudentAccountWithDetails[] = (data || []).map((account: any) => ({
        ...account,
        student_name: account.students ? `${account.students.first_name} ${account.students.last_name}` : 'Unknown',
      }))

      setAccounts(accountsWithDetails)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [supabase])

  const handleRecordPayment = async () => {
    if (!selectedAccount || !paymentData.amount) {
      toast.error('Please enter a payment amount')
      return
    }

    setPaymentLoading(true)

    try {
      // Record payment
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert([
          {
            account_id: selectedAccount.id,
            student_id: selectedAccount.student_id,
            amount: parseFloat(paymentData.amount),
            payment_date: paymentData.payment_date,
            payment_method: paymentData.payment_method,
            reference_number: paymentData.reference_number || null,
          },
        ])

      if (paymentError) throw paymentError

      // Update account balance
      const newBalance = Math.max(
        0,
        selectedAccount.current_balance - parseFloat(paymentData.amount)
      )
      const { error: updateError } = await supabase
        .from('student_accounts')
        .update({
          current_balance: newBalance,
          last_payment_date: paymentData.payment_date,
          last_payment_amount: parseFloat(paymentData.amount),
        })
        .eq('id', selectedAccount.id)

      if (updateError) throw updateError

      toast.success('Payment recorded successfully!')
      setShowPaymentForm(false)
      setSelectedAccount(null)
      setPaymentData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
      })
      fetchAccounts()
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error('Failed to record payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="success">Current</Badge>
      case 'overdue_15':
        return <Badge variant="warning">Overdue 15+ days</Badge>
      case 'overdue_30':
        return <Badge variant="destructive">Overdue 30+ days</Badge>
      case 'overdue_60':
        return <Badge className="bg-red-700">Overdue 60+ days</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Accounts</h1>
        <p className="text-gray-600 mt-2">Track student balances and payment status</p>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAccount && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium text-gray-700">
                  {selectedAccount.student_name}
                </p>
                <p className="text-sm text-gray-600">
                  Balance: ${selectedAccount.current_balance.toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                placeholder="e.g., Check # or transaction ID"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleRecordPayment}
                disabled={paymentLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record Payment'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPaymentForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Accounts</CardTitle>
          <CardDescription>
            {accounts.length} student account{accounts.length !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Student', accessor: 'student_name' },
              {
                header: 'Balance',
                accessor: (account: StudentAccountWithDetails) =>
                  `$${account.current_balance.toFixed(2)}`,
              },
              {
                header: 'Days Overdue',
                accessor: (account: StudentAccountWithDetails) =>
                  account.days_overdue > 0 ? account.days_overdue : '—',
              },
              {
                header: 'Status',
                accessor: (account: StudentAccountWithDetails) =>
                  getPaymentStatusBadge(account.payment_status),
              },
              {
                header: 'Last Payment',
                accessor: (account: StudentAccountWithDetails) =>
                  account.last_payment_date ? new Date(account.last_payment_date).toLocaleDateString() : '—',
              },
            ]}
            data={accounts}
            loading={loading}
            actions={(account) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAccount(account)
                    setShowPaymentForm(true)
                  }}
                  aria-label="Record payment"
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
