import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useGrades } from '../../hooks/useGrades'
import toast from 'react-hot-toast'
import { Upload, Trash2, X, AlertCircle, CheckCircle2, Loader2, Search, UserPlus, Pencil } from 'lucide-react'

// Tạo user qua Edge Function (tránh lỗi "Forbidden use of secret API key in browser")
async function adminCreateUser(email, password, metadata) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error('Chưa cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY')
  const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({ email, password, metadata }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Lỗi tạo tài khoản')
  return data.user
}

// ─── Parser ────────────────────────────────────────────────────────────────
function parseStudents(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      // Tách bằng dấu phẩy hoặc tab
      const parts = line.split(/[,\t]/).map(p => p.trim())
      if (parts.length < 5) {
        return { _raw: line, _line: index + 1, _errors: [`Dòng ${index + 1}: cần đủ 5 cột (tên, đăng nhập, mật khẩu, khối, lớp)`] }
      }
      const [full_name, username, password, grade, class_name] = parts
      const errors = []
      if (!full_name) errors.push('Thiếu họ tên')
      if (!username) errors.push('Thiếu tên đăng nhập')
      else if (!/^[a-zA-Z0-9_.]+$/.test(username)) errors.push('Tên đăng nhập chỉ gồm a-z, 0-9, _ .')
      if (!password) errors.push('Thiếu mật khẩu')
      else if (password.length < 6) errors.push('Mật khẩu ít nhất 6 ký tự')
      if (!grade) errors.push('Thiếu khối')
      if (!class_name) errors.push('Thiếu tên lớp')
      return { full_name, username, password, grade, class_name, _raw: line, _line: index + 1, _errors: errors }
    })
}

// ─── Import Modal ───────────────────────────────────────────────────────────
function StudentImportModal({ onClose, onDone }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState([])
  const [step, setStep] = useState('input') // input | preview | importing | done
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState([])
  const [checking, setChecking] = useState(false)

  async function handleParse() {
    if (!text.trim()) return
    const rows = parseStudents(text)
    setChecking(true)
    // Lấy danh sách username đã tồn tại trong DB
    const usernames = rows.filter(r => r.username).map(r => r.username)
    let existingSet = new Set()
    if (usernames.length > 0) {
      const { data } = await supabase.from('profiles').select('username').in('username', usernames)
      existingSet = new Set((data || []).map(p => p.username))
    }
    // Đánh dấu trùng username
    const marked = rows.map(r => {
      if (r._errors.length > 0) return r
      if (existingSet.has(r.username)) {
        return { ...r, _duplicate: true, _errors: [`Tên đăng nhập "${r.username}" đã tồn tại`] }
      }
      return r
    })
    setParsed(marked)
    setChecking(false)
    setStep('preview')
  }

  const validRows = parsed.filter(r => r._errors.length === 0)
  const invalidRows = parsed.filter(r => r._errors.length > 0)

  async function handleImport() {
    if (validRows.length === 0) return
    setStep('importing')
    setProgress({ done: 0, total: validRows.length })
    const res = []

    for (const row of validRows) {
      const email = `${row.username}@school.local`
      try {
        const authUser = await adminCreateUser(email, row.password, {
          full_name: row.full_name,
          role: 'student',
          grade: row.grade,
          class_name: row.class_name,
          username: row.username,
        })

        // Fallback: cập nhật profile nếu trigger chưa set đủ
        if (authUser?.id) {
          await supabase
            .from('profiles')
            .update({ class_name: row.class_name, username: row.username })
            .eq('id', authUser.id)
        }

        res.push({ ...row, _ok: true, email })
      } catch (err) {
        const msg = err.message.includes('already been registered') || err.message.includes('already registered')
          ? 'Tên đăng nhập đã tồn tại'
          : err.message
        res.push({ ...row, _ok: false, _importError: msg, email })
      }
      setProgress(p => ({ ...p, done: p.done + 1 }))
    }

    setResults(res)
    setStep('done')
    const ok = res.filter(r => r._ok).length
    if (ok > 0) { toast.success(`Đã thêm ${ok} học sinh`); onDone() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Nhập học sinh hàng loạt</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mỗi dòng: <span className="font-mono bg-gray-100 px-1 rounded">họ tên, tên đăng nhập, mật khẩu, khối, lớp</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">

          {/* Step: input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">Định dạng nhập liệu:</p>
                <p className="font-mono text-xs">Nguyễn Văn An, nguyenvanan, matkhau123, 3, 3A</p>
                <p className="font-mono text-xs">Trần Thị Bình, tranthib, matkhau456, 4, 4B</p>
                <p className="mt-2 text-xs text-blue-600">Tên đăng nhập: chỉ dùng a-z, 0-9, dấu _ và . (không dấu tiếng Việt)</p>
              </div>
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Dán danh sách học sinh vào đây..."
                rows={12}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Hủy
                </button>
                <button
                  onClick={handleParse}
                  disabled={!text.trim() || checking}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
                >
                  {checking ? <><Loader2 size={14} className="animate-spin" /> Đang kiểm tra...</> : 'Phân tích dữ liệu →'}
                </button>
              </div>
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm">
                  <CheckCircle2 size={16} />
                  <span><strong>{validRows.length}</strong> dòng hợp lệ</span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm">
                    <AlertCircle size={16} />
                    <span><strong>{invalidRows.length}</strong> dòng lỗi (sẽ bỏ qua)</span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Họ tên</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tên đăng nhập</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Mật khẩu</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Khối</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Lớp</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => {
                      const ok = row._errors.length === 0
                      return (
                        <tr key={i} className={`border-t ${ok ? 'bg-white' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-gray-400 text-xs">{row._line}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{row.full_name || <span className="text-red-400 italic">trống</span>}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">{row.username || '—'}</td>
                          <td className="px-3 py-2 text-gray-400 font-mono text-xs">{row.password ? '••••••' : '—'}</td>
                          <td className="px-3 py-2">{row.grade ? <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded">{row.grade}</span> : '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.class_name || '—'}</td>
                          <td className="px-3 py-2">
                            {ok ? (
                              <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> OK</span>
                            ) : row._duplicate ? (
                              <span className="flex items-center gap-1 text-orange-500 text-xs"><AlertCircle size={13} /> Trùng username — sửa lại</span>
                            ) : (
                              <span className="text-red-500 text-xs">{row._errors.join('; ')}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between gap-3">
                <button onClick={() => setStep('input')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  ← Quay lại
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    Hủy
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validRows.length === 0}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition"
                  >
                    <UserPlus size={15} />
                    Thêm {validRows.length} học sinh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={40} className="animate-spin text-indigo-600" />
              <p className="text-gray-600 font-medium">Đang tạo tài khoản...</p>
              <p className="text-gray-400 text-sm">{progress.done} / {progress.total}</p>
              <div className="w-64 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm">
                  <CheckCircle2 size={16} />
                  <span><strong>{results.filter(r => r._ok).length}</strong> học sinh đã thêm thành công</span>
                </div>
                {results.filter(r => !r._ok).length > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm">
                    <AlertCircle size={16} />
                    <span><strong>{results.filter(r => !r._ok).length}</strong> tài khoản thất bại</span>
                  </div>
                )}
              </div>

              <div className="overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Họ tên</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Email đăng nhập</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Lớp</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className={`border-t ${r._ok ? 'bg-white' : 'bg-red-50'}`}>
                        <td className="px-3 py-2 font-medium text-gray-800">{r.full_name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.email}</td>
                        <td className="px-3 py-2 text-gray-600">{r.class_name}</td>
                        <td className="px-3 py-2">
                          {r._ok
                            ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 size={13} /> Thành công</span>
                            : <span className="text-red-500 text-xs">{r._importError}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────
function StudentEditModal({ student, classes, gradeValues, onClose, onDone }) {
  const [form, setForm] = useState({
    full_name: student.full_name || '',
    grade: student.grade || '',
    class_name: student.class_name || '',
  })
  const [saving, setSaving] = useState(false)

  const filteredClasses = form.grade ? classes.filter(c => c.grade === form.grade) : classes

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      grade: form.grade,
      class_name: form.class_name,
    }).eq('id', student.id)
    setSaving(false)
    if (error) toast.error('Lưu thất bại: ' + error.message)
    else { toast.success('Đã cập nhật'); onDone() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-800">Sửa thông tin học sinh</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
            <select
              value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value, class_name: '' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Chọn khối --</option>
              {gradeValues.map(g => <option key={g} value={g}>Khối {g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
            <select
              value={form.class_name}
              onChange={e => setForm({ ...form, class_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Chọn lớp --</option>
              {filteredClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="pt-1 text-xs text-gray-400">
            Tên đăng nhập: <span className="font-mono">{student.username || '—'}</span> (không thể thay đổi)
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.full_name}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [searchParams] = useSearchParams()
  const { grades: gradeValues } = useGrades()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState(searchParams.get('grade') || '')
  const [filterClass, setFilterClass] = useState(searchParams.get('class') || '')
  const [search, setSearch] = useState('')
  const [classes, setClasses] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [editStudent, setEditStudent] = useState(null)

  useEffect(() => { fetchClasses() }, [])
  useEffect(() => { fetchStudents() }, [filterGrade, filterClass])

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('name, grade').order('grade').order('name')
    setClasses(data || [])
  }

  async function fetchStudents() {
    setLoading(true)
    let q = supabase.from('profiles').select('*').eq('role', 'student').order('class_name').order('full_name')
    if (filterGrade) q = q.eq('grade', filterGrade)
    if (filterClass) q = q.eq('class_name', filterClass)
    const { data, error } = await q
    if (error) toast.error('Lỗi tải danh sách học sinh: ' + error.message)
    setStudents(data || [])
    setLoading(false)
  }

  async function handleDelete(student) {
    if (!confirm(`Xóa tài khoản học sinh "${student.full_name}"? Hành động này không thể hoàn tác.`)) return
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ userId: student.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error('Xóa thất bại: ' + (data.error || 'Lỗi không xác định'))
    } else {
      toast.success('Đã xóa học sinh')
      fetchStudents()
    }
  }

  const filteredClasses = filterGrade
    ? classes.filter(c => c.grade === filterGrade)
    : classes

  const displayed = students.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const colorPalette = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700']
  const gradeColors = Object.fromEntries(gradeValues.map((g, i) => [g, colorPalette[i % colorPalette.length]]))

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý học sinh</h1>
          <p className="text-gray-400 text-sm mt-0.5">{students.length} học sinh</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Upload size={16} /> Nhập học sinh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
          />
        </div>
        <select
          value={filterGrade}
          onChange={e => { setFilterGrade(e.target.value); setFilterClass('') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả khối</option>
          {gradeValues.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả lớp</option>
          {filteredClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {(filterGrade || filterClass || search) && (
          <button
            onClick={() => { setFilterGrade(''); setFilterClass(''); setSearch('') }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={14} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Chưa có học sinh nào</p>
          <p className="text-sm mt-1">Bấm "Nhập học sinh" để thêm hàng loạt</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Họ và tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Email đăng nhập</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Khối</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Lớp</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {displayed.map((s, i) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {s.username
                      ? <span>{s.username}<span className="text-gray-300">@school.local</span></span>
                      : <span className="text-gray-300 italic">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {s.grade && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeColors[s.grade]}`}>Khối {s.grade}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.class_name || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditStudent(s)}
                        className="text-gray-300 hover:text-indigo-500 transition p-1"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-gray-300 hover:text-red-500 transition p-1"
                        title="Xóa học sinh"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && (
        <StudentImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); fetchStudents() }}
        />
      )}
      {editStudent && (
        <StudentEditModal
          student={editStudent}
          classes={classes}
          gradeValues={gradeValues}
          onClose={() => setEditStudent(null)}
          onDone={() => { setEditStudent(null); fetchStudents() }}
        />
      )}
    </div>
  )
}
