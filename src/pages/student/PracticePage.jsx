import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTopics } from '../../hooks/useTopics'
import { useSubjects } from '../../hooks/useSubjects'
import QuizSession from '../../components/student/QuizSession'
import toast from 'react-hot-toast'

export default function PracticePage() {
  const { profile } = useAuth()
  const { topics } = useTopics()
  const { subjects } = useSubjects()
  const [filterSubject, setFilterSubject] = useState('')
  const [config, setConfig] = useState({
    topics: [],
    count: 10,
    difficulty: '',
  })
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)

  // Set default subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !filterSubject) {
      setFilterSubject(subjects[0].id)
    }
  }, [subjects])

  // Reset selected topics when subject changes
  useEffect(() => {
    setConfig(c => ({ ...c, topics: [] }))
  }, [filterSubject])

  const gradeTopics = topics.filter(t =>
    (t.grade === profile?.grade || t.grade === 'all') &&
    (filterSubject ? t.subject_id === filterSubject : true)
  )

  function toggleTopic(name) {
    setConfig(c => ({
      ...c,
      topics: c.topics.includes(name)
        ? c.topics.filter(t => t !== name)
        : [...c.topics, name],
    }))
  }

  async function startPractice() {
    setLoading(true)
    let query = supabase.from('questions').select('*').eq('grade', profile?.grade)
    if (config.topics.length > 0) query = query.in('topic', config.topics)
    if (config.difficulty) query = query.eq('difficulty', config.difficulty)
    if (filterSubject) {
      query = query.eq('subject_id', filterSubject)
    } else {
      const ids = subjects.map(s => s.id)
      if (ids.length > 0) query = query.in('subject_id', ids)
    }

    const { data, error } = await query
    if (error || !data?.length) {
      toast.error('Không tìm thấy câu hỏi phù hợp')
      setLoading(false)
      return
    }

    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, config.count)
    const withShuffledOptions = shuffled.map(q => {
      if (q.type !== 'multiple_choice' || !q.options) return q
      return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) }
    })
    setQuestions(withShuffledOptions)
    setLoading(false)
  }

  if (questions) {
    return (
      <QuizSession
        questions={questions}
        mode="practice"
        onFinish={() => setQuestions(null)}
      />
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Luyện tập</h1>
      <p className="text-gray-500 mb-6">Khối {profile?.grade} — Chọn chủ đề và số câu để bắt đầu</p>

      {/* Subject filter */}
      {subjects.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSubject(s.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filterSubject === s.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Topic multi-select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Chủ đề</label>
            {config.topics.length > 0 && (
              <button
                onClick={() => setConfig(c => ({ ...c, topics: [] }))}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
          <div className="space-y-1">
            {gradeTopics.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Không có chủ đề nào</p>
            ) : gradeTopics.map(t => {
              const selected = config.topics.includes(t.name)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left ${
                    selected
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition ${
                    selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {selected && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  {t.name}
                </button>
              )
            })}
          </div>
          {config.topics.length === 0 && (
            <p className="text-xs text-gray-400 mt-1.5">Không chọn = lấy tất cả chủ đề</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mức độ</label>
          <div className="flex gap-2">
            {[['', 'Tất cả'], ['easy', 'Dễ'], ['medium', 'Trung bình'], ['hard', 'Khó']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setConfig(c => ({ ...c, difficulty: val }))}
                className={`flex-1 py-1.5 rounded-lg text-sm border-2 transition font-medium ${
                  config.difficulty === val
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Count slider */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Số câu hỏi: <span className="text-indigo-600 font-bold">{config.count}</span>
          </label>
          <input
            type="range" min={5} max={30} step={5}
            value={config.count}
            onChange={e => setConfig(c => ({ ...c, count: Number(e.target.value) }))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
          </div>
        </div>

        <button
          onClick={startPractice}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 text-base"
        >
          {loading ? 'Đang tải...' : 'Bắt đầu luyện tập'}
        </button>
      </div>
    </div>
  )
}
