import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTopics } from '../../hooks/useTopics'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const GRADES = [
  { value: 'all', label: 'Tất cả khối' },
  { value: '3', label: 'Khối 3' },
  { value: '4', label: 'Khối 4' },
  { value: '5', label: 'Khối 5' },
]

export default function TopicsPage() {
  const { topics, loading, refetch } = useTopics()
  const [filterGrade, setFilterGrade] = useState('all')
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('all')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editGrade, setEditGrade] = useState('all')

  const displayed = filterGrade === 'all' ? topics : topics.filter(t => t.grade === filterGrade)

  async function handleAdd() {
    if (!newName.trim()) return
    const { error } = await supabase.from('topics').insert({ name: newName.trim(), grade: newGrade })
    if (error) {
      toast.error(error.message.includes('unique') ? 'Chủ đề đã tồn tại' : 'Thêm thất bại')
    } else {
      toast.success('Đã thêm chủ đề')
      setNewName('')
      setNewGrade('all')
      setAdding(false)
      refetch()
    }
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return
    const { error } = await supabase.from('topics').update({ name: editName.trim(), grade: editGrade }).eq('id', id)
    if (error) toast.error('Cập nhật thất bại')
    else { toast.success('Đã cập nhật'); setEditId(null); refetch() }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Xóa chủ đề "${name}"? Các câu hỏi thuộc chủ đề này sẽ không bị xóa.`)) return
    const { error } = await supabase.from('topics').delete().eq('id', id)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa'); refetch() }
  }

  function startEdit(topic) {
    setEditId(topic.id)
    setEditName(topic.name)
    setEditGrade(topic.grade)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chủ đề</h1>
          <p className="text-gray-400 text-sm mt-0.5">{displayed.length} chủ đề</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} /> Thêm chủ đề
          </button>
        )}
      </div>

      {/* Grade filter tabs */}
      <div className="flex gap-2 mb-5">
        {GRADES.map(g => (
          <button
            key={g.value}
            onClick={() => setFilterGrade(g.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filterGrade === g.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
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
            placeholder="Tên chủ đề..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={newGrade}
            onChange={e => setNewGrade(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition">
            <Check size={16} />
          </button>
          <button onClick={() => { setAdding(false); setNewName('') }} className="text-gray-400 hover:text-gray-600 p-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Topic list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(topic => (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              {editId === topic.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(topic.id)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={editGrade}
                    onChange={e => setEditGrade(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <button onClick={() => handleUpdate(topic.id)} className="text-green-600 hover:text-green-700 p-1">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-800">{topic.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {GRADES.find(g => g.value === topic.grade)?.label}
                  </span>
                  <button onClick={() => startEdit(topic)} className="text-gray-400 hover:text-indigo-600 p-1 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(topic.id, topic.name)} className="text-gray-400 hover:text-red-500 p-1 transition">
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
