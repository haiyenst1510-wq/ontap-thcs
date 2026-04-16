import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Clock, BookOpen, FileText } from 'lucide-react'

export default function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [examMap, setExamMap] = useState({})   // { exam_id: title }
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('exam') // 'exam' | 'practice'

  useEffect(() => {
    async function load() {
      // 1. Lấy toàn bộ lịch sử làm bài
      const { data } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      const all = data || []
      setSessions(all)

      // 2. Lấy tên đề thi (query riêng, ghép thủ công để tránh lỗi join khi chưa có FK)
      const examIds = [...new Set(all.filter(s => s.exam_id).map(s => s.exam_id))]
      if (examIds.length > 0) {
        const { data: exams } = await supabase
          .from('exams')
          .select('id, title')
          .in('id', examIds)
        const map = {}
        ;(exams || []).forEach(e => { map[e.id] = e.title })
        setExamMap(map)
      }

      setLoading(false)
    }
    load()
  }, [user.id])

  const examSessions     = sessions.filter(s => s.exam_id != null)
  const practiceSessions = sessions.filter(s => s.exam_id == null)
  const displayed = tab === 'exam' ? examSessions : practiceSessions

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lịch sử làm bài</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('exam')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'exam'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={14} /> Đề thi
          {examSessions.length > 0 && (
            <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
              {examSessions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('practice')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'practice'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={14} /> Luyện tập
          {practiceSessions.length > 0 && (
            <span className="ml-1 bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
              {practiceSessions.length}
            </span>
          )}
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Chưa có bài làm nào</div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {displayed.map(s => {
            const percent = Math.round((s.correct / s.total) * 100)
            const dateStr = s.submitted_at || s.created_at
            const date = new Date(dateStr).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
            const examTitle = s.exam_id ? examMap[s.exam_id] : null

            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
                <div>
                  {examTitle && (
                    <div className="text-sm font-semibold text-gray-700 mb-1">{examTitle}</div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {s.correct}/{s.total} câu đúng
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${percent >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                      {percent}%
                    </span>
                    {s.attempt_number > 1 && (
                      <span className="text-xs text-gray-400">Lần {s.attempt_number}</span>
                    )}
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
