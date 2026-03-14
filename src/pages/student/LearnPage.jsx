import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useSubjects } from '../../hooks/useSubjects'
import { BookOpen, CheckCircle, PlayCircle, Clock, FileText, ChevronRight } from 'lucide-react'

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
  const { subjects } = useSubjects()
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [lessons, setLessons] = useState([])
  const [topics, setTopics] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const touchStartX = { current: 0 }

  // Set default subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0])
    }
  }, [subjects])

  useEffect(() => {
    if (profile && user && selectedSubject) loadData()
  }, [profile, user, selectedSubject])

  async function loadData() {
    setLoading(true)
    let topicsQuery = supabase.from('topics')
      .select('*')
      .or(`grade.eq.${profile.grade},grade.eq.all`)
      .order('name')
    if (selectedSubject) topicsQuery = topicsQuery.eq('subject_id', selectedSubject.id)

    let lessonsQuery = supabase.from('lessons')
      .select('*')
      .eq('is_published', true)
      .eq('grade', profile.grade)
      .order('order', { ascending: true })
    if (selectedSubject) lessonsQuery = lessonsQuery.eq('subject_id', selectedSubject.id)

    const [{ data: topicsData }, { data: lessonsData }, { data: progressData }] = await Promise.all([
      topicsQuery,
      lessonsQuery,
      supabase.from('lesson_progress')
        .select('*')
        .eq('user_id', user.id),
    ])

    const list = lessonsData || []
    setLessons(list)
    setTopics(topicsData || [])

    const map = {}
    ;(progressData || []).forEach(p => { map[p.lesson_id] = p })
    setProgressMap(map)

    // Chọn chủ đề đầu tiên mặc định
    const firstTopic = topicsData?.[0]?.name || list[0]?.topic || null
    setSelectedTopic(firstTopic)
    setLoading(false)
  }

  // Group lessons by topic name
  const grouped = {}
  ;(lessons || []).forEach(lesson => {
    const key = lesson.topic || '__no_topic__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(lesson)
  })

  // Topic list: all topics from DB + fallback for lessons with unknown topic
  const topicList = topics.map(t => t.name)
  ;(lessons || []).forEach(lesson => {
    const key = lesson.topic || '__no_topic__'
    if (!topicList.includes(key)) topicList.push(key)
  })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (topics.length === 0 && lessons.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Subject bar */}
        {subjects.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-200 bg-white shrink-0 scrollbar-hide">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubject(s)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition
                  ${selectedSubject?.id === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="p-4 md:p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Học tập</h1>
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">Chưa có bài học nào</p>
            <p className="text-sm mt-1">Giáo viên chưa xuất bản bài học cho khối bạn</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedLessons = selectedTopic ? (grouped[selectedTopic] || []) : []
  const selectedLabel = selectedTopic === '__no_topic__' ? 'Chưa phân loại' : selectedTopic

  function TopicList({ onSelect }) {
    return (
      <div className="p-2 space-y-1">
        {topicList.map(topicKey => {
          const label = topicKey === '__no_topic__' ? 'Chưa phân loại' : topicKey
          const count = (grouped[topicKey] || []).length
          const isSelected = selectedTopic === topicKey
          return (
            <button
              key={topicKey}
              onClick={() => { setSelectedTopic(topicKey); onSelect?.() }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center justify-between gap-2
                ${isSelected ? 'bg-indigo-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              <span className="line-clamp-2 leading-snug">{label}</span>
              <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-full font-medium
                ${isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-200 text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full md:h-[calc(100vh-64px)]">
      {/* Subject selector bar */}
      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-200 bg-white shrink-0 scrollbar-hide">
          {subjects.map(s => (
            <button key={s.id} onClick={() => setSelectedSubject(s)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition
                ${selectedSubject?.id === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 2-panel layout */}
      <div
        className="flex flex-1 overflow-hidden md:flex-row"
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (dx > 60 && touchStartX.current < 40) setMobileSidebarOpen(true)
          if (dx < -60) setMobileSidebarOpen(false)
        }}
      >
        {/* Mobile drawer backdrop */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar — drawer on mobile, fixed panel on desktop */}
        <div className={`
          fixed md:static top-0 left-0 h-full md:h-auto z-40 md:z-auto
          w-72 bg-gray-50 border-r border-gray-200 flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:w-72 shrink-0 md:overflow-y-auto
        `}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-800">Học tập</h1>
              <p className="text-xs text-gray-400 mt-0.5">Khối {profile?.grade}</p>
            </div>
            <button
              className="md:hidden text-gray-400 hover:text-gray-600 p-1"
              onClick={() => setMobileSidebarOpen(false)}
            >✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TopicList onSelect={() => setMobileSidebarOpen(false)} />
          </div>
        </div>

        {/* Right: lesson list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          {/* Mobile: topic selector button */}
          <button
            className="md:hidden flex items-center gap-2 mb-4 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 w-full text-left shadow-sm"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <ChevronRight size={15} className="text-indigo-500 shrink-0" />
            <span className="text-gray-500 text-xs">Chủ đề:</span>
            <span className="font-medium text-gray-800 truncate">{selectedLabel}</span>
          </button>

          <h2 className="hidden md:flex text-lg font-bold text-gray-800 mb-4 items-center gap-2">
            <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block" />
            {selectedLabel}
          </h2>

          {selectedLessons.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
              <p>Chưa có bài học nào</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {selectedLessons.map(lesson => {
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
          )}
        </div>
      </div>
    </div>
  )
}
