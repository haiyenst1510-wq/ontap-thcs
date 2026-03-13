import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGrades() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('grades').select('value').order('value')
    setGrades(data?.map(g => g.value) || [])
    setLoading(false)
  }

  return { grades, loading, refetch: fetch }
}
