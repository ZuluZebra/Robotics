'use client'

import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { generateInitials } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  const { profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View and manage your account</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(() => {
                const [firstName, lastName] = profile.full_name.split(' ')
                return generateInitials(firstName || '', lastName || '')
              })()}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{profile.full_name}</p>
              <p className="text-gray-600 capitalize">{profile.role}</p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Email</p>
              <p className="text-lg text-gray-900 mt-1">{profile.email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Role</p>
              <div className="mt-1">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  profile.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {profile.role === 'admin' ? 'Administrator' : 'Teacher'}
                </span>
              </div>
            </div>

            {profile.phone && (
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Phone</p>
                <p className="text-lg text-gray-900 mt-1">{profile.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Card */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            You are currently logged in as {profile.full_name} ({profile.role}).
          </p>
          <Button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </CardContent>
      </Card>

      {/* Account Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Account creation details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Account Status</p>
            <p className="text-lg text-gray-900 mt-1 font-semibold text-green-600">Active</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Member Since</p>
            <p className="text-lg text-gray-900 mt-1">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
