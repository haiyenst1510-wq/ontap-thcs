import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, ChevronRight, Loader2, ExternalLink, Save } from 'lucide-react'
import { normalizeAnswer } from '../../utils/normalizeAnswer'
import toast from 'react-hot-toast'

export default function ExamResultsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(null)
  const [sessions, setSessions] = useState([])
  const [questions, setQuestions] = useState([])
  const [filterClass, setFilterClass] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [essayGrades, setEssayGrades] = useState({}) // { sessionId: { "i": { score, comment } } }
  const [savingGrade, setSavingGrade] = useState(null) // index đang lưu

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const [{ data: examData }, { data: sessionData }] = await Promise.all([
      supabase.from('exams').select('*').eq('id', id).single(),
      supabase.from('quiz_sessions').select('*').eq('exam_id', id).order('submitted_at', { ascending: false }),
    ])
    if (!examData) { navigate('/teacher/exams'); return }

    const userIds = [...new Set((sessionData || []).map(s => s.user_id))]
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, class_name').in('id', userIds)
      profiles?.forEach(p => { profileMap[p.id] = p })
    }

    const { data: qData } = await supabase.from('questions')
      .select('id, question, correct_answer, type, options')
      .in('id', examData.question_ids)
    const ordered = examData.question_ids.map(qid => qData?.find(q => q.id === qid)).filter(Boolean)

    const { data: classData } = await supabase.from('classes').select('name').eq('grade', examData.grade).order('name')

    const gradesMap = {}
    ;(sessionData || []).forEach(s => {
      if (s.essay_grades) gradesMap[s.id] = s.essay_grades
    })
    setEssayGrades(gradesMap)
    setExam(examData)
    setSessions((sessionData || []).map(s => ({ ...s, profile: profileMap[s.user_id] })))
    setQuestions(ordered)
    setClasses(classData?.map(c => c.name) || [])
    setLoading(false)
  }

  async function saveEssayGrade(sessionId, qIndex, score, comment) {
    setSavingGrade(qIndex)
    const current = essayGrades[sessionId] || {}
    const updated = { ...current, [qIndex]: { score, comment } }
    const { error } = await supabase.from('quiz_sessions')
      .update({ essay_grades: updated }).eq('id', sessionId)
    if (error) { toast.error('Lưu thất bại'); setSavingGrade(null); return }
    setEssayGrades(prev => ({ ...prev, [sessionId]: updated }))
    toast.success('Đã lưu điểm')
    setSavingGrade(null)
  }

  // Group by student
  const studentMap = {}
  sessions.forEach(s => {
    if (!studentMap[s.user_id]) studentMap[s.user_id] = { profile: s.profile, sessions: [] }
    studentMap[s.user_id].sessions.push(s)
  })

  const students = Object.values(studentMap)
    .filter(st => !filterClass || st.profile?.class_name === filterClass)
    .sort((a, b) => Math.max(...b.sessions.map(s => s.score)) - Math.max(...a.sessions.map(s => s.score)))

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => selectedStudent ? (setSelectedStudent(null), setSelectedSession(null)) : navigate('/teacher/exams')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition"
        >
          <ArrowLeft size={15} />
          {selectedStudent ? 'Danh sách học sinh' : 'Đề thi'}
        </button>
        <h1 className="text-xl font-bold text-gray-800">{exam.title}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Khối {exam.grade}{exam.class_names?.length > 0 ? ` · Lớp ${exam.class_names.join(', ')}` : ''} · {exam.question_ids?.length} câu
        </p>
      </div>

      {selectedStudent ? (
        /* ── Detail view ── */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-2xl">
          {/* Student header + attempt tabs */}
          <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
            <p className="font-semibold text-gray-800">{selectedStudent.profile?.full_name}</p>
            <p className="text-sm text-gray-500">Lớp {selectedStudent.profile?.class_name} · {selectedStudent.sessions.length} lần làm</p>
            {selectedStudent.sessions.length > 1 && (
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {selectedStudent.sessions
                  .sort((a, b) => a.attempt_number - b.attempt_number)
                  .map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${
                        selectedSession?.id === s.id
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      Lần {s.attempt_number}: {s.score} điểm
                    </button>
                  ))}
              </div>
            )}
          </div>

          {(() => {
            const activeSession = selectedSession || (selectedStudent.sessions.length === 1 ? selectedStudent.sessions[0] : null)
            if (!activeSession) return null
            return (
            <div className="p-5 space-y-3">
              {/* Session summary */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 pb-3 border-b border-gray-100">
                <span>Điểm: <strong className="text-indigo-700 text-base">{activeSession.score}</strong></span>
                <span>{activeSession.correct}/{activeSession.total} câu đúng</span>
                <span className="text-gray-400">
                  {new Date(activeSession.submitted_at).toLocaleDateString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Question breakdown */}
              {questions.map((q, i) => {
                const ans = activeSession.answers?.[i]
                const sessionGrades = essayGrades[activeSession.id] || {}
                const existingGrade = sessionGrades[i]

                if (q.type === 'essay') {
                  const essayAns = ans || {}
                  const text = typeof essayAns === 'object' ? essayAns.text : essayAns
                  const fileUrl = typeof essayAns === 'object' ? essayAns.file_url : null
                  const fileName = typeof essayAns === 'object' ? essayAns.file_name : null
                  const [localScore, setLocalScore] = useState(existingGrade?.score ?? '')
                  const [localComment, setLocalComment] = useState(existingGrade?.comment ?? '')

                  return (
                    <div key={q.id} className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{i + 1}. {q.question}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Tự luận</span>
                      </div>
                      {q.correct_answer && (
                        <p className="text-xs text-gray-500 italic">Đáp án mẫu: {q.correct_answer}</p>
                      )}
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-gray-400 mb-1">Bài làm của học sinh:</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{text || <span className="text-gray-400 italic">(không có nội dung)</span>}</p>
                        {fileUrl && (
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:underline text-xs mt-2">
                            <ExternalLink size={11} /> {fileName || 'Xem file đính kèm'}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Điểm</label>
                          <input type="number" min={0} max={10} step={0.5}
                            value={localScore}
                            onChange={e => setLocalScore(e.target.value)}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0–10" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 block mb-1">Nhận xét</label>
                          <input type="text"
                            value={localComment}
                            onChange={e => setLocalComment(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Nhận xét (tuỳ chọn)" />
                        </div>
                        <button
                          onClick={() => saveEssayGrade(activeSession.id, i, Number(localScore), localComment)}
                          disabled={savingGrade === i || localScore === ''}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 shrink-0">
                          {savingGrade === i ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          Lưu
                        </button>
                      </div>
                      {existingGrade && (
                        <p className="text-xs text-green-700">✓ Đã chấm: {existingGrade.score} điểm{existingGrade.comment ? ` — ${existingGrade.comment}` : ''}</p>
                      )}
                    </div>
                  )
                }

                const isOk = normalizeAnswer(q.type, ans, q.correct_answer)
                return (
                  <div key={q.id}
                    className={`rounded-xl border p-3 text-sm ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="font-medium text-gray-800 mb-1">{i + 1}. {q.question}</p>
                    {isOk
                      ? <p className="text-green-700">✓ {ans}</p>
                      : <p className="text-red-600">✗ Học sinh: <strong>{ans || '(bỏ qua)'}</strong>{' '}— Đúng: <strong>{q.correct_answer}</strong></p>
                    }
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      ) : (
        /* ── Student list ── */
        <div>
          <div className="flex gap-3 mb-5">
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-gray-500 text-sm self-center">
              {students.length} học sinh đã làm · {sessions.length} lượt
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Chưa có học sinh nào nộp bài</div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Không có học sinh nào trong lớp này</div>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {students.map((st, i) => {
                const scores = st.sessions.map(s => s.score)
                const best = Math.max(...scores)
                const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
                const colorClass = best >= 8 ? 'text-green-600' : best >= 5 ? 'text-orange-500' : 'text-red-500'
                const latest = st.sessions[0]
                const date = new Date(latest.submitted_at).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit',
                })
                return (
                  <button
                    key={st.profile?.id || i}
                    onClick={() => {
                      setSelectedStudent(st)
                      setSelectedSession(st.sessions.sort((a, b) => a.attempt_number - b.attempt_number).slice(-1)[0])
                    }}
                    className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{st.profile?.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">
                        Lớp {st.profile?.class_name} · {st.sessions.length} lần làm · {date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${colorClass}`}>{best}</div>
                      <div className="text-xs text-gray-400">Cao nhất</div>
                    </div>
                    {st.sessions.length > 1 && (
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-indigo-600">{avg}</div>
                        <div className="text-xs text-gray-400">TB</div>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
