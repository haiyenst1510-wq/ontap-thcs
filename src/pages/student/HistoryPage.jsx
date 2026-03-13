import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, Clock } from 'lucide-react'

export default function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [user.id])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lịch sử làm bài</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Chưa có bài làm nào</div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {sessions.map(s => {
            const percent = Math.round((s.correct / s.total) * 100)
            const date = new Date(s.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {s.correct}/{s.total} câu đúng
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${percent >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                      {percent}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {date}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                  {s.score}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
