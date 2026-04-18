import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Clock, BookOpen, FileText, X, CheckCircle, XCircle, MinusCircle } from 'lucide-react'

function ReviewModal({ session, examTitle, onClose }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!session.question_ids?.length) { setLoading(false); return }
      const { data } = await supabase
        .from('questions')
        .select('id, question, type, correct_answer, options, image_url')
        .in('id', session.question_ids)
      const ordered = session.question_ids.map(id => data?.find(q => q.id === id)).filter(Boolean)
      setQuestions(ordered)
      setLoading(false)
    }
    load()
  }, [session.id])

  const answers = session.answers || {}

  function getStatus(q, i) {
    const ans = answers[i]
    if (ans == null || ans === '') return 'skip'
    const correct = q.correct_answer?.toLowerCase?.() === ans?.toLowerCase?.()
    return correct ? 'correct' : 'wrong'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">Xem lại bài làm</h2>
            {examTitle && <p className="text-sm text-gray-500 mt-0.5">{examTitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Không tìm thấy dữ liệu câu hỏi</p>
          ) : (
            <div className="space-y-5">
              {/* Tổng kết */}
              <div className="flex gap-4 bg-gray-50 rounded-xl p-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle size={15} /> {session.correct} đúng
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <XCircle size={15} /> {session.total - session.correct} sai/bỏ
                </span>
                <span className="ml-auto font-bold text-indigo-600 text-base">{session.score} điểm</span>
              </div>

              {questions.map((q, i) => {
                const status = getStatus(q, i)
                const studentAns = answers[i]
                const opts = Array.isArray(q.options) ? q.options : []

                return (
                  <div key={q.id} className={`rounded-xl border-2 p-4 ${
                    status === 'correct' ? 'border-green-200 bg-green-50/50'
                    : status === 'wrong' ? 'border-red-200 bg-red-50/50'
                    : 'border-gray-200 bg-gray-50/50'
                  }`}>
                    {/* Số câu + trạng thái */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500">Câu {i + 1}</span>
                      {status === 'correct' && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={13} /> Đúng</span>}
                      {status === 'wrong'   && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle size={13} /> Sai</span>}
                      {status === 'skip'    && <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><MinusCircle size={13} /> Bỏ qua</span>}
                    </div>

                    {/* Nội dung câu hỏi */}
                    <p className="text-sm font-medium text-gray-800 mb-3">{q.question}</p>
                    {q.image_url && <img src={q.image_url} alt="" className="mb-3 rounded-lg max-h-40 object-contain" />}

                    {/* Trắc nghiệm: hiện các đáp án */}
                    {q.type === 'multiple_choice' && opts.length > 0 && (
                      <div className="space-y-1.5">
                        {opts.map((opt, oi) => {
                          const isCorrect = opt.key === q.correct_answer
                          const isChosen  = opt.key === studentAns
                          return (
                            <div key={opt.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border ${
                              isCorrect ? 'border-green-400 bg-green-100 text-green-800'
                              : isChosen ? 'border-red-400 bg-red-100 text-red-700'
                              : 'border-gray-200 bg-white text-gray-600'
                            }`}>
                              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-green-500 text-white'
                                : isChosen ? 'bg-red-400 text-white'
                                : 'bg-gray-100 text-gray-500'
                              }`}>
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {opt.text}
                              {isCorrect && <CheckCircle size={13} className="ml-auto shrink-0 text-green-600" />}
                              {isChosen && !isCorrect && <XCircle size={13} className="ml-auto shrink-0 text-red-500" />}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Các dạng khác: hiện đáp án học sinh + đáp án đúng */}
                    {q.type !== 'multiple_choice' && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex gap-2">
                          <span className="text-gray-500 shrink-0">Bạn trả lời:</span>
                          <span className={`font-medium ${status === 'correct' ? 'text-green-700' : status === 'wrong' ? 'text-red-600' : 'text-gray-400'}`}>
                            {studentAns || '(bỏ qua)'}
                          </span>
                        </div>
                        {status !== 'correct' && (
                          <div className="flex gap-2">
                            <span className="text-gray-500 shrink-0">Đáp án đúng:</span>
                            <span className="font-medium text-green-700">{q.correct_answer}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [examMap, setExamMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('exam')
  const [reviewSession, setReviewSession] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      const all = data || []
      setSessions(all)

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

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('exam')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'exam' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
            tab === 'practice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {examTitle && (
                    <div className="text-sm font-semibold text-gray-700 mb-1">{examTitle}</div>
                  )}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                <div className="flex items-center gap-3 shrink-0">
                  <div className={`text-2xl font-bold ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                    {s.score}
                  </div>
                  <button
                    onClick={() => setReviewSession(s)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition font-medium"
                  >
                    Xem lại
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          examTitle={reviewSession.exam_id ? examMap[reviewSession.exam_id] : 'Luyện tập'}
          onClose={() => setReviewSession(null)}
        />
      )}
    </div>
  )
}
