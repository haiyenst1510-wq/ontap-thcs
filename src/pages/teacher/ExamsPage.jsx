import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useGrades } from '../../hooks/useGrades'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, BarChart2, Clock, X, Loader2, Check,
  ToggleLeft, ToggleRight, Eye, RefreshCw,
} from 'lucide-react'
const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }
const TYPE_LABELS = { multiple_choice: 'Trắc nghiệm', true_false: 'Đúng/Sai', fill_blank: 'Điền từ', matching: 'Nối đôi', ordering: 'Sắp xếp', drag_word: 'Kéo thả từ' }

/* ── ExamFormModal ─────────────────────────────────────────── */
function ExamFormModal({ exam, onClose, onDone }) {
  const { grades: GRADES } = useGrades()
  const isEdit = !!exam
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: exam?.title || '',
    grade: exam?.grade || '3',
    class_names: exam?.class_names || [],
    time_limit: exam?.time_limit ?? 30,
    max_attempts: exam?.max_attempts ?? 1,
    is_active: exam?.is_active ?? false,
    show_answer: exam?.show_answer ?? true,
    show_score: exam?.show_score ?? true,
    question_ids: exam?.question_ids || [],
  })
  const [classes, setClasses] = useState([])
  const [questions, setQuestions] = useState([])
  const [topics, setTopics] = useState([])
  const [filterTopic, setFilterTopic] = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [randomCount, setRandomCount] = useState(10)
  const [saving, setSaving] = useState(false)
  const [loadingQ, setLoadingQ] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('name').eq('grade', form.grade).order('name')
      .then(({ data }) => setClasses(data?.map(c => c.name) || []))
  }, [form.grade])

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
    supabase.from('topics').select('name').or(`grade.eq.${form.grade},grade.eq.all`).order('name')
      .then(({ data }) => setTopics(data?.map(t => t.name) || []))
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
    if (!form.title.trim()) { toast.error('Nhập tên đề thi'); return }
    if (form.question_ids.length === 0) { toast.error('Chưa chọn câu hỏi nào'); return }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      grade: form.grade,
      class_names: form.class_names.length > 0 ? form.class_names : null,
      time_limit: form.time_limit || null,
      max_attempts: form.max_attempts,
      is_active: form.is_active,
      show_answer: form.show_answer,
      show_score: form.show_score,
      question_ids: form.question_ids,
    }
    const { error } = isEdit
      ? await supabase.from('exams').update(payload).eq('id', exam.id)
      : await supabase.from('exams').insert(payload)
    setSaving(false)
    if (error) toast.error('Lưu thất bại: ' + error.message)
    else { toast.success(isEdit ? 'Đã cập nhật' : 'Đã tạo đề thi'); onDone() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">{isEdit ? 'Sửa đề thi' : 'Tạo đề thi mới'}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề thi</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: Kiểm tra giữa kỳ Tin học khối 3" autoFocus />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                <select value={form.grade}
                  onChange={e => setForm({ ...form, grade: e.target.value, class_names: [] })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Lớp <span className="text-gray-400 font-normal">(tuỳ chọn — không chọn = tất cả lớp)</span>
                  </label>
                  {form.class_names.length > 0 && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, class_names: [] }))}
                      className="text-xs text-gray-400 hover:text-gray-600">Bỏ chọn</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {classes.map(c => {
                    const selected = form.class_names.includes(c)
                    return (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          class_names: selected
                            ? f.class_names.filter(x => x !== c)
                            : [...f.class_names, c],
                        }))}
                        className={`px-3 py-1 rounded-full text-sm border-2 transition font-medium ${
                          selected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                  {classes.length === 0 && (
                    <p className="text-xs text-gray-400">Chưa có lớp nào cho khối {form.grade}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                  <input type="number" min={0} value={form.time_limit}
                    onChange={e => setForm({ ...form, time_limit: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-gray-400 mt-0.5">0 = không giới hạn</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lần làm</label>
                  <input type="number" min={0} value={form.max_attempts}
                    onChange={e => setForm({ ...form, max_attempts: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-gray-400 mt-0.5">0 = không giới hạn</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">
                  {form.is_active ? <span className="text-green-600 font-medium">Đang mở</span> : <span className="text-gray-500">Đang tắt</span>}
                  <span className="text-gray-400 text-xs ml-1">(học sinh {form.is_active ? 'thấy' : 'không thấy'})</span>
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sau khi làm bài</p>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setForm({ ...form, show_answer: !form.show_answer })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${form.show_answer ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.show_answer ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">
                    Hiện đáp án đúng/sai sau mỗi câu
                    <span className="text-gray-400 text-xs ml-1">(tắt = chế độ thi nghiêm túc)</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setForm({ ...form, show_score: !form.show_score })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${form.show_score ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.show_score ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">
                    Hiện điểm và kết quả sau khi nộp
                    <span className="text-gray-400 text-xs ml-1">(tắt = học sinh chỉ thấy "Đã nộp bài")</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Filters + random */}
              <div className="flex gap-2 mb-4 flex-wrap items-center">
                <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Tất cả chủ đề</option>
                  {topics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Tất cả mức độ</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min={1} max={50} value={randomCount}
                    onChange={e => setRandomCount(Number(e.target.value))}
                    className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={pickRandom}
                    className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition">
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
                      <button key={q.id} onClick={() => toggleQuestion(q.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition ${checked ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 bg-white'}`}>
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
              <button onClick={() => { if (!form.title.trim()) { toast.error('Nhập tên đề'); return } setStep(2) }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
                Tiếp theo →
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving || form.question_ids.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? 'Lưu thay đổi' : 'Tạo đề thi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ExamResultsModal ─────────────────────────────────────── */
function ExamResultsModal({ exam, onClose }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    supabase.from('exam_sessions')
      .select('*, profiles(full_name, class_name)')
      .eq('exam_id', exam.id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [exam.id])

  async function viewDetail(session) {
    setDetailLoading(true)
    const { data } = await supabase.from('questions')
      .select('id, question, correct_answer, type')
      .in('id', exam.question_ids)
    const ordered = exam.question_ids.map(id => data?.find(q => q.id === id)).filter(Boolean)
    setDetail({ session, questions: ordered })
    setDetailLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">Kết quả: {exam.title}</h2>
            {detail && (
              <button onClick={() => setDetail(null)} className="text-xs text-indigo-600 hover:underline mt-0.5 block">
                ← Danh sách học sinh
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">{detail.session.profiles?.full_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Lớp {detail.session.profiles?.class_name} · Lần {detail.session.attempt_number} ·
                  Điểm: <strong className="text-indigo-700">{detail.session.score}</strong> ·
                  {detail.session.correct}/{detail.session.total} câu đúng
                </p>
              </div>
              {detail.questions.map((q, i) => {
                const ans = detail.session.answers?.[i]
                const isOk = ans?.toLowerCase() === q.correct_answer?.toLowerCase()
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
          ) : loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có học sinh nào nộp bài</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const percent = Math.round((s.correct / s.total) * 100)
                const date = new Date(s.submitted_at).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })
                return (
                  <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{s.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{s.profiles?.class_name} · {date} · Lần {s.attempt_number}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{s.score}</p>
                      <p className="text-xs text-gray-400">{s.correct}/{s.total} câu</p>
                    </div>
                    <button onClick={() => viewDetail(s)} className="p-2 text-gray-400 hover:text-indigo-600 transition">
                      <Eye size={16} />
                    </button>
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

/* ── ExamsPage ────────────────────────────────────────────── */
export default function ExamsPage() {
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editExam, setEditExam] = useState(null)

  useEffect(() => { fetchExams() }, [])

  async function fetchExams() {
    setLoading(true)
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
    setExams(data || [])
    setLoading(false)
  }

  async function handleDelete(id, title) {
    if (!confirm(`Xóa đề thi "${title}"?`)) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa'); fetchExams() }
  }

  async function handleToggle(exam) {
    const { error } = await supabase.from('exams').update({ is_active: !exam.is_active }).eq('id', exam.id)
    if (error) toast.error('Cập nhật thất bại')
    else fetchExams()
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Đề thi</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Tạo đề thi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Chưa có đề thi nào</p>
          <p className="text-sm mt-1">Bấm "Tạo đề thi" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{exam.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exam.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {exam.is_active ? 'Đang mở' : 'Tắt'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                  <span>Khối {exam.grade}</span>
                  {exam.class_names?.length > 0 && <span>· Lớp {exam.class_names.join(', ')}</span>}
                  <span>· {exam.question_ids?.length || 0} câu</span>
                  <span>· {exam.time_limit ? `${exam.time_limit} phút` : 'Không giới hạn giờ'}</span>
                  <span>· {exam.max_attempts === 0 ? 'Không giới hạn lần' : `${exam.max_attempts} lần làm`}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(exam)} title={exam.is_active ? 'Tắt đề' : 'Mở đề'}
                  className={`p-2 rounded-lg transition ${exam.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                  {exam.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => navigate(`/teacher/exams/${exam.id}/results`)} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Thống kê kết quả">
                  <BarChart2 size={16} />
                </button>
                <button onClick={() => setEditExam(exam)} className="p-2 text-gray-400 hover:text-indigo-600 transition">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(exam.id, exam.title)} className="p-2 text-red-400 hover:text-red-600 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editExam) && (
        <ExamFormModal
          exam={editExam}
          onClose={() => { setShowCreate(false); setEditExam(null) }}
          onDone={() => { setShowCreate(false); setEditExam(null); fetchExams() }}
        />
      )}
    </div>
  )
}
