'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { generateInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

export function Header() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [unresolvedAlertCount, setUnresolvedAlertCount] = useState(0)

  // Fetch unresolved alerts count
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const { count, error } = await supabase
          .from('attendance_alerts')
          .select('id', { count: 'exact' })
          .eq('is_resolved', false)

        if (error) throw error
        setUnresolvedAlertCount(count || 0)
      } catch (error) {
        console.error('Error fetching alert count:', error)
      }
    }

    fetchAlertCount()
  }, [supabase])

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Robotics League</h1>
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, {profile?.full_name || 'User'}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="View alerts"
            onClick={() => router.push('/alerts')}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unresolvedAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {unresolvedAlertCount > 9 ? '9+' : unresolvedAlertCount}
              </span>
            )}
          </Button>

          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
              {profile ? (() => {
                const [firstName, lastName] = profile.full_name.split(' ')
                return generateInitials(firstName || '', lastName || '')
              })() : 'U'}
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-600 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
