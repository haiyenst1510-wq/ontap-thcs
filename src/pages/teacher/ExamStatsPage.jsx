import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useGrades } from '../../hooks/useGrades'
import { normalizeAnswer } from '../../utils/normalizeAnswer'
import {
  X, Loader2, Eye, ChevronRight, ArrowLeft,
  AlertCircle, Save, ExternalLink, BarChart2, ClipboardCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── StudentDetailModal (tab Tổng quan) ──────────────────────
function StudentDetailModal({ student, exams, sessions, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function viewDetail(session, questionIds) {
    setLoadingDetail(true)
    const { data } = await supabase.from('questions')
      .select('id, question, correct_answer, type')
      .in('id', questionIds)
    const ordered = questionIds.map(id => data?.find(q => q.id === id)).filter(Boolean)
    setDetail({ session, questions: ordered })
    setLoadingDetail(false)
  }

  const examsWithSessions = exams.filter(e => sessions.some(s => s.exam_id === e.id))
  const examsEmpty = exams.filter(e => !sessions.some(s => s.exam_id === e.id))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">{student.full_name}</h2>
            {detail ? (
              <button onClick={() => setDetail(null)} className="text-xs text-indigo-600 hover:underline mt-0.5 block">
                ← Tổng hợp
              </button>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Lớp {student.class_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
            </div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">{student.full_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Lần {detail.session.attempt_number} · Điểm: <strong className="text-indigo-700">{detail.session.score}</strong> · {detail.session.correct}/{detail.session.total} câu đúng
                </p>
              </div>
              {detail.questions.map((q, i) => {
                const ans = detail.session.answers?.[i]
                const isOk = normalizeAnswer(q.type, ans, q.correct_answer)
                const ansText = typeof ans === 'object' ? (ans?.text || '(bỏ qua)') : (ans || '(bỏ qua)')
                return (
                  <div key={q.id} className={`rounded-xl border p-3 text-sm ${
                    q.type === 'essay' ? 'border-amber-200 bg-amber-50'
                    : isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <p className="font-medium text-gray-800 mb-1">{i + 1}. {q.question}</p>
                    {q.type === 'essay'
                      ? <p className="text-amber-600 text-xs">⏳ Câu tự luận</p>
                      : isOk
                        ? <p className="text-green-700">✓ {ansText}</p>
                        : <p className="text-red-600">✗ Học sinh: <strong>{ansText}</strong> — Đúng: <strong>{q.correct_answer}</strong></p>
                    }
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {examsWithSessions.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Học sinh chưa làm đề nào</p>
              ) : (
                examsWithSessions.map(exam => {
                  const examSessions = sessions
                    .filter(s => s.exam_id === exam.id)
                    .sort((a, b) => a.attempt_number - b.attempt_number)
                  return (
                    <div key={exam.id}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">{exam.title}</h3>
                      <div className="space-y-1.5">
                        {examSessions.map(s => {
                          const percent = Math.round(s.correct / s.total * 100)
                          const date = new Date(s.submitted_at).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                          })
                          return (
                            <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500">Lần {s.attempt_number} · {date}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-base font-bold ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                  {s.score}
                                </span>
                                <span className="text-xs text-gray-400 ml-1.5">{s.correct}/{s.total} câu</span>
                              </div>
                              <button
                                onClick={() => viewDetail(s, exam.question_ids)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 transition shrink-0"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
              {examsEmpty.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">Chưa làm:</p>
                  <div className="flex flex-wrap gap-2">
                    {examsEmpty.map(e => (
                      <span key={e.id} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{e.title}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab 1: Tổng quan (bảng điểm) ────────────────────────────
function OverviewTab() {
  const { grades: gradeValues } = useGrades()
  const [filterGrade, setFilterGrade] = useState('')
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => {
    if (gradeValues.length > 0 && !filterGrade) setFilterGrade(gradeValues[0])
  }, [gradeValues])

  useEffect(() => { if (filterGrade) fetchData() }, [filterGrade])

  async function fetchData() {
    setLoading(true)
    const [examRes, studentRes] = await Promise.all([
      supabase.from('exams').select('id, title, question_ids').eq('grade', filterGrade).order('created_at'),
      supabase.from('profiles').select('id, full_name, class_name').eq('role', 'student').eq('grade', filterGrade).order('full_name'),
    ])
    const examIds = (examRes.data || []).map(e => e.id)
    let sessionData = []
    if (examIds.length > 0) {
      const { data } = await supabase.from('quiz_sessions')
        .select('id, user_id, exam_id, score, correct, total, attempt_number, submitted_at, answers')
        .in('exam_id', examIds)
      sessionData = data || []
    }
    setExams(examRes.data || [])
    setStudents(studentRes.data || [])
    setSessions(sessionData)
    setLoading(false)
  }

  const cellMap = {}
  sessions.forEach(s => {
    if (!cellMap[s.user_id]) cellMap[s.user_id] = {}
    if (!cellMap[s.user_id][s.exam_id]) cellMap[s.user_id][s.exam_id] = []
    cellMap[s.user_id][s.exam_id].push(s)
  })

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {gradeValues.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
        {!loading && filterGrade && (
          <span className="text-gray-500 text-sm">{students.length} học sinh · {exams.length} đề</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Không có đề thi nào cho khối {filterGrade}</div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Không có học sinh nào</div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 min-w-[180px] sticky left-0 bg-gray-50 z-10">
                  Họ và tên
                </th>
                {exams.map(exam => (
                  <th key={exam.id} className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[120px]">
                    <div className="truncate max-w-[140px] mx-auto" title={exam.title}>{exam.title}</div>
                    <div className="text-xs text-gray-400 font-normal">{exam.question_ids?.length} câu</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-indigo-50/40 transition">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-100">
                    <button onClick={() => setSelectedStudent(student)} className="text-left group flex items-center gap-1">
                      <div className="font-medium text-gray-800 group-hover:text-indigo-600 transition text-sm">
                        {student.full_name}
                      </div>
                      <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-400 transition shrink-0" />
                    </button>
                  </td>
                  {exams.map(exam => {
                    const cells = cellMap[student.id]?.[exam.id] || []
                    if (cells.length === 0) return (
                      <td key={exam.id} className="px-3 py-3 text-center">
                        <span className="text-xs text-gray-300">Chưa làm</span>
                      </td>
                    )
                    const avg = Math.round(cells.reduce((a, b) => a + b.score, 0) / cells.length * 10) / 10
                    const colorClass = avg >= 8 ? 'text-green-600' : avg >= 5 ? 'text-orange-500' : 'text-red-500'
                    return (
                      <td key={exam.id} className="px-3 py-3 text-center">
                        <div className={`text-base font-bold ${colorClass}`}>{avg}</div>
                        <div className="text-xs text-gray-400">{cells.length} lần</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          exams={exams}
          sessions={sessions.filter(s => s.user_id === selectedStudent.id)}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}

// ── StudentDetailView (tab Chấm bài) ────────────────────────
function StudentDetailView({ student, questions, essayGrades, savingGrade, onBack, onSaveGrade }) {
  const sorted = [...student.sessions].sort((a, b) => b.attempt_number - a.attempt_number)
  const [activeSession, setActiveSession] = useState(sorted[0])
  const [localGrades, setLocalGrades] = useState(() => {
    const init = {}
    student.sessions.forEach(s => {
      const grades = essayGrades[s.id] || {}
      init[s.id] = {}
      questions.forEach((q, i) => {
        if (q.type === 'essay') {
          init[s.id][i] = { score: grades[i]?.score ?? '', comment: grades[i]?.comment ?? '' }
        }
      })
    })
    return init
  })

  const session = activeSession
  const grades = essayGrades[session?.id] || {}

  function updateLocal(sessionId, qIndex, field, value) {
    setLocalGrades(prev => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] || {}),
        [qIndex]: { ...(prev[sessionId]?.[qIndex] || {}), [field]: value },
      },
    }))
  }

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition">
        <ArrowLeft size={15} /> Danh sách học sinh
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-bold text-gray-800">{student.profile?.full_name}</h2>
        <p className="text-sm text-gray-500">Lớp {student.profile?.class_name} · {student.sessions.length} lần làm</p>
        {student.sessions.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {[...student.sessions].sort((a, b) => a.attempt_number - b.attempt_number).map(s => (
              <button key={s.id} onClick={() => setActiveSession(s)}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  activeSession?.id === s.id
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}>
                Lần {s.attempt_number}: {s.score} điểm
              </button>
            ))}
          </div>
        )}
      </div>

      {session && (
        <>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-white rounded-xl border border-gray-200 px-5 py-3 mb-4">
            <span>Điểm: <strong className="text-indigo-700 text-base">{session.score}</strong></span>
            <span>{session.correct}/{session.total} câu TN đúng</span>
            <span className="text-gray-400 ml-auto">
              {new Date(session.submitted_at).toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = session.answers?.[i]

              if (q.type === 'essay') {
                const existingGrade = grades[i]
                const local = localGrades[session.id]?.[i] || { score: '', comment: '' }
                const essayText = typeof ans === 'object' ? ans?.text : ans
                const fileUrl = typeof ans === 'object' ? ans?.file_url : null
                const fileName = typeof ans === 'object' ? ans?.file_name : null
                const isSaving = savingGrade === `${session.id}-${i}`
                return (
                  <div key={q.id} className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm space-y-3">
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-gray-800 flex-1">{i + 1}. {q.question}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Tự luận</span>
                    </div>
                    {q.correct_answer && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700">
                        <span className="font-semibold">Hướng dẫn chấm:</span> {q.correct_answer}
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-gray-400 mb-1">Bài làm của học sinh:</p>
                      <p className="text-gray-700 whitespace-pre-wrap min-h-8">
                        {essayText || <span className="text-gray-400 italic">(không có nội dung)</span>}
                      </p>
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
                          value={local.score}
                          onChange={e => updateLocal(session.id, i, 'score', e.target.value)}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0–10" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Nhận xét</label>
                        <input type="text"
                          value={local.comment}
                          onChange={e => updateLocal(session.id, i, 'comment', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nhận xét (tuỳ chọn)" />
                      </div>
                      <button
                        onClick={() => onSaveGrade(session.id, i, Number(local.score), local.comment)}
                        disabled={isSaving || local.score === ''}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 shrink-0">
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Lưu
                      </button>
                    </div>
                    {existingGrade && (
                      <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        ✓ Đã chấm: {existingGrade.score} điểm{existingGrade.comment ? ` — ${existingGrade.comment}` : ''}
                      </p>
                    )}
                  </div>
                )
              }

              const isOk = normalizeAnswer(q.type, ans, q.correct_answer)
              const ansText = typeof ans === 'object' ? (ans?.text || '(bỏ qua)') : (ans || '(bỏ qua)')
              return (
                <div key={q.id} className={`rounded-xl border p-3 text-sm ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="font-medium text-gray-800 mb-1">{i + 1}. {q.question}</p>
                  {isOk
                    ? <p className="text-green-700">✓ {ansText}</p>
                    : <p className="text-red-600">✗ Học sinh: <strong>{ansText}</strong> — Đúng: <strong>{q.correct_answer}</strong></p>
                  }
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab 2: Kết quả & Chấm bài ────────────────────────────────
function GradingTab() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [sessions, setSessions] = useState([])
  const [questions, setQuestions] = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [essayGrades, setEssayGrades] = useState({})
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [savingGrade, setSavingGrade] = useState(null)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingExams, setLoadingExams] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function loadSubjects() {
      setLoadingSubjects(true)
      if (isAdmin) {
        const { data } = await supabase.from('subjects').select('id, name').order('name')
        setSubjects(data || [])
        if (data?.length > 0) setSelectedSubject(data[0])
      } else {
        const { data } = await supabase
          .from('teacher_subjects')
          .select('subject_id, subjects(id, name)')
          .eq('teacher_id', user.id)
        const list = (data || []).map(ts => ts.subjects).filter(Boolean)
        setSubjects(list)
        if (list.length > 0) setSelectedSubject(list[0])
      }
      setLoadingSubjects(false)
    }
    loadSubjects()
  }, [user.id, isAdmin])

  useEffect(() => {
    if (!selectedSubject) return
    setSelectedExam(null)
    setSessions([])
    setQuestions([])
    setProfileMap({})
    setSelectedStudent(null)
    setLoadingExams(true)
    supabase.from('exams')
      .select('id, title, grade, question_ids, is_active, created_at')
      .eq('subject_id', selectedSubject.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setExams(data || []); setLoadingExams(false) })
  }, [selectedSubject?.id])

  async function loadExamDetail(exam) {
    setSelectedExam(exam)
    setSelectedStudent(null)
    setLoadingDetail(true)

    const [{ data: sessionData }, { data: qData }] = await Promise.all([
      supabase.from('quiz_sessions').select('*').eq('exam_id', exam.id)
        .order('submitted_at', { ascending: false }),
      supabase.from('questions')
        .select('id, question, type, correct_answer, options')
        .in('id', exam.question_ids || []),
    ])

    const userIds = [...new Set((sessionData || []).map(s => s.user_id))]
    let pMap = {}
    if (userIds.length > 0) {
      const { data: pData } = await supabase.from('profiles')
        .select('id, full_name, class_name').in('id', userIds)
      ;(pData || []).forEach(p => { pMap[p.id] = p })
    }

    const orderedQs = (exam.question_ids || []).map(id => qData?.find(q => q.id === id)).filter(Boolean)
    const gradesMap = {}
    ;(sessionData || []).forEach(s => { if (s.essay_grades) gradesMap[s.id] = s.essay_grades })

    setSessions(sessionData || [])
    setQuestions(orderedQs)
    setProfileMap(pMap)
    setEssayGrades(gradesMap)
    setLoadingDetail(false)
  }

  async function saveEssayGrade(sessionId, qIndex, score, comment) {
    setSavingGrade(`${sessionId}-${qIndex}`)
    const current = essayGrades[sessionId] || {}
    const updated = { ...current, [qIndex]: { score, comment } }

    // Điểm = điểm TN + tổng điểm tự luận (cộng trực tiếp)
    const session = sessions.find(s => s.id === sessionId)
    let newScore = session?.score ?? 0
    if (session && questions.length > 0) {
      const autoQsCount = questions.filter(q => q.type !== 'essay').length
      const tnScore = autoQsCount > 0 ? (session.correct / autoQsCount) * 10 : 0
      const essayIndices = questions.map((q, i) => q.type === 'essay' ? i : -1).filter(i => i >= 0)
      const essaySum = essayIndices.reduce((acc, idx) => {
        const g = updated[idx]
        return acc + (g ? Number(g.score) : 0)
      }, 0)
      newScore = Math.round((tnScore + essaySum) * 10) / 10
    }

    const { error } = await supabase.from('quiz_sessions')
      .update({ essay_grades: updated, score: newScore }).eq('id', sessionId)
    if (error) { toast.error('Lưu thất bại'); setSavingGrade(null); return }
    setEssayGrades(prev => ({ ...prev, [sessionId]: updated }))
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, score: newScore } : s))
    toast.success('Đã lưu điểm')
    setSavingGrade(null)
  }

  const studentGroups = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      if (!map[s.user_id]) map[s.user_id] = { profile: profileMap[s.user_id], sessions: [] }
      map[s.user_id].sessions.push(s)
    })
    return Object.values(map).sort((a, b) => {
      const aMax = Math.max(...a.sessions.map(s => s.score))
      const bMax = Math.max(...b.sessions.map(s => s.score))
      return bMax - aMax
    })
  }, [sessions, profileMap])

  const essayQs = questions.filter(q => q.type === 'essay')
  const autoQs = questions.filter(q => q.type !== 'essay')

  function countUngraded(studentSessions) {
    if (essayQs.length === 0) return 0
    return studentSessions.reduce((acc, s) => {
      const grades = essayGrades[s.id] || {}
      return acc + essayQs.filter((_, qi) => {
        const realIdx = questions.indexOf(essayQs[qi])
        return grades[realIdx] == null
      }).length
    }, 0)
  }

  if (loadingSubjects) return (
    <div className="flex justify-center py-16">
      <Loader2 className="animate-spin text-indigo-600" size={28} />
    </div>
  )

  if (subjects.length === 0) return (
    <div className="text-center py-16 text-gray-400 text-sm">
      Bạn chưa được phân công môn học nào. Liên hệ quản trị viên.
    </div>
  )

  return (
    <div className="flex gap-0 border border-gray-200 rounded-2xl overflow-hidden bg-white" style={{ minHeight: '600px' }}>
      {/* ── Left: subject + exam list ── */}
      <div className="w-64 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Subject tabs */}
        <div className="p-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Môn học</p>
          <div className="space-y-0.5">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubject(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedSubject?.id === s.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-white'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Exam list */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Đề thi {exams.length > 0 && `(${exams.length})`}
          </p>
          {loadingExams ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-indigo-400" size={18} />
            </div>
          ) : exams.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-2">Chưa có đề thi nào</p>
          ) : (
            <div className="space-y-1">
              {exams.map(exam => (
                <button key={exam.id} onClick={() => loadExamDetail(exam)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                    selectedExam?.id === exam.id
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                  }`}>
                  <p className="text-sm font-medium leading-snug">{exam.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Khối {exam.grade} · {exam.question_ids?.length || 0} câu
                    {!exam.is_active && <span className="ml-1 text-amber-500">(Tắt)</span>}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: content area ── */}
      <div className="flex-1 overflow-y-auto">
        {!selectedExam ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm min-h-[400px]">
            ← Chọn đề thi để xem kết quả
          </div>
        ) : loadingDetail ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : selectedStudent ? (
          <StudentDetailView
            student={selectedStudent}
            questions={questions}
            essayGrades={essayGrades}
            savingGrade={savingGrade}
            onBack={() => setSelectedStudent(null)}
            onSaveGrade={saveEssayGrade}
          />
        ) : (
          /* Student list */
          <div className="p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-800">{selectedExam.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Khối {selectedExam.grade} · {questions.length} câu
                {essayQs.length > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">· {essayQs.length} câu tự luận</span>
                )}
              </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{studentGroups.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Học sinh đã làm</div>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">{sessions.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Tổng lượt nộp</div>
              </div>
              <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessions.length > 0
                    ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length * 10) / 10
                    : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Điểm trung bình</div>
              </div>
            </div>

            {studentGroups.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Chưa có học sinh nào nộp bài</div>
            ) : (
              <div className="space-y-2">
                {studentGroups.map((sg, rank) => {
                  const best = Math.max(...sg.sessions.map(s => s.score))
                  const avg = Math.round(sg.sessions.reduce((a, s) => a + s.score, 0) / sg.sessions.length * 10) / 10
                  const bestSession = sg.sessions.find(s => s.score === best)
                  const bestCorrect = bestSession?.correct ?? 0
                  const ungraded = countUngraded(sg.sessions)
                  const colorClass = best >= 8 ? 'text-green-600' : best >= 5 ? 'text-orange-500' : 'text-red-500'
                  return (
                    <button key={sg.profile?.id || rank} onClick={() => setSelectedStudent(sg)}
                      className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-left">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {rank + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{sg.profile?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">
                          Lớp {sg.profile?.class_name}
                          {sg.sessions.length > 1 && ` · ${sg.sessions.length} lần làm`}
                          {autoQs.length > 0 && ` · ${bestCorrect}/${autoQs.length} TN đúng`}
                        </p>
                      </div>
                      {ungraded > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          <AlertCircle size={11} /> {ungraded} chưa chấm
                        </span>
                      )}
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-bold ${colorClass}`}>{best}</div>
                        {sg.sessions.length > 1 && <div className="text-xs text-gray-400">TB: {avg}</div>}
                      </div>
                      <ChevronRight size={15} className="text-gray-300 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function ExamStatsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Thống kê kết quả</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 size={15} /> Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('grading')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'grading' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardCheck size={15} /> Kết quả & Chấm bài
        </button>
      </div>

      {activeTab === 'overview' ? <OverviewTab /> : <GradingTab />}
    </div>
  )
}
