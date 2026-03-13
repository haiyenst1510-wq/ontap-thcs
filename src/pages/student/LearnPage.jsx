import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BookOpen, CheckCircle, PlayCircle, Clock, FileText, Lock } from 'lucide-react'

function getProgress(lesson, progress) {
  const hasVideo = !!lesson.video_url
  const hasQuiz = lesson.question_ids?.length > 0
  const hasPractice = lesson.has_practice
  const videoOk = !hasVideo || progress?.video_watched
  const quizOk = !hasQuiz || progress?.quiz_passed
  const practiceOk = !hasPractice || progress?.practice_submitted
  const total = [hasVideo, hasQuiz, hasPractice].filter(Boolean).length
  const done = [videoOk && hasVideo, quizOk && hasQuiz, practiceOk && hasPractice].filter(Boolean).length
  return { videoOk, quizOk, practiceOk, total, done, completed: progress?.completed }
}

export default function LearnPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [lessons, setLessons] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && user) loadData()
  }, [profile, user])

  async function loadData() {
    setLoading(true)
    const [{ data: lessonsData }, { data: progressData }] = await Promise.all([
      supabase.from('lessons')
        .select('*')
        .eq('is_published', true)
        .eq('grade', profile.grade)
        .order('order', { ascending: true }),
      supabase.from('lesson_progress')
        .select('*')
        .eq('user_id', user.id),
    ])

    setLessons(lessonsData || [])

    const map = {}
    ;(progressData || []).forEach(p => { map[p.lesson_id] = p })
    setProgressMap(map)
    setLoading(false)
  }

  // Group lessons by topic, preserving order within each topic
  const grouped = {}
  const topicOrder = []
  ;(lessons || []).forEach(lesson => {
    const key = lesson.topic || '__no_topic__'
    if (!grouped[key]) {
      grouped[key] = []
      topicOrder.push(key)
    }
    grouped[key].push(lesson)
  })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Học tập</h1>
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">Chưa có bài học nào</p>
          <p className="text-sm mt-1">Giáo viên chưa xuất bản bài học cho khối bạn</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Học tập</h1>
      <p className="text-gray-500 mb-6">Khối {profile?.grade} — {lessons.length} bài học</p>

      <div className="space-y-8">
        {topicOrder.map(topicKey => {
          const topicLessons = grouped[topicKey]
          const topicLabel = topicKey === '__no_topic__' ? 'Chưa phân loại' : topicKey
          return (
            <section key={topicKey}>
              <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block" />
                {topicLabel}
              </h2>
              <div className="space-y-3">
                {topicLessons.map(lesson => {
                  const prog = progressMap[lesson.id]
                  const { videoOk, quizOk, practiceOk, total, done, completed } = getProgress(lesson, prog)
                  const hasVideo = !!lesson.video_url
                  const hasQuiz = lesson.question_ids?.length > 0
                  const hasPractice = lesson.has_practice
                  const inProgress = done > 0 && !completed

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => navigate(`/student/learn/${lesson.id}`)}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition"
                    >
                      {/* Progress circle */}
                      <div className="shrink-0 mt-0.5">
                        {completed ? (
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle size={20} className="text-white" />
                          </div>
                        ) : inProgress ? (
                          <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center">
                            <Clock size={18} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <BookOpen size={18} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-800 leading-snug">{lesson.title}</p>
                          {total > 0 && (
                            <span className="text-xs text-gray-400 shrink-0">{done}/{total} bước</span>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{lesson.description}</p>
                        )}

                        {/* Badges row */}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {hasVideo && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <PlayCircle size={10} /> Video
                            </span>
                          )}
                          {hasQuiz && (
                            <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              <BookOpen size={10} /> {lesson.question_ids.length} câu hỏi
                            </span>
                          )}
                          {hasPractice && (
                            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              <FileText size={10} /> Thực hành
                            </span>
                          )}
                        </div>

                        {/* Progress detail chips */}
                        {total > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {hasVideo && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${videoOk ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Video {videoOk ? '✓' : '○'}
                              </span>
                            )}
                            {hasQuiz && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${quizOk ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Bài tập {quizOk ? `✓ ${prog?.quiz_correct ?? 0}/${prog?.quiz_total ?? lesson.question_ids.length}` : `${prog?.quiz_correct ?? 0}/${lesson.question_ids.length}`}
                              </span>
                            )}
                            {hasPractice && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${practiceOk ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                Thực hành {practiceOk ? '✓' : '○'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
