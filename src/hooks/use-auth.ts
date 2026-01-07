import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserProfile, Class } from '@/types/models'

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError) {
            console.error('Error fetching profile:', profileError)
          } else {
            setProfile(profileData as UserProfile)

            // Fetch assigned classes if user is a teacher
            if (profileData.role === 'teacher') {
              const { data: classesData, error: classesError } = await supabase
                .from('teacher_classes')
                .select('class_id, classes (*)')
                .eq('teacher_id', user.id)

              if (classesError) {
                console.error('Error fetching teacher classes:', classesError)
              } else {
                setAssignedClasses(classesData?.map((tc: any) => tc.classes) || [])
              }
            }
          }
        }
      } catch (err) {
        console.error('Error getting user:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      setAssignedClasses([])
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  const isAdmin = profile?.role === 'admin'
  const isTeacher = profile?.role === 'teacher'
  const isAuthenticated = !!user

  return {
    user,
    profile,
    loading,
    error,
    logout,
    isAdmin,
    isTeacher,
    isAuthenticated,
    assignedClasses,
  }
}
