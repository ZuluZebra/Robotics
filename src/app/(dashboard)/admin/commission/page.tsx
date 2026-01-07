'use client'

import { CommissionReport } from '@/components/reports/commission-report'

export const dynamic = 'force-dynamic'

export default function CommissionPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Commission Tracking</h1>
        <p className="text-gray-600 mt-2">Track teacher commissions based on student attendance</p>
      </div>
      <CommissionReport />
    </div>
  )
}
