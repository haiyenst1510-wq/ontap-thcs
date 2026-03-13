import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Users, School, ChevronRight, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const COLOR_SCHEMES = [
  { color: 'border-blue-200 bg-blue-50', text: 'text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' },
  { color: 'border-green-200 bg-green-50', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' },
  { color: 'border-purple-200 bg-purple-50', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
  { color: 'border-orange-200 bg-orange-50', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
  { color: 'border-rose-200 bg-rose-50', text: 'text-rose-700', btn: 'bg-rose-600 hover:bg-rose-700' },
  { color: 'border-teal-200 bg-teal-50', text: 'text-teal-700', btn: 'bg-teal-600 hover:bg-teal-700' },
]

export default function GradesPage() {
  const navigate = useNavigate()
  const [grades, setGrades] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [editGrade, setEditGrade] = useState(null)
  const [editVal, setEditVal] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [gradeRes, classRes, studentRes] = await Promise.all([
      supabase.from('grades').select('value').order('value'),
      supabase.from('classes').select('grade'),
      supabase.from('profiles').select('grade').eq('role', 'student'),
    ])
    const gradeList = gradeRes.data?.map(g => g.value) || []
    const s = {}
    gradeList.forEach(v => { s[v] = { classes: 0, students: 0 } })
    classRes.data?.forEach(c => { if (s[c.grade]) s[c.grade].classes++ })
    studentRes.data?.forEach(p => { if (s[p.grade]) s[p.grade].students++ })
    setGrades(gradeList)
    setStats(s)
    setLoading(false)
  }

  async function handleAdd() {
    const val = newValue.trim()
    if (!val) return
    if (grades.includes(val)) { toast.error(`Khối ${val} đã tồn tại`); return }
    setSaving(true)
    const { error } = await supabase.from('grades').insert({ value: val })
    setSaving(false)
    if (error) toast.error('Thêm thất bại: ' + error.message)
    else { toast.success(`Đã thêm Khối ${val}`); setNewValue(''); setAdding(false); fetchAll() }
  }

  async function handleRename(oldValue) {
    const val = editVal.trim()
    if (!val || val === oldValue) { setEditGrade(null); return }
    if (grades.includes(val)) { toast.error(`Khối "${val}" đã tồn tại`); return }
    setSaving(true)
    // Update grades table
    const { error } = await supabase.from('grades').update({ value: val }).eq('value', oldValue)
    if (error) { toast.error('Đổi tên thất bại: ' + error.message); setSaving(false); return }
    // Cascade update classes, profiles, questions, exams, lessons
    await Promise.all([
      supabase.from('classes').update({ grade: val }).eq('grade', oldValue),
      supabase.from('profiles').update({ grade: val }).eq('grade', oldValue),
      supabase.from('questions').update({ grade: val }).eq('grade', oldValue),
      supabase.from('exams').update({ grade: val }).eq('grade', oldValue),
      supabase.from('lessons').update({ grade: val }).eq('grade', oldValue),
    ])
    setSaving(false)
    setEditGrade(null)
    toast.success(`Đã đổi tên thành "${val}"`)
    fetchAll()
  }

  async function handleDelete(value) {
    const s = stats[value] || {}
    if (s.classes > 0 || s.students > 0) {
      toast.error(`Khối ${value} còn ${s.classes} lớp và ${s.students} học sinh, không thể xóa`)
      return
    }
    if (!confirm(`Xóa Khối ${value}?`)) return
    const { error } = await supabase.from('grades').delete().eq('value', value)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa'); fetchAll() }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý khối</h1>
          <p className="text-gray-400 text-sm mt-0.5">Tổng quan số lớp và học sinh theo khối</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> Thêm khối
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-6 flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Số khối</label>
            <input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewValue('') } }}
              placeholder="Ví dụ: 1, 2, 6..."
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newValue.trim()}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Thêm
          </button>
          <button onClick={() => { setAdding(false); setNewValue('') }} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
            Hủy
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Chưa có khối nào. Bấm "Thêm khối" để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {grades.map((g, i) => {
            const scheme = COLOR_SCHEMES[i % COLOR_SCHEMES.length]
            const s = stats[g] || { classes: 0, students: 0 }
            return (
              <div key={g} className={`border-2 rounded-2xl p-6 relative ${scheme.color}`}>
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => { setEditGrade(g); setEditVal(g) }}
                    className="p-1.5 text-gray-300 hover:text-indigo-500 transition rounded-lg hover:bg-white/60"
                    title="Sửa tên khối"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(g)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg hover:bg-white/60"
                    title="Xóa khối"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {editGrade === g ? (
                  <div className="flex items-center gap-2 mb-5 mt-1">
                    <input
                      autoFocus
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(g); if (e.key === 'Escape') setEditGrade(null) }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <button onClick={() => handleRename(g)} disabled={saving} className="p-1.5 text-green-600 hover:bg-white/60 rounded-lg transition">
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    </button>
                    <button onClick={() => setEditGrade(null)} className="p-1.5 text-gray-400 hover:bg-white/60 rounded-lg transition">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className={`text-4xl font-black mb-5 ${scheme.text}`}>Khối {g}</div>
                )}

                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                    <School size={18} className="text-gray-400" />
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{s.classes}</div>
                      <div className="text-xs text-gray-500">lớp học</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                    <Users size={18} className="text-gray-400" />
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{s.students}</div>
                      <div className="text-xs text-gray-500">học sinh</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/teacher/classes?grade=${g}`)}
                    className={`flex-1 flex items-center justify-center gap-1 text-white text-sm py-2 rounded-lg transition ${scheme.btn}`}
                  >
                    Xem lớp <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/students?grade=${g}`)}
                    className="flex-1 flex items-center justify-center gap-1 text-sm py-2 rounded-lg bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition"
                  >
                    Học sinh
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
