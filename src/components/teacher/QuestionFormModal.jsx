import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTopics } from '../../hooks/useTopics'
import { useSubjects } from '../../hooks/useSubjects'
import toast from 'react-hot-toast'
import { X, Plus, Trash2, Loader2, Image } from 'lucide-react'

const TYPES = [
  { value: 'multiple_choice', label: 'Trắc nghiệm' },
  { value: 'true_false', label: 'Đúng / Sai' },
  { value: 'fill_blank', label: 'Điền từ' },
  { value: 'matching', label: 'Nối đôi' },
  { value: 'ordering', label: 'Sắp xếp' },
  { value: 'drag_word', label: 'Kéo thả từ' },
  { value: 'word_order', label: 'Sắp xếp từ' }, // dạng mới: ghép từ thành câu (tiếng Anh)
]

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function ImageUpload({ value, onChange, compact = false }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh tối đa 5MB'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) { toast.error('Tải ảnh lên thất bại'); return }
      onChange(json.secure_url)
    } catch { toast.error('Tải ảnh lên thất bại') }
    finally { setUploading(false) }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {value && <img src={value} alt="" className="h-14 rounded-lg border object-cover" />}
      <label className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
        <Image size={12} />
        {uploading ? 'Đang tải...' : value ? 'Đổi' : compact ? 'Ảnh' : 'Thêm ảnh'}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-xs text-red-400 hover:text-red-600">Xóa</button>
      )}
    </div>
  )
}

// Component upload âm thanh — dùng Cloudinary giống ImageUpload
// Hỗ trợ mp3, wav, ogg, tối đa 10MB
export function AudioUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File âm thanh tối đa 10MB'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    // Cloudinary: upload vào resource_type 'video' vì audio thuộc nhóm này
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) { toast.error('Tải âm thanh lên thất bại'); return }
      onChange(json.secure_url)
    } catch { toast.error('Tải âm thanh lên thất bại') }
    finally { setUploading(false) }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Hiển thị trình phát audio nếu đã có file */}
      {value && (
        <audio controls src={value} className="h-8 max-w-48 rounded" />
      )}
      <label className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
        🔊 {uploading ? 'Đang tải...' : value ? 'Đổi audio' : 'Thêm audio'}
        <input type="file" accept="audio/*" onChange={handleFile} disabled={uploading} className="hidden" />
      </label>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-xs text-red-400 hover:text-red-600">Xóa</button>
      )}
    </div>
  )
}

export default function QuestionFormModal({ onClose, onDone, defaultSubjectId }) {
  const { topics } = useTopics()
  const { subjects } = useSubjects()
  const [form, setForm] = useState({
    type: 'multiple_choice',
    question: '',
    grade: '6',
    subject_id: defaultSubjectId || '',
    topic: '',
    difficulty: 'easy',
    image_url: '',
    audio_url: '',  // URL file âm thanh đính kèm câu hỏi
    options: [
      { key: 'A', text: '', image_url: '' },
      { key: 'B', text: '', image_url: '' },
      { key: 'C', text: '', image_url: '' },
      { key: 'D', text: '', image_url: '' },
    ],
    correct_answer: '',
    pairs: [
      { left: '', leftImage: '', right: '', rightImage: '' },
      { left: '', leftImage: '', right: '', rightImage: '' },
    ],
    items: ['', '', ''],
    drag_answers: [''],
    drag_distractors: ['', ''],
  })
  const [saving, setSaving] = useState(false)

  const topicOptions = topics.filter(t =>
    (t.grade === form.grade || t.grade === 'all') &&
    (!form.subject_id || t.subject_id === form.subject_id)
  )
  const blankCount = (form.question.match(/___/g) || []).length

  function buildPayload() {
    switch (form.type) {
      case 'multiple_choice': {
        const validOpts = form.options.filter(o => o.text.trim())
        if (validOpts.length < 2) { toast.error('Cần ít nhất 2 đáp án'); return null }
        if (!form.correct_answer) { toast.error('Chọn đáp án đúng'); return null }
        return { options: validOpts, correct_answer: form.correct_answer }
      }
      case 'true_false':
        if (!form.correct_answer) { toast.error('Chọn đáp án đúng'); return null }
        return { correct_answer: form.correct_answer }
      case 'fill_blank': {
        if (blankCount === 0) { toast.error('Câu hỏi cần có ít nhất 1 chỗ trống ___'); return null }
        const correctWords = form.drag_answers.slice(0, blankCount).map(w => w.trim())
        if (correctWords.some(w => !w)) { toast.error(`Nhập đủ ${blankCount} đáp án cho các chỗ trống`); return null }
        return { correct_answer: correctWords.join(',') }
      }
      case 'matching': {
        const vp = form.pairs.filter(p => p.left.trim() && p.right.trim())
        if (vp.length < 2) { toast.error('Cần ít nhất 2 cặp'); return null }
        return {
          options: vp.map((p, i) => ({ key: String.fromCharCode(65 + i), text: p.left, image_url: p.leftImage || '' })),
          match_options: vp.map((p, i) => ({ key: String(i + 1), text: p.right, image_url: p.rightImage || '' })),
          correct_answer: vp.map((_, i) => `${String.fromCharCode(65 + i)}-${i + 1}`).join(','),
        }
      }
      case 'ordering': {
        const vi = form.items.filter(t => t.trim())
        if (vi.length < 2) { toast.error('Cần ít nhất 2 mục'); return null }
        return {
          options: vi.map((text, i) => ({ key: String(i + 1), text })),
          correct_answer: vi.map((_, i) => String(i + 1)).join(','),
        }
      }
      case 'drag_word': {
        if (blankCount === 0) { toast.error('Câu hỏi cần có ít nhất 1 chỗ trống ___'); return null }
        const correctWords = form.drag_answers.slice(0, blankCount).map(w => w.trim())
        if (correctWords.some(w => !w)) { toast.error(`Nhập đủ ${blankCount} từ đúng cho các chỗ trống`); return null }
        const distractors = form.drag_distractors.map(w => w.trim()).filter(Boolean)
        const allWords = [...correctWords, ...distractors]
        return {
          options: allWords.map((text, i) => ({ key: String(i + 1), text })),
          correct_answer: correctWords.join(','),
        }
      }
      case 'word_order': {
        // Giáo viên nhập câu đúng → app tự tách thành từng từ → trộn ngẫu nhiên khi học sinh làm
        if (!form.correct_answer.trim()) { toast.error('Nhập câu đúng cần sắp xếp'); return null }
        const correctWords = form.correct_answer.trim().split(/\s+/) // tách theo khoảng trắng
        if (correctWords.length < 2) { toast.error('Câu phải có ít nhất 2 từ'); return null }
        // Gộp từ đúng + từ gây nhiễu thành ngân hàng từ
        const distractors = form.drag_distractors.map(w => w.trim()).filter(Boolean)
        const allWords = [...correctWords, ...distractors]
        return {
          options: allWords.map((text, i) => ({ key: String.fromCharCode(65 + i), text })),
          correct_answer: form.correct_answer.trim(), // lưu cả câu, không tách
        }
      }
      default: return null
    }
  }

  async function handleSave() {
    if (!form.question.trim()) { toast.error('Nhập nội dung câu hỏi'); return }
    const specific = buildPayload()
    if (!specific) return
    setSaving(true)
    const { error } = await supabase.from('questions').insert({
      type: form.type,
      question: form.question.trim(),
      grade: form.grade,
      subject_id: form.subject_id || null,
      topic: form.topic || null,
      difficulty: form.difficulty,
      image_url: form.image_url || null,
      audio_url: form.audio_url || null,  // lưu URL âm thanh vào database
      ...specific,
    })
    setSaving(false)
    if (error) toast.error('Thêm thất bại: ' + error.message)
    else { toast.success('Đã thêm câu hỏi'); onDone() }
  }

  function setOption(i, field, value) {
    const opts = [...form.options]; opts[i] = { ...opts[i], [field]: value }
    setForm({ ...form, options: opts })
  }
  function setPair(i, field, value) {
    const pairs = [...form.pairs]; pairs[i] = { ...pairs[i], [field]: value }
    setForm({ ...form, pairs })
  }
  function setItem(i, value) {
    const items = [...form.items]; items[i] = value; setForm({ ...form, items })
  }
  function setDragAnswer(i, value) {
    const drag_answers = [...form.drag_answers]; drag_answers[i] = value; setForm({ ...form, drag_answers })
  }
  function setDistractor(i, value) {
    const drag_distractors = [...form.drag_distractors]; drag_distractors[i] = value; setForm({ ...form, drag_distractors })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-bold text-gray-800">Thêm câu hỏi</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Type */}
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
            {TYPES.map(t => (
              <button key={t.value}
                onClick={() => setForm({ ...form, type: t.value, correct_answer: '' })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${form.type === t.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Question text + image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung câu hỏi
              {(form.type === 'drag_word' || form.type === 'fill_blank') && (
                <span className="ml-2 text-xs font-normal text-gray-400">Dùng <code className="bg-gray-100 px-1 rounded">___</code> để đánh dấu chỗ trống</span>
              )}
            </label>
            <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
              rows={3} placeholder={['drag_word', 'fill_blank'].includes(form.type) ? 'Ví dụ: Hà Nội là thủ đô của ___' : 'Nhập nội dung câu hỏi...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <ImageUpload value={form.image_url} onChange={v => setForm({ ...form, image_url: v })} />
              <AudioUpload value={form.audio_url} onChange={v => setForm({ ...form, audio_url: v })} />
            </div>
          </div>

          {/* Grade / Subject / Topic / Difficulty */}
          {subjects.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
                <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value, topic: '' })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- Môn --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value, topic: '' })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['6','7','8','9'].map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {subjects.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
                <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value, topic: '' })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['6','7','8','9'].map(g => <option key={g} value={g}>Khối {g}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Chủ đề --</option>
                {topicOptions.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
          </div>

          {/* Multiple choice */}
          {form.type === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án (bấm chữ để chọn đúng)</label>
              <div className="space-y-3">
                {form.options.map((opt, i) => (
                  <div key={opt.key}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm({ ...form, correct_answer: opt.key })}
                        className={`w-8 h-8 rounded-full text-sm font-bold shrink-0 border-2 transition ${form.correct_answer === opt.key ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-500 hover:border-green-400'}`}>
                        {opt.key}
                      </button>
                      <input value={opt.text} onChange={e => setOption(i, 'text', e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Đáp án ${opt.key}`} />
                    </div>
                    <div className="pl-10 mt-1">
                      <ImageUpload value={opt.image_url} onChange={v => setOption(i, 'image_url', v)} compact />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True/false */}
          {form.type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng</label>
              <div className="flex gap-3">
                {['Đúng', 'Sai'].map(v => (
                  <button key={v} onClick={() => setForm({ ...form, correct_answer: v })}
                    className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition ${form.correct_answer === v ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-600 hover:border-green-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fill blank */}
          {form.type === 'fill_blank' && (
            <div className="space-y-3">
              {blankCount === 0 ? (
                <div className="bg-yellow-50 rounded-lg px-3 py-2 text-sm text-yellow-700">
                  Nhập <code className="bg-yellow-100 px-1 rounded">___</code> vào câu hỏi để tạo chỗ trống
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50 rounded-lg px-3 py-2 text-sm text-indigo-700">
                    Phát hiện <strong>{blankCount}</strong> chỗ trống
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đáp án đúng cho mỗi chỗ trống</label>
                    <div className="space-y-2">
                      {Array.from({ length: blankCount }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <input
                            value={form.drag_answers[i] || ''}
                            onChange={e => setDragAnswer(i, e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Đáp án đúng cho chỗ trống ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Matching */}
          {form.type === 'matching' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Các cặp nối (trái ↔ phải)</label>
              <div className="space-y-3">
                {form.pairs.map((pair, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-4 shrink-0 mt-2">{String.fromCharCode(65 + i)}</span>
                    {/* Left side */}
                    <div className="flex-1 flex items-center gap-1.5 border border-gray-300 rounded-lg bg-white px-2 py-1.5">
                      <input value={pair.left} onChange={e => setPair(i, 'left', e.target.value)}
                        className="flex-1 text-sm focus:outline-none min-w-0"
                        placeholder="Cột trái" />
                      <ImageUpload value={pair.leftImage} onChange={v => setPair(i, 'leftImage', v)} compact />
                    </div>
                    <span className="text-gray-400 font-bold shrink-0 mt-2">↔</span>
                    {/* Right side */}
                    <div className="flex-1 flex items-center gap-1.5 border border-gray-300 rounded-lg bg-white px-2 py-1.5">
                      <input value={pair.right} onChange={e => setPair(i, 'right', e.target.value)}
                        className="flex-1 text-sm focus:outline-none min-w-0"
                        placeholder="Cột phải" />
                      <ImageUpload value={pair.rightImage} onChange={v => setPair(i, 'rightImage', v)} compact />
                    </div>
                    {form.pairs.length > 2 && (
                      <button onClick={() => setForm({ ...form, pairs: form.pairs.filter((_, idx) => idx !== i) })}
                        className="text-red-400 hover:text-red-600 shrink-0 mt-2"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, pairs: [...form.pairs, { left: '', leftImage: '', right: '', rightImage: '' }] })}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                  <Plus size={14} /> Thêm cặp
                </button>
              </div>
            </div>
          )}

          {/* Ordering */}
          {form.type === 'ordering' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thứ tự đúng (từ trên xuống dưới)</label>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <input value={item} onChange={e => setItem(i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Mục thứ ${i + 1}`} />
                    {form.items.length > 2 && (
                      <button onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })}
                        className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, items: [...form.items, ''] })}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                  <Plus size={14} /> Thêm mục
                </button>
              </div>
            </div>
          )}

          {/* Drag word */}
          {form.type === 'drag_word' && (
            <div className="space-y-4">
              {blankCount > 0 ? (
                <div className="bg-indigo-50 rounded-lg px-3 py-2 text-sm text-indigo-700">
                  Phát hiện <strong>{blankCount}</strong> chỗ trống
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg px-3 py-2 text-sm text-yellow-700">
                  Nhập <code className="bg-yellow-100 px-1 rounded">___</code> vào câu hỏi để tạo chỗ trống
                </div>
              )}

              {/* Correct words per blank */}
              {blankCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Từ đúng cho mỗi chỗ trống</label>
                  <div className="space-y-2">
                    {Array.from({ length: blankCount }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <input
                          value={form.drag_answers[i] || ''}
                          onChange={e => setDragAnswer(i, e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Từ đúng cho chỗ trống ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distractor words */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Từ gây nhiễu (thêm vào ngân hàng từ)</label>
                <div className="space-y-2">
                  {form.drag_distractors.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={w} onChange={e => setDistractor(i, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Từ gây nhiễu ${i + 1}`} />
                      {form.drag_distractors.length > 1 && (
                        <button onClick={() => setForm({ ...form, drag_distractors: form.drag_distractors.filter((_, idx) => idx !== i) })}
                          className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, drag_distractors: [...form.drag_distractors, ''] })}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                    <Plus size={14} /> Thêm từ gây nhiễu
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Dạng sắp xếp từ thành câu */}
          {form.type === 'word_order' && (
            <div className="space-y-4">
              {/* Giáo viên nhập câu đúng — app tự tách thành từng từ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Câu đúng cần sắp xếp
                  <span className="ml-2 text-xs font-normal text-gray-400">App sẽ tự tách thành từng từ</span>
                </label>
                <input
                  value={form.correct_answer}
                  onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: She is a good student"
                />
                {/* Preview các từ sẽ xuất hiện trong ngân hàng từ */}
                {form.correct_answer.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.correct_answer.trim().split(/\s+/).map((w, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">{w}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Từ gây nhiễu (tùy chọn) — thêm để tăng độ khó */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Từ gây nhiễu <span className="text-xs font-normal text-gray-400">(tùy chọn — tăng độ khó)</span></label>
                <div className="space-y-2">
                  {form.drag_distractors.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={w} onChange={e => setDistractor(i, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Từ gây nhiễu ${i + 1}`} />
                      {form.drag_distractors.length > 1 && (
                        <button onClick={() => setForm({ ...form, drag_distractors: form.drag_distractors.filter((_, idx) => idx !== i) })}
                          className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setForm({ ...form, drag_distractors: [...form.drag_distractors, ''] })}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                    <Plus size={14} /> Thêm từ gây nhiễu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
          <button onClick={handleSave} disabled={saving || !form.question.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Thêm câu hỏi
          </button>
        </div>
      </div>
    </div>
  )
}
