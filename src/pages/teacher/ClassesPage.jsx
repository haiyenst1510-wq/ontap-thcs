import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useGrades } from '../../hooks/useGrades'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react'

export default function ClassesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { grades: gradeValues } = useGrades()
  const GRADES = [{ value: '', label: 'Tất cả khối' }, ...gradeValues.map(g => ({ value: g, label: `Khối ${g}` }))]
  const [classes, setClasses] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState(searchParams.get('grade') || '')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState('')

  useEffect(() => { if (gradeValues.length && !newGrade) setNewGrade(gradeValues[0]) }, [gradeValues])
  useEffect(() => { fetchClasses() }, [filterGrade])

  async function fetchClasses() {
    setLoading(true)
    let q = supabase.from('classes').select('*').order('grade').order('name')
    if (filterGrade) q = q.eq('grade', filterGrade)
    const { data, error } = await q
    if (error) { toast.error('Lỗi tải lớp học'); setLoading(false); return }

    setClasses(data || [])

    // Đếm học sinh theo lớp
    if (data?.length) {
      const { data: students } = await supabase
        .from('profiles')
        .select('class_name')
        .eq('role', 'student')
        .in('class_name', data.map(c => c.name))
      const counts = {}
      students?.forEach(s => { counts[s.class_name] = (counts[s.class_name] || 0) + 1 })
      setStudentCounts(counts)
    } else {
      setStudentCounts({})
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    const { error } = await supabase.from('classes').insert({ name: newName.trim(), grade: newGrade })
    if (error) {
      if (error.message.includes('unique') || error.code === '23505') toast.error('Tên lớp đã tồn tại')
      else if (error.message.includes('check') || error.code === '23514') toast.error('Khối không hợp lệ — cần xóa CHECK constraint trong DB')
      else toast.error('Thêm thất bại: ' + error.message)
    } else {
      toast.success('Đã thêm lớp')
      setNewName('')
      setAdding(false)
      fetchClasses()
    }
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return
    const { error } = await supabase.from('classes').update({ name: editName.trim(), grade: editGrade }).eq('id', id)
    if (error) toast.error('Cập nhật thất bại')
    else { toast.success('Đã cập nhật'); setEditId(null); fetchClasses() }
  }

  async function handleDelete(id, name) {
    const count = studentCounts[name] || 0
    const msg = count > 0
      ? `Lớp "${name}" có ${count} học sinh. Xóa lớp sẽ không xóa học sinh. Tiếp tục?`
      : `Xóa lớp "${name}"?`
    if (!confirm(msg)) return
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa lớp'); fetchClasses() }
  }

  function startEdit(cls) {
    setEditId(cls.id)
    setEditName(cls.name)
    setEditGrade(cls.grade)
  }

  const colorPalette = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700']
  const gradeColors = Object.fromEntries(gradeValues.map((g, i) => [g, colorPalette[i % colorPalette.length]]))

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý lớp</h1>
          <p className="text-gray-400 text-sm mt-0.5">{classes.length} lớp học</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} /> Thêm lớp
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {GRADES.map(g => (
          <button
            key={g.value}
            onClick={() => setFilterGrade(g.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${filterGrade === g.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Tên lớp (VD: 3A, 4B)..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={newGrade}
            onChange={e => setNewGrade(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {GRADES.slice(1).map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition">
            <Check size={16} />
          </button>
          <button onClick={() => { setAdding(false); setNewName('') }} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Chưa có lớp nào</p>
          <p className="text-sm mt-1">Bấm "Thêm lớp" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              {editId === cls.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(cls.id)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={editGrade}
                    onChange={e => setEditGrade(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {GRADES.slice(1).map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <button onClick={() => handleUpdate(cls.id)} className="text-green-600 hover:text-green-700 p-1">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-gray-800">{cls.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeColors[cls.grade]}`}>
                    Khối {cls.grade}
                  </span>
                  <button
                    onClick={() => navigate(`/teacher/students?class=${cls.name}`)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition"
                  >
                    <Users size={13} />
                    {studentCounts[cls.name] || 0} HS
                  </button>
                  <button onClick={() => startEdit(cls)} className="text-gray-400 hover:text-indigo-600 p-1 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(cls.id, cls.name)} className="text-gray-400 hover:text-red-500 p-1 transition">
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
