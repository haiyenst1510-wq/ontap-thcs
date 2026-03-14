import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSubjects() {
  const { profile } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    try {
      if (profile.role === 'admin') {
        // Admin: fetch all subjects
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name')
        if (error) throw error
        setSubjects(data || [])
      } else if (profile.role === 'teacher') {
        // Teacher: fetch only assigned subjects via teacher_subjects join
        const { data, error } = await supabase
          .from('teacher_subjects')
          .select('subject:subjects(*)')
          .eq('teacher_id', profile.id)
        if (error) throw error
        // Unwrap the nested subject objects and sort by name
        const assigned = (data || [])
          .map(row => row.subject)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        setSubjects(assigned)
      } else {
        // Student: fetch all subjects (read-only, filtered by RLS)
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name')
        if (error) throw error
        setSubjects(data || [])
      }
    } catch (err) {
      console.error('useSubjects error:', err)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  return { subjects, loading, reload: load }
}
