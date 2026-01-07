'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { UserProfile } from '@/types/models'
import { Loader2 } from 'lucide-react'

interface TeacherFormProps {
  teacher?: UserProfile
  userRole?: 'admin' | 'teacher'
  onSuccess: () => void
  onCancel: () => void
}

export function TeacherForm({ teacher, userRole = 'teacher', onSuccess, onCancel }: TeacherFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: teacher?.email || '',
    full_name: teacher?.full_name || '',
    phone: teacher?.phone || '',
    password: '',
  })
  const [privileges, setPrivileges] = useState({
    can_mark_attendance: true,
    can_view_reports: true,
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (!formData.full_name.trim()) {
        throw new Error('Full name is required')
      }

      if (teacher?.id) {
        // Update existing teacher
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
          })
          .eq('id', teacher.id)

        if (updateError) throw updateError
        toast.success('Teacher updated successfully!')
      } else {
        // Create new teacher account - validate all fields
        if (!formData.email.trim()) {
          throw new Error('Email is required')
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          throw new Error('Please enter a valid email address')
        }

        if (!formData.password) {
          throw new Error('Password is required')
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long')
        }

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (authError) throw authError
        if (!authData.user?.id) throw new Error('Failed to create auth user')

        // Create user profile for the new user
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              phone: formData.phone,
              role: userRole,
            },
          ])

        if (profileError) throw profileError
        const successMsg = userRole === 'admin' ? 'Admin created successfully!' : 'Teacher created successfully!'
        toast.success(successMsg)
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {teacher ? 'Edit' : 'Create'} {userRole === 'admin' ? 'Admin' : 'Teacher'}
        </CardTitle>
        <CardDescription>
          {teacher
            ? (userRole === 'admin' ? 'Update admin information' : 'Update teacher information')
            : (userRole === 'admin' ? 'Add a new admin to the system' : 'Add a new teacher to the system')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              disabled={!!teacher}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.smith@roboticsleague.com"
            />
            {teacher && (
              <p className="text-sm text-muted-foreground mt-1">Cannot change email for existing teachers</p>
            )}
            {!teacher && (
              <p className="text-sm text-muted-foreground mt-1">Use a real-looking email address. Test emails like test@test.com are rejected by the system.</p>
            )}
          </div>

          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g., John Smith"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="555-0000"
            />
          </div>

          {!teacher && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter a strong password"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Teacher will use this password to log in
              </p>
            </div>
          )}

          {userRole === 'teacher' && (
            <div className="space-y-3 border-t pt-4">
              <Label>Privileges</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_mark_attendance"
                    checked={privileges.can_mark_attendance}
                    onCheckedChange={(checked) =>
                      setPrivileges({ ...privileges, can_mark_attendance: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_mark_attendance" className="font-normal cursor-pointer">
                    Can mark attendance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_view_reports"
                    checked={privileges.can_view_reports}
                    onCheckedChange={(checked) =>
                      setPrivileges({ ...privileges, can_view_reports: checked as boolean })
                    }
                  />
                  <Label htmlFor="can_view_reports" className="font-normal cursor-pointer">
                    Can view reports
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save ' + (userRole === 'admin' ? 'Admin' : 'Teacher')
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
