import { useState } from 'react'
import { parseQuestions } from '../../utils/questionParser'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/cloudinary'
import toast from 'react-hot-toast'
import { X, ChevronRight, Save, ImagePlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const FORMAT_GUIDE = [
  {
    type: 'Trắc nghiệm',
    color: 'bg-indigo-50 border-indigo-200',
    labelColor: 'text-indigo-700 bg-indigo-100',
    example: `Câu 1: Thiết bị nào dùng để nhập dữ liệu?
A. Màn hình
B. Bàn phím
C. Loa
D. Máy in
Đáp án: B`,
  },
  {
    type: 'Đúng / Sai',
    color: 'bg-green-50 border-green-200',
    labelColor: 'text-green-700 bg-green-100',
    example: `Câu 2: Chuột máy tính là thiết bị xuất. Đúng hay sai?
Đáp án: Sai`,
  },
  {
    type: 'Điền từ',
    color: 'bg-yellow-50 border-yellow-200',
    labelColor: 'text-yellow-700 bg-yellow-100',
    example: `Câu 3: Thủ đô của Việt Nam là ___
Đáp án: Hà Nội

(Nhiều chỗ trống: dùng ___ và đáp án phân cách bằng dấu phẩy)
Câu 4: ___ là thủ đô, ___ là thành phố lớn nhất
Đáp án: Hà Nội,Hồ Chí Minh`,
  },
  {
    type: 'Sắp xếp thứ tự',
    color: 'bg-orange-50 border-orange-200',
    labelColor: 'text-orange-700 bg-orange-100',
    example: `Câu 5: Sắp xếp các bước khởi động máy tính theo đúng thứ tự
A. Nhấn nút nguồn
B. BIOS kiểm tra phần cứng
C. Windows khởi động
D. Đăng nhập vào hệ thống
Đáp án: A,B,C,D

(Đáp án là thứ tự đúng của các chữ cái, phân cách bằng dấu phẩy)`,
  },
  {
    type: 'Kéo thả từ',
    color: 'bg-red-50 border-red-200',
    labelColor: 'text-red-700 bg-red-100',
    example: `Câu 6: The ___ is the brain of the computer.
A. CPU
B. RAM
C. ROM
D. GPU
Đáp án: CPU

(Question phải có ___ — đáp án là từ/cụm từ đúng cần điền)`,
  },
  {
    type: 'Sắp xếp từ',
    color: 'bg-purple-50 border-purple-200',
    labelColor: 'text-purple-700 bg-purple-100',
    example: `Câu 7: Sắp xếp các từ sau thành câu hoàn chỉnh
A. She
B. is
C. a
D. beautiful
E. teacher
Đáp án: She is a beautiful teacher

(Đáp án là cả câu hoàn chỉnh — mỗi option là 1 từ hoặc cụm từ)`,
  },
  {
    type: 'Nối đôi',
    color: 'bg-teal-50 border-teal-200',
    labelColor: 'text-teal-700 bg-teal-100',
    example: `Câu 8: Nối khái niệm với định nghĩa phù hợp
A. CPU
B. RAM
C. ROM
>1. Bộ nhớ chỉ đọc, lưu trữ lâu dài
>2. Bộ xử lý trung tâm của máy tính
>3. Bộ nhớ tạm thời khi máy hoạt động
Đáp án: A-2,B-3,C-1

(Cột trái: A/B/C — Cột phải: >1. >2. >3. — Đáp án: A-số,B-số,C-số)`,
  },
]

const QUESTION_TYPES = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền từ',
  matching: 'Nối đôi',
  ordering: 'Sắp xếp',
  drag_word: 'Kéo thả từ',
  word_order: 'Sắp xếp từ',
}

export default function QuestionImportModal({ onClose, onSaved, grades, topics }) {
  const [step, setStep] = useState(1) // 1: paste, 2: preview & edit
  const [rawText, setRawText] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [parsed, setParsed] = useState([])
  const firstTopic = topics.find(t => t.grade === grades[0])?.name || ''
  const [meta, setMeta] = useState({ grade: grades[0], topic: firstTopic, difficulty: 'easy' })
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

  function updateMatchOption(qIndex, optIndex, value) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const match_options = [...(q.match_options || [])]
      match_options[optIndex] = { ...match_options[optIndex], text: value }
      return { ...q, match_options }
    }))
  }

  function addMatchOption(qIndex) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const match_options = [...(q.match_options || [])]
      const nextKey = String(match_options.length + 1)
      match_options.push({ key: nextKey, text: '' })
      return { ...q, match_options }
    }))
  }

  function removeMatchOption(qIndex, optIndex) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const match_options = (q.match_options || []).filter((_, idx) => idx !== optIndex)
        .map((o, idx) => ({ ...o, key: String(idx + 1) }))
      return { ...q, match_options }
    }))
  }

  function addOption(qIndex) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const options = [...q.options]
      const nextKey = String.fromCharCode(65 + options.length)
      options.push({ key: nextKey, text: '' })
      return { ...q, options }
    }))
  }

  function removeOption(qIndex, optIndex) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIndex) return q
      const options = q.options.filter((_, idx) => idx !== optIndex)
        .map((o, idx) => ({ ...o, key: String.fromCharCode(65 + idx) }))
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
        match_options: q.match_options?.length > 0 ? q.match_options : null,
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
                  <select value={meta.grade} onChange={e => {
                    const g = e.target.value
                    const first = topics.find(t => t.grade === g)?.name || ''
                    setMeta({ ...meta, grade: g, topic: first })
                  }}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Chủ đề</label>
                  <select value={meta.topic} onChange={e => setMeta({ ...meta, topic: e.target.value })}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {topics.filter(t => t.grade === meta.grade).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
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

              {/* Hướng dẫn định dạng */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowGuide(g => !g)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-sm font-medium text-gray-700"
                >
                  <span>📋 Hướng dẫn định dạng cho từng dạng câu hỏi</span>
                  {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showGuide && (
                  <div className="p-4 grid grid-cols-1 gap-3">
                    {FORMAT_GUIDE.map(g => (
                      <div key={g.type} className={`rounded-lg border p-3 ${g.color}`}>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.labelColor}`}>
                          {g.type}
                        </span>
                        <pre className="mt-2 text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                          {g.example}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
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
                  placeholder={`Ví dụ:\nCâu 1: Thiết bị nào dùng để nhập?\nA. Màn hình  B. Bàn phím  C. Loa  D. Máy in\nĐáp án: B\n\nCâu 2: Chuột là thiết bị xuất. Đúng hay sai?\nĐáp án: Sai\n\nCâu 3: Thủ đô của Việt Nam là ___\nĐáp án: Hà Nội\n\nCâu 4: Sắp xếp theo thứ tự đúng\nA. Bật nguồn  B. BIOS khởi động  C. Vào Windows\nĐáp án: A,B,C\n\nCâu 5: The ___ is the brain of the computer.\nA. CPU  B. RAM  C. ROM  D. GPU\nĐáp án: CPU\n\nCâu 6: Sắp xếp thành câu\nA. She  B. is  C. a  D. teacher\nĐáp án: She is a teacher\n\nCâu 7: Nối đôi\nA. CPU  B. RAM  C. ROM\n>1. Bộ nhớ chỉ đọc  >2. Bộ xử lý  >3. Bộ nhớ tạm\nĐáp án: A-2,B-3,C-1`}
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

                  {/* Trắc nghiệm */}
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
                          <button onClick={() => removeOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-gray-400">Bấm chữ cái để chọn đáp án đúng</p>
                        <button onClick={() => addOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm đáp án</button>
                      </div>
                    </div>
                  )}

                  {/* Đúng/Sai */}
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

                  {/* Điền từ */}
                  {q.type === 'fill_blank' && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Đáp án (nhiều chỗ trống dùng dấu phẩy: Hà Nội,Việt Nam)</label>
                      <input
                        value={q.correct_answer || ''}
                        onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                      />
                    </div>
                  )}

                  {/* Sắp xếp thứ tự */}
                  {q.type === 'ordering' && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500">Các mục (thứ tự hiển thị theo đây — hệ thống sẽ xáo trộn khi học sinh làm):</p>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{opt.key}</span>
                          <input
                            value={opt.text}
                            onChange={e => updateOption(i, oi, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <button onClick={() => removeOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button onClick={() => addOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm mục</button>
                      <div className="pt-1">
                        <label className="text-xs text-gray-500 block mb-1">Thứ tự đúng (vd: A,C,B,D)</label>
                        <input
                          value={q.correct_answer || ''}
                          onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                          placeholder="A,B,C,D"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sắp xếp từ thành câu */}
                  {q.type === 'word_order' && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500">Các từ (mỗi option là 1 từ hoặc cụm từ):</p>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{opt.key}</span>
                          <input
                            value={opt.text}
                            onChange={e => updateOption(i, oi, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <button onClick={() => removeOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button onClick={() => addOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm từ</button>
                      <div className="pt-1">
                        <label className="text-xs text-gray-500 block mb-1">Câu đúng hoàn chỉnh</label>
                        <input
                          value={q.correct_answer || ''}
                          onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                          placeholder="She is a beautiful teacher"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Kéo thả từ */}
                  {q.type === 'drag_word' && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500">Ngân hàng từ (bao gồm cả từ đúng và từ nhiễu):</p>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{opt.key}</span>
                          <input
                            value={opt.text}
                            onChange={e => updateOption(i, oi, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                          <button onClick={() => removeOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button onClick={() => addOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm từ</button>
                      <div className="pt-1">
                        <label className="text-xs text-gray-500 block mb-1">Đáp án đúng (nhiều chỗ trống dùng dấu phẩy: CPU,RAM)</label>
                        <input
                          value={q.correct_answer || ''}
                          onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                          placeholder="CPU"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Nối đôi */}
                  {q.type === 'matching' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1 font-medium">Cột trái</p>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1 mb-1">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{opt.key}</span>
                              <input
                                value={opt.text}
                                onChange={e => updateOption(i, oi, e.target.value)}
                                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <button onClick={() => removeOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={11} /></button>
                            </div>
                          ))}
                          <button onClick={() => addOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm</button>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1 font-medium">Cột phải</p>
                          {(q.match_options || []).map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1 mb-1">
                              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{opt.key}</span>
                              <input
                                value={opt.text}
                                onChange={e => updateMatchOption(i, oi, e.target.value)}
                                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <button onClick={() => removeMatchOption(i, oi)} className="text-red-300 hover:text-red-500"><Trash2 size={11} /></button>
                            </div>
                          ))}
                          <button onClick={() => addMatchOption(i)} className="text-xs text-indigo-500 hover:underline">+ Thêm</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Đáp án nối đôi (vd: A-2,B-1,C-3)</label>
                        <input
                          value={q.correct_answer || ''}
                          onChange={e => updateQuestion(i, 'correct_answer', e.target.value)}
                          placeholder="A-2,B-3,C-1"
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Chọn dạng câu hỏi */}
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
