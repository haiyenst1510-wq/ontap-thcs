import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useGrades } from '../../hooks/useGrades'
import { X, Loader2, Eye, ChevronRight } from 'lucide-react'
import { normalizeAnswer } from '../../utils/normalizeAnswer'

/* ── StudentDetailModal ─────────────────────────────────── */
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
                return (
                  <div key={q.id} className={`rounded-xl border p-3 text-sm ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="font-medium text-gray-800 mb-1">{i + 1}. {q.question}</p>
                    {isOk
                      ? <p className="text-green-700">✓ {ans}</p>
                      : <p className="text-red-600">✗ Học sinh: <strong>{ans || '(bỏ qua)'}</strong> — Đúng: <strong>{q.correct_answer}</strong></p>
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
                                title="Xem chi tiết"
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

/* ── ExamStatsPage ──────────────────────────────────────── */
export default function ExamStatsPage() {
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

  // Build cell map: cellMap[userId][examId] = [sessions]
  const cellMap = {}
  sessions.forEach(s => {
    if (!cellMap[s.user_id]) cellMap[s.user_id] = {}
    if (!cellMap[s.user_id][s.exam_id]) cellMap[s.user_id][s.exam_id] = []
    cellMap[s.user_id][s.exam_id].push(s)
  })

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Thống kê kết quả</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {gradeValues.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
        {!loading && filterGrade && (
          <span className="text-gray-500 text-sm self-center">
            {students.length} học sinh · {exams.length} đề
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Không có đề thi nào cho khối {filterGrade}
        </div>
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
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-left group flex items-center gap-1"
                    >
                      <div>
                        <div className="font-medium text-gray-800 group-hover:text-indigo-600 transition text-sm">
                          {student.full_name}
                        </div>
                      </div>
                      <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-400 transition shrink-0" />
                    </button>
                  </td>
                  {exams.map(exam => {
                    const cells = cellMap[student.id]?.[exam.id] || []
                    if (cells.length === 0) {
                      return (
                        <td key={exam.id} className="px-3 py-3 text-center">
                          <span className="text-xs text-gray-300">Chưa làm</span>
                        </td>
                      )
                    }
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
