import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Trophy, BookOpen } from 'lucide-react'

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ questions: null, exams: null, students: null })
  const [examRanking, setExamRanking] = useState(null)
  const [practiceRanking, setPracticeRanking] = useState(null)

  useEffect(() => {
    fetchStats()
    fetchExamRanking()
    fetchPracticeRanking()
  }, [])

  async function fetchStats() {
    const [q, e, s] = await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('exams').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    ])
    setStats({ questions: q.count ?? 0, exams: e.count ?? 0, students: s.count ?? 0 })
  }

  async function buildRanking(sessions) {
    if (!sessions?.length) return []
    const userIds = [...new Set(sessions.map(s => s.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, grade, class_name')
      .in('id', userIds)
    const pm = {}
    profiles?.forEach(p => { pm[p.id] = p })
    const map = {}
    sessions.forEach(s => {
      const p = pm[s.user_id]
      if (!map[s.user_id]) {
        map[s.user_id] = {
          full_name: p?.full_name || '—',
          class_name: p?.class_name || (p?.grade ? `Khối ${p.grade}` : '—'),
          scores: [],
        }
      }
      map[s.user_id].scores.push(s.score)
    })
    return Object.values(map).map(u => ({
      ...u,
      count: u.scores.length,
      avg: Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length * 10) / 10,
      best: Math.max(...u.scores),
    }))
  }

  async function fetchExamRanking() {
    const { data } = await supabase.from('exam_sessions').select('user_id, score')
    const ranked = await buildRanking(data)
    setExamRanking(ranked.sort((a, b) => b.avg - a.avg))
  }

  async function fetchPracticeRanking() {
    const { data, error } = await supabase.from('quiz_sessions').select('user_id, score')
    if (error) { console.error('quiz_sessions error:', error); setPracticeRanking([]); return }
    const ranked = await buildRanking(data)
    setPracticeRanking(ranked.sort((a, b) => b.count - a.count))
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Xin chào, {profile?.full_name}!</h1>
        <p className="text-gray-500">Quản lý câu hỏi và đề thi</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Tổng câu hỏi" value={stats.questions} color="bg-indigo-50 text-indigo-700" />
        <StatCard label="Số đề thi" value={stats.exams} color="bg-green-50 text-green-700" />
        <StatCard label="Học sinh" value={stats.students} color="bg-orange-50 text-orange-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exam ranking */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Trophy size={16} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Xếp hạng đề thi</h2>
            <span className="ml-auto text-xs text-gray-400">Theo điểm trung bình</span>
          </div>
          {examRanking === null ? (
            <LoadingRows />
          ) : examRanking.length === 0 ? (
            <Empty text="Chưa có học sinh nào nộp bài" />
          ) : (
            <div className="divide-y divide-gray-50">
              {examRanking.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{s.full_name}</div>
                    <div className="text-xs text-gray-400">Lớp {s.class_name} · {s.count} lần thi</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-bold ${s.avg >= 8 ? 'text-green-600' : s.avg >= 5 ? 'text-orange-500' : 'text-red-500'}`}>
                      {s.avg}
                    </div>
                    <div className="text-xs text-gray-400">TB</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-indigo-600">{s.best}</div>
                    <div className="text-xs text-gray-400">Cao nhất</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Practice ranking */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <BookOpen size={16} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Luyện tập</h2>
            <span className="ml-auto text-xs text-gray-400">Theo số lần luyện</span>
          </div>
          <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <p className="text-xs text-indigo-600">
              Học sinh tự chọn chủ đề và mức độ để luyện tập ngẫu nhiên.
            </p>
          </div>
          {practiceRanking === null ? (
            <LoadingRows />
          ) : practiceRanking.length === 0 ? (
            <Empty text="Chưa có học sinh nào luyện tập" />
          ) : (
            <div className="divide-y divide-gray-50">
              {practiceRanking.slice(0, 10).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{s.full_name}</div>
                    <div className="text-xs text-gray-400">Lớp {s.class_name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-indigo-600">{s.count}</div>
                    <div className="text-xs text-gray-400">lần</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${s.avg >= 8 ? 'text-green-600' : s.avg >= 5 ? 'text-orange-500' : 'text-red-500'}`}>
                      {s.avg}
                    </div>
                    <div className="text-xs text-gray-400">TB</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-6 ${color}`}>
      <div className="text-3xl font-bold mb-1">
        {value === null ? <span className="inline-block w-8 h-8 rounded bg-current opacity-20 animate-pulse" /> : value}
      </div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  )
}

function RankBadge({ rank }) {
  const colors = ['bg-yellow-400 text-white', 'bg-gray-300 text-white', 'bg-orange-300 text-white']
  const cls = colors[rank - 1] || 'bg-gray-100 text-gray-500'
  return (
    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${cls}`}>
      {rank}
    </span>
  )
}

function LoadingRows() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
    </div>
  )
}

function Empty({ text }) {
  return <div className="px-5 py-10 text-center text-sm text-gray-400">{text}</div>
}
