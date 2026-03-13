import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowUp, ArrowDown, CheckCircle, PlayCircle, BookOpen, Upload, Loader2, Send } from 'lucide-react'
import { ImageUpload } from '../../components/teacher/QuestionFormModal'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

/* ── DragWordInput ─────────────────────────────────────────── */
function DragWordInput({ q, value, onChange }) {
  const segments = q.question.split('___')
  const blankCount = segments.length - 1
  const wordBank = useMemo(() => shuffle(q.options || []), [q.id])
  const [filled, setFilled] = useState(() =>
    value ? value.split(',').map(w => w.trim()) : Array(blankCount).fill(null)
  )
  const usedWords = new Set(filled.filter(Boolean))

  function placeWord(word) {
    const idx = filled.findIndex(f => !f)
    if (idx === -1) return
    const next = [...filled]; next[idx] = word
    setFilled(next)
    onChange(next.map(w => w || '').join(','))
  }
  function removeWord(idx) {
    const next = [...filled]; next[idx] = null
    setFilled(next)
    const hasAny = next.some(Boolean)
    onChange(hasAny ? next.map(w => w || '').join(',') : null)
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm leading-relaxed text-gray-800">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < blankCount && (
              <button
                onClick={() => removeWord(i)}
                className={`inline-flex items-center mx-1 px-3 py-0.5 rounded-lg border-2 min-w-12 text-sm font-semibold transition ${
                  filled[i]
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                    : 'border-dashed border-gray-300 text-gray-300 cursor-default'
                }`}
              >{filled[i] || '___'}</button>
            )}
          </span>
        ))}
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-2">Bấm từ để điền · Bấm chỗ trống để xóa</p>
        <div className="flex flex-wrap gap-2">
          {wordBank.map(opt => {
            const word = opt && typeof opt === 'object' ? opt.text : String(opt)
            const isUsed = usedWords.has(word)
            return (
              <button key={word} onClick={() => !isUsed && placeWord(word)} disabled={isUsed}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                  isUsed ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-500'
                }`}
              >{word}</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── MatchingInput ──────────────────────────────────────────── */
function MatchingInput({ q, value, onChange }) {
  const rightShuffled = useMemo(() => shuffle(q.match_options || []), [q.id])
  const [pairs, setPairs] = useState(() => {
    const p = {}
    ;(value || '').split(',').forEach(pair => {
      const [l, r] = pair.split('-')
      if (l && r) p[l] = r
    })
    return p
  })
  const [activeLeft, setActiveLeft] = useState(null)

  function buildAnswer(newPairs) {
    return q.options?.map(o => `${o.key}-${newPairs[o.key] || ''}`).filter(s => !s.endsWith('-')).join(',')
  }
  function handleLeftClick(key) { setActiveLeft(activeLeft === key ? null : key) }
  function handleRightClick(key) {
    if (!activeLeft) return
    const newPairs = { ...pairs, [activeLeft]: key }
    setPairs(newPairs); setActiveLeft(null)
    const ans = buildAnswer(newPairs); if (ans) onChange(ans)
  }
  function clearPair(leftKey) {
    const newPairs = { ...pairs }; delete newPairs[leftKey]
    setPairs(newPairs); onChange(buildAnswer(newPairs) || null)
  }

  const usedRight = new Set(Object.values(pairs))
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">Bấm cột trái → sau đó bấm cột phải để nối</p>
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          {q.options?.map(opt => {
            const matched = pairs[opt.key]; const isActive = activeLeft === opt.key
            return (
              <div key={opt.key} className="flex items-center gap-1">
                <button onClick={() => handleLeftClick(opt.key)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg border-2 text-sm transition ${
                    isActive ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : matched ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                  }`}
                ><span className="font-bold mr-1">{opt.key}.</span>{opt.text}</button>
                {matched && <button onClick={() => clearPair(opt.key)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col justify-around text-gray-300 text-lg select-none">
          {q.options?.map((_, i) => <span key={i}>→</span>)}
        </div>
        <div className="flex-1 space-y-2">
          {rightShuffled.map(opt => {
            const isUsed = usedRight.has(opt.key)
            const pairedLeft = Object.entries(pairs).find(([, r]) => r === opt.key)?.[0]
            return (
              <button key={opt.key} onClick={() => handleRightClick(opt.key)}
                disabled={isUsed && !activeLeft}
                className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition ${
                  isUsed ? 'border-green-400 bg-green-50 text-green-800'
                  : activeLeft ? 'border-indigo-300 bg-white text-gray-700 hover:border-indigo-500 hover:bg-indigo-50'
                  : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {isUsed && <span className="font-bold mr-1 text-green-600">{pairedLeft}-</span>}
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── OrderingInput ──────────────────────────────────────────── */
function OrderingInput({ q, value, onChange }) {
  const [items, setItems] = useState(() => {
    if (value) {
      const keyOrder = value.split(',')
      return keyOrder.map(k => q.options?.find(o => o.key === k)).filter(Boolean)
    }
    return shuffle(q.options || [])
  })
  useEffect(() => { if (!value) onChange(items.map(o => o.key).join(',')) }, [])

  function move(index, dir) {
    const next = [...items]; const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next); onChange(next.map(o => o.key).join(','))
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">Sắp xếp theo thứ tự đúng bằng cách bấm ↑ ↓</p>
      <div className="space-y-2">
        {items.map((opt, i) => (
          <div key={opt.key} className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800">{opt.text}</span>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20"><ArrowDown size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────────── */
function getEmbedUrl(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|[?&]v=)([a-zA-Z0-9_-]{11})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}`
  if (url.includes('/embed/')) return url
  return null
}

function checkAnswer(type, ans, correct) {
  if (!ans || !correct) return false
  if (type === 'matching') {
    const norm = s => s.split(',').map(p => p.trim()).sort().join(',')
    return norm(ans) === norm(correct)
  }
  if (type === 'drag_word') {
    const a = ans.split(',').map(w => w.trim().toLowerCase())
    const c = correct.split(',').map(w => w.trim().toLowerCase())
    return a.length === c.length && a.every((w, i) => w === c[i])
  }
  return ans.trim().toLowerCase() === correct.trim().toLowerCase()
}

function calcCompleted(prog, les) {
  const videoOk = !les.video_url || prog.video_watched
  const quizOk = !(les.question_ids?.length > 0) || prog.quiz_passed
  const practiceOk = !les.has_practice || prog.practice_submitted
  return videoOk && quizOk && practiceOk
}

/* ── LessonQuiz ────────────────────────────────────────────── */
function LessonQuiz({ questions, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState(null)

  function setAnswer(id, val) {
    setAnswers(prev => ({ ...prev, [id]: val }))
  }

  function handleSubmit() {
    const resultList = questions.map(q => {
      const ans = answers[q.id] || ''
      const correct = checkAnswer(q.type, ans, q.correct_answer)
      return { ...q, userAnswer: ans, correct }
    })
    const correctCount = resultList.filter(r => r.correct).length
    const total = resultList.length
    const passed = total > 0 && correctCount / total >= 2 / 3
    setResults({ list: resultList, correctCount, total, passed })
    setSubmitted(true)
    onSubmit({ correct: correctCount, total, passed })
  }

  function handleRetry() {
    setAnswers({})
    setSubmitted(false)
    setResults(null)
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const result = submitted ? results.list.find(r => r.id === q.id) : null
        const isCorrect = result?.correct
        const opts = Array.isArray(q.options) ? q.options : []
        const optText = (opt) => (opt && typeof opt === 'object') ? opt.text : String(opt)

        return (
          <div
            key={q.id}
            className={`rounded-xl border p-4 ${
              submitted
                ? isCorrect
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-sm font-medium text-gray-800 mb-3">
              <span className="text-gray-500 mr-1">{idx + 1}.</span> {q.question}
            </p>
            {q.image_url && (
              <img src={q.image_url} alt="" className="mb-3 rounded-lg max-h-40 object-contain border" />
            )}

            {/* Answer inputs */}
            {!submitted && (
              <>
                {q.type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 gap-2">
                    {opts.map((opt, oi) => {
                      const label = String.fromCharCode(65 + oi)
                      const val = optText(opt)
                      const selected = answers[q.id] === val
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswer(q.id, val)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm transition ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                              : 'border-gray-200 hover:border-indigo-200'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {label}
                          </span>
                          {val}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="flex gap-3">
                    {['Đúng', 'Sai'].map(val => (
                      <button
                        key={val}
                        onClick={() => setAnswer(q.id, val)}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                          answers[q.id] === val
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                            : 'border-gray-200 hover:border-indigo-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <input
                    value={answers[q.id] || ''}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Nhập đáp án..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}

                {q.type === 'drag_word' && (
                  <DragWordInput q={q} value={answers[q.id] || ''} onChange={val => setAnswer(q.id, val)} />
                )}

                {q.type === 'matching' && (
                  <MatchingInput q={q} value={answers[q.id] || ''} onChange={val => setAnswer(q.id, val)} />
                )}

                {q.type === 'ordering' && (
                  <OrderingInput q={q} value={answers[q.id] || ''} onChange={val => setAnswer(q.id, val)} />
                )}
              </>
            )}

            {/* Result display */}
            {submitted && result && (
              <div className="text-sm">
                {isCorrect ? (
                  <p className="text-green-700 font-medium">✓ {result.userAnswer || '(bỏ qua)'}</p>
                ) : (
                  <div>
                    <p className="text-red-600">✗ Bạn trả lời: <strong>{result.userAnswer || '(bỏ qua)'}</strong></p>
                    <p className="text-green-700 mt-0.5">Đáp án đúng: <strong>{q.correct_answer}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Submit / Result footer */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition"
        >
          <Send size={15} /> Nộp bài tập
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-3">
          <p className="text-2xl font-bold text-gray-800">{results.correctCount}/{results.total}</p>
          <p className="text-sm text-gray-500">câu đúng</p>
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${results.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {results.passed ? 'Đạt ✓ (≥ 2/3 đúng)' : 'Chưa đạt'}
          </span>
          {!results.passed && (
            <div>
              <button
                onClick={handleRetry}
                className="mt-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                Làm lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── LessonPage ────────────────────────────────────────────── */
export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [lesson, setLesson] = useState(null)
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)

  const [quizActive, setQuizActive] = useState(false)

  // Practice form state
  const [practiceText, setPracticeText] = useState('')
  const [practiceFile, setPracticeFile] = useState('')
  const [practiceSubmitting, setPracticeSubmitting] = useState(false)

  // Comment save state
  const [videoMarking, setVideoMarking] = useState(false)

  useEffect(() => {
    if (user) loadAll()
  }, [id, user])

  async function loadAll() {
    setLoading(true)
    // 1. Fetch lesson
    const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', id).single()
    if (!lessonData) { toast.error('Không tìm thấy bài học'); navigate(-1); return }
    setLesson(lessonData)

    // 2. Fetch questions if any
    if (lessonData.question_ids?.length > 0) {
      const { data: qData } = await supabase.from('questions').select('*').in('id', lessonData.question_ids)
      const ordered = lessonData.question_ids.map(qid => qData?.find(q => q.id === qid)).filter(Boolean)
      setQuestions(ordered)
    }

    // 3. Fetch progress
    const { data: progData } = await supabase.from('lesson_progress')
      .select('*').eq('user_id', user.id).eq('lesson_id', id).maybeSingle()
    setProgress(progData || null)

    // 4. Fetch submission (most recent)
    const { data: subData } = await supabase.from('lesson_submissions')
      .select('*').eq('user_id', user.id).eq('lesson_id', id)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle()
    setSubmission(subData || null)

    setLoading(false)
  }

  async function upsertProgress(updates) {
    const current = progress || {}
    const newData = { ...current, ...updates, user_id: user.id, lesson_id: id }
    const completed = calcCompleted(newData, lesson)
    const { data, error } = await supabase.from('lesson_progress').upsert(
      { ...newData, completed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    ).select().single()
    if (!error && data) setProgress(data)
    return { data, error }
  }

  async function handleMarkVideoWatched() {
    setVideoMarking(true)
    const { error } = await upsertProgress({ video_watched: true })
    setVideoMarking(false)
    if (error) toast.error('Có lỗi xảy ra')
    else toast.success('Đã đánh dấu xem video')
  }

  async function handleQuizSubmit({ correct, total, passed }) {
    await upsertProgress({ quiz_correct: correct, quiz_total: total, quiz_passed: passed })
    if (passed) toast.success('Chúc mừng! Bạn đã đạt bài tập')
    else toast('Chưa đạt, hãy thử lại nhé!', { icon: '📖' })
  }

  async function handlePracticeSubmit() {
    if (!practiceText.trim() && !practiceFile) {
      toast.error('Vui lòng nhập mô tả hoặc tải ảnh lên')
      return
    }
    setPracticeSubmitting(true)
    const { data: subInserted, error: subError } = await supabase.from('lesson_submissions').insert({
      user_id: user.id,
      lesson_id: id,
      text_content: practiceText.trim() || null,
      file_url: practiceFile || null,
      submitted_at: new Date().toISOString(),
    }).select().single()

    if (subError) { toast.error('Nộp bài thất bại: ' + subError.message); setPracticeSubmitting(false); return }

    setSubmission(subInserted)
    await upsertProgress({ practice_submitted: true })
    toast.success('Đã nộp bài thực hành')
    setPracticeSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!lesson) return null

  const hasVideo = !!lesson.video_url
  const hasQuiz = questions.length > 0
  const hasPractice = lesson.has_practice
  const embedUrl = getEmbedUrl(lesson.video_url)

  const videoOk = !hasVideo || progress?.video_watched
  const quizOk = !hasQuiz || progress?.quiz_passed
  const practiceOk = !hasPractice || progress?.practice_submitted
  const totalSteps = [hasVideo, hasQuiz, hasPractice].filter(Boolean).length
  const doneSteps = [videoOk && hasVideo, quizOk && hasQuiz, practiceOk && hasPractice].filter(Boolean).length

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/student/learn')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition"
      >
        <ArrowLeft size={16} /> Học tập
      </button>

      {/* Header */}
      <h1 className="text-xl font-bold text-gray-800 mb-1">{lesson.title}</h1>
      {lesson.description && <p className="text-gray-500 text-sm mb-4">{lesson.description}</p>}

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Tiến độ: {doneSteps}/{totalSteps} bước hoàn thành</span>
            {doneSteps === totalSteps && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Hoàn thành ✓</span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: totalSteps > 0 ? `${(doneSteps / totalSteps) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            {hasVideo && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${videoOk ? 'text-green-600' : 'text-gray-400'}`}>
                <PlayCircle size={13} />
                <span>Video {videoOk ? '✓' : '○'}</span>
              </div>
            )}
            {hasQuiz && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${quizOk ? 'text-green-600' : 'text-gray-400'}`}>
                <BookOpen size={13} />
                <span>Bài tập {quizOk ? '✓' : '○'}</span>
              </div>
            )}
            {hasPractice && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${practiceOk ? 'text-green-600' : 'text-gray-400'}`}>
                <Upload size={13} />
                <span>Thực hành {practiceOk ? '✓' : '○'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1 - Video */}
        {hasVideo && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <PlayCircle size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Video bài giảng</h2>
            </div>
            <div className="p-4">
              {embedUrl ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-black mb-3">
                  <iframe
                    src={embedUrl}
                    title="Lesson video"
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="mb-3">
                  <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline text-sm">{lesson.video_url}</a>
                </div>
              )}
              {progress?.video_watched ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
                  <CheckCircle size={15} /> Đã xem ✓
                </span>
              ) : (
                <button
                  onClick={handleMarkVideoWatched}
                  disabled={videoMarking}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {videoMarking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                  Đánh dấu đã xem video
                </button>
              )}
            </div>
          </section>
        )}

        {/* Section 2 - Quiz */}
        {hasQuiz && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Bài tập trắc nghiệm</h2>
              <span className="ml-auto text-xs text-gray-400">{questions.length} câu</span>
            </div>
            <div className="p-4">
              {quizOk && !quizActive ? (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle size={15} /> Đạt ✓
                  </span>
                  <span className="text-sm text-gray-500">
                    {progress?.quiz_correct ?? 0}/{progress?.quiz_total ?? questions.length} câu đúng
                  </span>
                  <button
                    onClick={() => setQuizActive(true)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Làm lại
                  </button>
                </div>
              ) : !quizActive ? (
                <button
                  onClick={() => setQuizActive(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  <BookOpen size={15} /> Bắt đầu làm bài
                </button>
              ) : (
                <LessonQuiz
                  questions={questions}
                  onSubmit={({ correct, total, passed }) => {
                    handleQuizSubmit({ correct, total, passed })
                    if (passed) setQuizActive(false)
                  }}
                />
              )}
            </div>
          </section>
        )}

        {/* Section 3 - Practice submission */}
        {hasPractice && (
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Upload size={16} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Nộp bài thực hành</h2>
            </div>
            <div className="p-4">
              {submission ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle size={15} /> Đã nộp bài
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(submission.submitted_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {submission.text_content && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                      {submission.text_content}
                    </div>
                  )}
                  {submission.file_url && (
                    <img
                      src={submission.file_url}
                      alt="Bài nộp"
                      className="rounded-lg max-h-60 object-contain border border-gray-200"
                    />
                  )}
                  {submission.teacher_comment ? (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-indigo-600 mb-1">Nhận xét của giáo viên:</p>
                      <p className="text-sm text-gray-800">{submission.teacher_comment}</p>
                      {submission.reviewed_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(submission.reviewed_at).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Giáo viên chưa nhận xét</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả / Ghi chú</label>
                    <textarea
                      value={practiceText}
                      onChange={e => setPracticeText(e.target.value)}
                      rows={4}
                      placeholder="Mô tả những gì bạn đã làm..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh chụp màn hình / Minh chứng</label>
                    <ImageUpload value={practiceFile} onChange={setPracticeFile} />
                  </div>
                  <button
                    onClick={handlePracticeSubmit}
                    disabled={practiceSubmitting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {practiceSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Nộp bài
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
