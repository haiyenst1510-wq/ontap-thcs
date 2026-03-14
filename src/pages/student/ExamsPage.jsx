import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import QuizSession from '../../components/student/QuizSession'
import toast from 'react-hot-toast'
import { Clock, PlayCircle, CheckCircle } from 'lucide-react'

export default function StudentExamsPage() {
  const { profile, user } = useAuth()
  const [exams, setExams] = useState([])
  const [attemptsMap, setAttemptsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeExam, setActiveExam] = useState(null)

  useEffect(() => {
    if (profile) loadExams()
  }, [profile])

  async function loadExams() {
    setLoading(true)
    let q = supabase.from('exams').select('*').eq('is_active', true).eq('grade', profile.grade)
    if (profile.class_name) {
      q = q.or(`class_names.is.null,class_names.cs.{"${profile.class_name}"}`)
    } else {
      q = q.is('class_names', null)
    }
    const { data: examData } = await q.order('created_at', { ascending: false })

    if (examData?.length > 0) {
      const { data: sessionData } = await supabase
        .from('quiz_sessions')
        .select('exam_id')
        .eq('user_id', user.id)
        .in('exam_id', examData.map(e => e.id))

      const map = {}
      ;(sessionData || []).forEach(s => {
        map[s.exam_id] = (map[s.exam_id] || 0) + 1
      })
      setAttemptsMap(map)
    }

    setExams(examData || [])
    setLoading(false)
  }

  async function startExam(exam) {
    if (!exam.question_ids?.length) { toast.error('Đề thi chưa có câu hỏi'); return }
    const { data, error } = await supabase.from('questions').select('*').in('id', exam.question_ids)
    if (error || !data?.length) { toast.error('Không tải được câu hỏi'); return }
    const ordered = exam.question_ids.map(id => data.find(q => q.id === id)).filter(Boolean)
    setActiveExam({ exam, questions: ordered })
  }

  if (activeExam) {
    const used = attemptsMap[activeExam.exam.id] || 0
    return (
      <QuizSession
        questions={activeExam.questions}
        mode="exam"
        examMode={true}
        examId={activeExam.exam.id}
        timeLimit={activeExam.exam.time_limit}
        attemptNumber={used + 1}
        showAnswer={activeExam.exam.show_answer}
        showScore={activeExam.exam.show_score}
        onFinish={() => { setActiveExam(null); loadExams() }}
      />
    )
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Đề thi</h1>
      <p className="text-gray-500 mb-6">
        {profile?.class_name ? `Lớp ${profile.class_name}` : `Khối ${profile?.grade}`} — Các đề thi đang mở
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Chưa có đề thi nào</p>
          <p className="text-sm mt-1">Giáo viên chưa mở đề thi cho lớp bạn</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-xl">
          {exams.map(exam => {
            const used = attemptsMap[exam.id] || 0
            const max = exam.max_attempts
            const canTake = max === 0 || used < max
            const done = used > 0

            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{exam.title}</h3>
                      {done && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Đã làm
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span>{exam.question_ids?.length} câu</span>
                      {exam.time_limit
                        ? <span className="flex items-center gap-1"><Clock size={11} />{exam.time_limit} phút</span>
                        : <span>Không giới hạn thời gian</span>
                      }
                      <span>
                        {max === 0
                          ? `Đã làm ${used} lần`
                          : `${used}/${max} lần`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => canTake && startExam(exam)}
                    disabled={!canTake}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition shrink-0 ${
                      canTake
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <PlayCircle size={15} />
                    {canTake ? (done ? 'Làm lại' : 'Làm bài') : 'Hết lượt'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
