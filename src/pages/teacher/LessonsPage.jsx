import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useGrades } from '../../hooks/useGrades'
import { useTopics } from '../../hooks/useTopics'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, FileText, X, Loader2, Check,
  ToggleLeft, ToggleRight, RefreshCw, PlayCircle, BookOpen, ClipboardList,
} from 'lucide-react'

const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }
const TYPE_LABELS = {
  multiple_choice: 'Trắc nghiệm', true_false: 'Đúng/Sai', fill_blank: 'Điền từ',
  matching: 'Nối đôi', ordering: 'Sắp xếp', drag_word: 'Kéo thả từ',
}

/* ── LessonFormModal ───────────────────────────────────────── */
function LessonFormModal({ lesson, onClose, onDone }) {
  const { grades: GRADES } = useGrades()
  const { topics: ALL_TOPICS } = useTopics()
  const isEdit = !!lesson
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: lesson?.title || '',
    grade: lesson?.grade || (GRADES[0] || '3'),
    topic: lesson?.topic || '',
    description: lesson?.description || '',
    video_url: lesson?.video_url || '',
    order: lesson?.order ?? 0,
    has_practice: lesson?.has_practice ?? false,
    is_published: lesson?.is_published ?? false,
    question_ids: lesson?.question_ids || [],
  })
  const [questions, setQuestions] = useState([])
  const [filterTopic, setFilterTopic] = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [randomCount, setRandomCount] = useState(10)
  const [saving, setSaving] = useState(false)
  const [loadingQ, setLoadingQ] = useState(false)

  // Sync grade default when GRADES loads
  useEffect(() => {
    if (!isEdit && GRADES.length > 0 && !form.grade) {
      setForm(f => ({ ...f, grade: GRADES[0] }))
    }
  }, [GRADES])

  const filteredTopics = ALL_TOPICS.filter(
    t => !form.grade || t.grade === form.grade || t.grade === 'all'
  )

  useEffect(() => {
    if (step !== 2) return
    setLoadingQ(true)
    let q = supabase.from('questions').select('id, question, type, difficulty, topic').eq('grade', form.grade)
    if (filterTopic) q = q.eq('topic', filterTopic)
    if (filterDiff) q = q.eq('difficulty', filterDiff)
    q.order('created_at', { ascending: false }).then(({ data }) => {
      setQuestions(data || [])
      setLoadingQ(false)
    })
  }, [step, form.grade, filterTopic, filterDiff])

  function toggleQuestion(id) {
    setForm(f => ({
      ...f,
      question_ids: f.question_ids.includes(id)
        ? f.question_ids.filter(x => x !== id)
        : [...f.question_ids, id],
    }))
  }

  function pickRandom() {
    const pool = questions.filter(q => !form.question_ids.includes(q.id))
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, randomCount)
    setForm(f => ({ ...f, question_ids: [...new Set([...f.question_ids, ...picked.map(q => q.id)])] }))
  }

  function clearAll() {
    setForm(f => ({ ...f, question_ids: [] }))
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Nhập tiêu đề bài học'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      grade: form.grade,
      topic: form.topic || null,
      description: form.description.trim() || null,
      video_url: form.video_url.trim() || null,
      order: form.order || 0,
      has_practice: form.has_practice,
      is_published: form.is_published,
      question_ids: form.question_ids,
    }
    const { error } = isEdit
      ? await supabase.from('lessons').update(payload).eq('id', lesson.id)
      : await supabase.from('lessons').insert(payload)
    setSaving(false)
    if (error) toast.error('Lưu thất bại: ' + error.message)
    else { toast.success(isEdit ? 'Đã cập nhật bài học' : 'Đã tạo bài học'); onDone() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">{isEdit ? 'Sửa bài học' : 'Tạo bài học mới'}</h2>
            <div className="flex gap-2 mt-1.5">
              {[1, 2].map(s => (
                <button key={s}
                  onClick={() => { if (s === 2 && !form.title.trim()) return; setStep(s) }}
                  className={`text-xs px-3 py-0.5 rounded-full font-medium transition ${step === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {s === 1 ? '1. Thông tin' : `2. Câu hỏi${form.question_ids.length > 0 ? ` (${form.question_ids.length})` : ''}`}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: Bài 1 - Giới thiệu về máy tính"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                  <select
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value, topic: '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
                  <select
                    value={form.topic}
                    onChange={e => setForm({ ...form, topic: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Không chọn --</option>
                    {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Mô tả ngắn về nội dung bài học..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Video <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
                <input
                  value={form.video_url}
                  onChange={e => setForm({ ...form, video_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, has_practice: !form.has_practice })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${form.has_practice ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.has_practice ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">Có bài nộp thực hành</span>
              </div>
            </div>
          ) : (
            <div>
              {/* Filters + random */}
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <select
                  value={filterTopic}
                  onChange={e => setFilterTopic(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Tất cả chủ đề</option>
                  {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <select
                  value={filterDiff}
                  onChange={e => setFilterDiff(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Tất cả mức độ</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="number" min={1} max={50} value={randomCount}
                    onChange={e => setRandomCount(Number(e.target.value))}
                    className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={pickRandom}
                    className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    <RefreshCw size={13} /> Ngẫu nhiên
                  </button>
                  {form.question_ids.length > 0 && (
                    <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5">Bỏ tất cả</button>
                  )}
                </div>
              </div>

              {loadingQ ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Không có câu hỏi nào cho khối {form.grade}</div>
              ) : (
                <div className="space-y-1.5">
                  {questions.map(q => {
                    const checked = form.question_ids.includes(q.id)
                    return (
                      <button
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${checked ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 bg-white'}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {checked && <Check size={11} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 line-clamp-2">{q.question}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{TYPE_LABELS[q.type]}</span>
                            <span className="text-xs text-gray-400">{DIFFICULTY_LABELS[q.difficulty]}</span>
                            {q.topic && <span className="text-xs text-gray-400">{q.topic}</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          {step === 2
            ? <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Quay lại</button>
            : <span />
          }
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
            {step === 1 ? (
              <button
                onClick={() => { if (!form.title.trim()) { toast.error('Nhập tiêu đề bài học'); return } setStep(2) }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? 'Lưu thay đổi' : 'Tạo bài học'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── LessonsPage ───────────────────────────────────────────── */
export default function LessonsPage() {
  const navigate = useNavigate()
  const { grades: GRADES } = useGrades()
  const { topics: ALL_TOPICS } = useTopics()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editLesson, setEditLesson] = useState(null)

  useEffect(() => { fetchLessons() }, [])

  async function fetchLessons() {
    setLoading(true)
    const { data } = await supabase.from('lessons').select('*').order('order', { ascending: true }).order('created_at', { ascending: false })
    setLessons(data || [])
    setLoading(false)
  }

  const filteredTopicsForFilter = ALL_TOPICS.filter(
    t => !filterGrade || t.grade === filterGrade || t.grade === 'all'
  )

  const displayedLessons = lessons.filter(l => {
    if (filterGrade && l.grade !== filterGrade) return false
    if (filterTopic && l.topic !== filterTopic) return false
    return true
  })

  async function handleDelete(id, title) {
    if (!confirm(`Xóa bài học "${title}"?`)) return
    const { error } = await supabase.from('lessons').delete().eq('id', id)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa bài học'); fetchLessons() }
  }

  async function handleTogglePublish(lesson) {
    const { error } = await supabase.from('lessons').update({ is_published: !lesson.is_published }).eq('id', lesson.id)
    if (error) toast.error('Cập nhật thất bại')
    else fetchLessons()
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Bài học</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> Tạo bài học
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filterGrade}
          onChange={e => { setFilterGrade(e.target.value); setFilterTopic('') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả khối</option>
          {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
        <select
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả chủ đề</option>
          {filteredTopicsForFilter.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : displayedLessons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Chưa có bài học nào</p>
          <p className="text-sm mt-1">Bấm "Tạo bài học" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedLessons.map(lesson => (
            <div key={lesson.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{lesson.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lesson.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {lesson.is_published ? 'Đã xuất bản' : 'Nháp'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap items-center">
                  <span>Khối {lesson.grade}</span>
                  {lesson.topic && <span>· {lesson.topic}</span>}
                  <span>· {lesson.question_ids?.length || 0} câu hỏi</span>
                  {lesson.video_url && (
                    <span className="flex items-center gap-0.5 text-blue-500">
                      <PlayCircle size={11} /> Video
                    </span>
                  )}
                  {lesson.has_practice && (
                    <span className="flex items-center gap-0.5 text-orange-500">
                      <ClipboardList size={11} /> Thực hành
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTogglePublish(lesson)}
                  title={lesson.is_published ? 'Ẩn bài học' : 'Xuất bản'}
                  className={`p-2 rounded-lg transition ${lesson.is_published ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  {lesson.is_published ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => navigate(`/teacher/lessons/${lesson.id}/submissions`)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition"
                  title="Xem bài nộp"
                >
                  <FileText size={16} />
                </button>
                <button
                  onClick={() => setEditLesson(lesson)}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition"
                  title="Sửa bài học"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(lesson.id, lesson.title)}
                  className="p-2 text-red-400 hover:text-red-600 transition"
                  title="Xóa bài học"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editLesson) && (
        <LessonFormModal
          lesson={editLesson}
          onClose={() => { setShowCreate(false); setEditLesson(null) }}
          onDone={() => { setShowCreate(false); setEditLesson(null); fetchLessons() }}
        />
      )}
    </div>
  )
}
