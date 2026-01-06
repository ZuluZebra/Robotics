'use client'

import { useAuth } from '@/hooks/use-auth'
import { generateInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

export function Header() {
  const { profile } = useAuth()

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Attendance</h1>
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
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
