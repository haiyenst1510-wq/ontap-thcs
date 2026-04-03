import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTopics } from '../../hooks/useTopics'
import { ImageUpload } from './QuestionFormModal'
import toast from 'react-hot-toast'
import { Trash2, ChevronDown, ChevronUp, Pencil, X, Loader2 } from 'lucide-react'

const TYPE_LABELS = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền từ',
  matching: 'Nối đôi',
  ordering: 'Sắp xếp',
  drag_word: 'Kéo thả từ',
  word_order: 'Sắp xếp từ',
}

const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }

function QuestionEditModal({ question: q, onClose, onDone }) {
  const { topics } = useTopics()
  const [form, setForm] = useState({
    question: q.question || '',
    image_url: q.image_url || '',
    grade: q.grade || '3',
    topic: q.topic || '',
    difficulty: q.difficulty || 'easy',
    correct_answer: q.correct_answer || '',
    options: q.options ? q.options.map(o => ({ ...o })) : [
      { key: 'A', text: '', image_url: '' }, { key: 'B', text: '', image_url: '' },
      { key: 'C', text: '', image_url: '' }, { key: 'D', text: '', image_url: '' },
    ],
  })
  const [saving, setSaving] = useState(false)

  const topicOptions = topics.filter(t => t.grade === form.grade || t.grade === 'all')

  async function handleSave() {
    if (!form.question.trim()) return
    setSaving(true)
    const payload = {
      question: form.question.trim(),
      image_url: form.image_url || null,
      grade: form.grade,
      topic: form.topic,
      difficulty: form.difficulty,
      correct_answer: form.correct_answer,
    }
    if (q.type === 'multiple_choice') {
      payload.options = form.options
    }
    const { error } = await supabase.from('questions').update(payload).eq('id', q.id)
    setSaving(false)
    if (error) toast.error('Lưu thất bại: ' + error.message)
    else { toast.success('Đã cập nhật'); onDone() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-800">Sửa câu hỏi <span className="text-gray-400 font-normal text-sm">({TYPE_LABELS[q.type]})</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Question text + image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Câu hỏi</label>
            <textarea
              value={form.question}
              onChange={e => setForm({ ...form, question: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="mt-1.5">
              <ImageUpload value={form.image_url} onChange={v => setForm({ ...form, image_url: v })} />
            </div>
          </div>

          {/* Multiple choice options */}
          {q.type === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Các đáp án</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={opt.key}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, correct_answer: opt.key })}
                        className={`w-8 h-8 rounded-full text-sm font-bold shrink-0 border-2 transition ${
                          form.correct_answer === opt.key
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 text-gray-500 hover:border-green-400'
                        }`}
                      >
                        {opt.key}
                      </button>
                      <input
                        value={opt.text}
                        onChange={e => {
                          const opts = [...form.options]
                          opts[i] = { ...opts[i], text: e.target.value }
                          setForm({ ...form, options: opts })
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Đáp án ${opt.key}`}
                      />
                    </div>
                    <div className="pl-10 mt-1">
                      <ImageUpload
                        value={opt.image_url || ''}
                        onChange={v => {
                          const opts = [...form.options]
                          opts[i] = { ...opts[i], image_url: v }
                          setForm({ ...form, options: opts })
                        }}
                        compact
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">Bấm vào chữ cái để chọn đáp án đúng</p>
              </div>
            </div>
          )}

          {/* True/false answer */}
          {q.type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng</label>
              <div className="flex gap-3">
                {['Đúng', 'Sai'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, correct_answer: v })}
                    className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition ${
                      form.correct_answer === v
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-green-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fill blank answer */}
          {q.type === 'fill_blank' && (() => {
            const blankCount = (form.question.match(/___/g) || []).length
            if (blankCount === 0) {
              return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đáp án
                    <span className="ml-2 text-xs font-normal text-gray-400">Dùng <code className="bg-gray-100 px-1 rounded">___</code> trong câu hỏi để tạo nhiều chỗ trống</span>
                  </label>
                  <input
                    value={form.correct_answer}
                    onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập đáp án đúng"
                  />
                </div>
              )
            }
            const answers = form.correct_answer ? form.correct_answer.split(',') : []
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đáp án cho {blankCount} chỗ trống
                </label>
                <div className="space-y-2">
                  {Array.from({ length: blankCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <input
                        value={answers[i] || ''}
                        onChange={e => {
                          const arr = form.correct_answer ? form.correct_answer.split(',') : []
                          while (arr.length < blankCount) arr.push('')
                          arr[i] = e.target.value
                          setForm({ ...form, correct_answer: arr.join(',') })
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Đáp án chỗ trống ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Grade, Topic, Difficulty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
              <select
                value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value, topic: '' })}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="6">Khối 6</option>
                <option value="7">Khối 7</option>
                <option value="8">Khối 8</option>
                <option value="9">Khối 9</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Chủ đề --</option>
                {topicOptions.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
              <select
                value={form.difficulty}
                onChange={e => setForm({ ...form, difficulty: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.question.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuestionCard({ question: q, index, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-gray-400 w-6 shrink-0">{index}</span>
            <span className="text-sm text-gray-800 truncate">{q.question}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[q.type]}</span>
            <span className="text-xs text-gray-400">Khối {q.grade}</span>
            {q.image_url && <span className="text-xs text-green-600">📷</span>}
            <button onClick={e => { e.stopPropagation(); setShowEdit(true) }}
              className="text-gray-400 hover:text-indigo-600 p-1 transition">
              <Pencil size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete() }}
              className="text-red-400 hover:text-red-600 p-1">
              <Trash2 size={14} />
            </button>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
            {q.image_url && <img src={q.image_url} alt="" className="rounded-lg max-h-40 border" />}
            <div className="text-sm font-medium text-gray-700">{q.question}</div>

            {q.type === 'multiple_choice' && (
              <div className="grid grid-cols-2 gap-1.5">
                {q.options?.map(opt => (
                  <div key={opt.key}
                    className={`text-sm px-3 py-1.5 rounded-lg border ${q.correct_answer === opt.key
                      ? 'bg-green-50 border-green-400 text-green-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    {opt.key}. {opt.text}
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div className="flex gap-2">
                {['Đúng', 'Sai'].map(v => (
                  <span key={v} className={`text-sm px-3 py-1 rounded-lg border ${q.correct_answer === v
                    ? 'bg-green-50 border-green-400 text-green-700 font-medium'
                    : 'bg-gray-50 border-gray-200 text-gray-500'}`}>{v}</span>
                ))}
              </div>
            )}

            {q.type === 'fill_blank' && (
              <div className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                Đáp án: <strong>{q.correct_answer}</strong>
              </div>
            )}

            {q.type === 'matching' && (
              <div className="space-y-1">
                {q.options?.map((opt, i) => {
                  const match = q.match_options?.[i]
                  return (
                    <div key={opt.key} className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-indigo-700">
                        {opt.image_url && <img src={opt.image_url} alt="" className="h-8 w-auto mb-0.5 rounded" />}
                        {opt.text}
                      </span>
                      <span className="text-gray-400">↔</span>
                      <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700">
                        {match?.image_url && <img src={match.image_url} alt="" className="h-8 w-auto mb-0.5 rounded" />}
                        {match?.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {q.type === 'ordering' && (
              <div className="space-y-1">
                {q.options?.map((opt, i) => (
                  <div key={opt.key} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-gray-700">{opt.text}</span>
                  </div>
                ))}
              </div>
            )}

            {q.type === 'drag_word' && (
              <div className="space-y-2">
                <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  {q.question.split('___').map((seg, i, arr) => (
                    <span key={i}>
                      {seg}
                      {i < arr.length - 1 && (
                        <span className="inline-block bg-green-100 border border-green-300 text-green-700 text-xs font-bold px-2 py-0.5 rounded mx-1">
                          {q.correct_answer?.split(',')[i] || '___'}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {q.options?.map(opt => (
                    <span key={opt.key} className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-700">{opt.text}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 text-xs text-gray-400 pt-1">
              <span>Chủ đề: {q.topic}</span>
              <span>Mức độ: {DIFFICULTY_LABELS[q.difficulty]}</span>
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <QuestionEditModal
          question={q}
          onClose={() => setShowEdit(false)}
          onDone={() => { setShowEdit(false); onUpdate() }}
        />
      )}
    </>
  )
}
