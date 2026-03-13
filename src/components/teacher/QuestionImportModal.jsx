import { useState } from 'react'
import { parseQuestions } from '../../utils/questionParser'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/cloudinary'
import toast from 'react-hot-toast'
import { X, ChevronRight, Save, ImagePlus, Trash2 } from 'lucide-react'

const QUESTION_TYPES = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền từ',
}

export default function QuestionImportModal({ onClose, onSaved, grades, topics }) {
  const [step, setStep] = useState(1) // 1: paste, 2: preview & edit
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState([])
  const [meta, setMeta] = useState({ grade: grades[0], topic: topics[0], difficulty: 'easy' })
  const [saving, setSaving] = useState(false)

  function handleParse() {
    const result = parseQuestions(rawText)
    if (result.length === 0) {
      toast.error('Không nhận dạng được câu hỏi. Kiểm tra lại định dạng.')
      return
    }
    setParsed(result)
    setStep(2)
  }

  function updateQuestion(index, field, value) {
    setParsed(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  function updateOption(qIndex, optIndex, value) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const options = [...q.options]
      options[optIndex] = { ...options[optIndex], text: value }
      return { ...q, options }
    }))
  }

  function removeQuestion(index) {
    setParsed(prev => prev.filter((_, i) => i !== index))
  }

  async function handleImageUpload(index, file) {
    const toastId = toast.loading('Đang upload ảnh...')
    try {
      const url = await uploadImage(file)
      updateQuestion(index, 'image_url', url)
      toast.success('Upload ảnh thành công', { id: toastId })
    } catch {
      toast.error('Upload ảnh thất bại', { id: toastId })
    }
  }

  async function handleSave() {
    if (parsed.length === 0) { toast.error('Không có câu hỏi nào để lưu'); return }
    setSaving(true)
    try {
      const rows = parsed.map(q => ({
        question: q.question,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        image_url: q.image_url,
        grade: meta.grade,
        topic: meta.topic,
        difficulty: meta.difficulty,
      }))
      const { error } = await supabase.from('questions').insert(rows)
      if (error) throw error
      toast.success(`Đã lưu ${rows.length} câu hỏi`)
      onSaved()
    } catch (err) {
      toast.error('Lưu thất bại: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {step === 1 ? 'Paste câu hỏi từ Word' : `Preview — ${parsed.length} câu hỏi`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Khối</label>
                  <select value={meta.grade} onChange={e => setMeta({ ...meta, grade: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Chủ đề</label>
                  <select value={meta.topic} onChange={e => setMeta({ ...meta, topic: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Mức độ</label>
                  <select value={meta.difficulty} onChange={e => setMeta({ ...meta, difficulty: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              {/* Paste area */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Dán nội dung từ Word vào đây
                </label>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={14}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={`Ví dụ:\nCâu 1: Thiết bị nào dùng để nhập dữ liệu?\nA. Màn hình\nB. Bàn phím\nC. Loa\nD. Máy in\nĐáp án: B\n\nCâu 2: Chuột là thiết bị xuất. Đúng hay sai?\nĐáp án: Sai`}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {parsed.map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      Câu {i + 1} — {QUESTION_TYPES[q.type] || q.type}
                    </span>
                    <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Question text */}
                  <textarea
                    value={q.question}
                    onChange={e => updateQuestion(i, 'question', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />

                  {/* Image */}
                  <div className="flex items-center gap-3">
                    {q.image_url ? (
                      <div className="flex items-center gap-2">
                        <img src={q.image_url} alt="" className="h-16 rounded border" />
                        <button onClick={() => updateQuestion(i, 'image_url', null)}
                          className="text-xs text-red-500 hover:underline">Xóa ảnh</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-indigo-600 cursor-pointer hover:underline">
                        <ImagePlus size={14} /> Thêm ảnh
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files[0] && handleImageUpload(i, e.target.files[0])} />
                      </label>
                    )}
                  </div>

                  {/* Options for multiple choice */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuestion(i, 'correct_answer', opt.key)}
                            className={`w-7 h-7 rounded-full text-xs font-bold border-2 flex-shrink-0 transition
                              ${q.correct_answer === opt.key
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 text-gray-500 hover:border-indigo-400'}`}
                          >
                            {opt.key}
                          </button>
                          <input
                            value={opt.text}
                            onChange={e => updateOption(i, oi, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-gray-400">Bấm vào chữ cái để chọn đáp án đúng</p>
                    </div>
                  )}

                  {/* True/False */}
                  {q.type === 'true_false' && (
                    <div className="flex gap-2">
                      {['Đúng', 'Sai'].map(val => (
                        <button key={val}
                          onClick={() => updateQuestion(i, 'correct_answer', val)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition
                            ${q.correct_answer === val
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fill blank */}
                  {q.type === 'fill_blank' && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Đáp án</label>
                      <input
                        value={q.correct_answer || ''}
                        onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                      />
                    </div>
                  )}

                  {/* Type selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Dạng:</label>
                    <select
                      value={q.type}
                      onChange={e => updateQuestion(i, 'type', e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={step === 2 ? () => setStep(1) : onClose}
            className="text-sm text-gray-500 hover:text-gray-700">
            {step === 2 ? '← Quay lại' : 'Hủy'}
          </button>
          {step === 1 ? (
            <button onClick={handleParse} disabled={!rawText.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              Phân tích câu hỏi <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || parsed.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              <Save size={16} /> {saving ? 'Đang lưu...' : `Lưu ${parsed.length} câu hỏi`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
