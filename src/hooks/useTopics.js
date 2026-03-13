import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTopics() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('topics').select('*').order('name')
    setTopics(data || [])
    setLoading(false)
  }

  return { topics, loading, refetch: fetch }
}
