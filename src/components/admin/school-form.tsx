'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { School } from '@/types/models'
import { Loader2 } from 'lucide-react'

interface SchoolFormProps {
  school?: School
  onSuccess: () => void
  onCancel: () => void
}

export function SchoolForm({ school, onSuccess, onCancel }: SchoolFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: school?.name || '',
    address: school?.address || '',
    phone: school?.phone || '',
    email: school?.email || '',
    principal_name: school?.principal_name || '',
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (school?.id) {
        // Update
        const { error } = await supabase
          .from('schools')
          .update(formData)
          .eq('id', school.id)

        if (error) throw error
        toast.success('School updated successfully!')
      } else {
        // Create
        const { error } = await supabase
          .from('schools')
          .insert([formData])

        if (error) throw error
        toast.success('School created successfully!')
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to save school')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{school ? 'Edit School' : 'Create School'}</CardTitle>
        <CardDescription>
          {school ? 'Update school information' : 'Add a new school to the system'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">School Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Robotics Academy"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="School address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="555-0000"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="school@example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="principal_name">Principal Name</Label>
            <Input
              id="principal_name"
              value={formData.principal_name}
              onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
              placeholder="Principal's full name"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save School'
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
