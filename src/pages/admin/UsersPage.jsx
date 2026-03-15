import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useGrades } from '../../hooks/useGrades'
import { Search, Trash2, Shield, User, GraduationCap, ChevronDown, Pencil, KeyRound, ToggleLeft, ToggleRight, X, Check, Loader2, UserCheck, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
}

function RoleIcon({ role }) {
  if (role === 'admin') return <Shield size={15} className="text-purple-600" />
  if (role === 'teacher') return <User size={15} className="text-blue-600" />
  return <GraduationCap size={15} className="text-green-600" />
}

export default function UsersPage() {
  const { profile: me } = useAuth()
  const { grades } = useGrades()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [showPending, setShowPending] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Lỗi tải danh sách')
    else setUsers(data || [])
    setLoading(false)
  }

  async function approveUser(u) {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', u.id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success(`Đã duyệt tài khoản ${u.full_name}`); fetchUsers() }
  }

  async function toggleActive(u) {
    if (u.id === me?.id) { toast.error('Không thể khóa chính mình'); return }
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id)
    if (error) toast.error('Lỗi: ' + error.message)
    else {
      toast.success(u.is_active ? `Đã khóa tài khoản ${u.full_name}` : `Đã mở khóa ${u.full_name}`)
      fetchUsers()
    }
  }

  async function deleteUser(id, name) {
    if (id === me?.id) { toast.error('Không thể xóa chính mình'); return }
    if (!confirm(`Xóa tài khoản "${name}"?`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã xóa tài khoản'); fetchUsers() }
  }

  const pendingUsers = users.filter(u => u.is_approved === false)
  const filtered = users.filter(u => {
    if (showPending) return u.is_approved === false
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    const matchGrade = !filterGrade || u.grade === filterGrade
    return matchSearch && matchRole && matchGrade
  })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý người dùng</h1>
          <p className="text-gray-400 text-sm mt-0.5">{users.length} tài khoản</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPending(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!showPending ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Tất cả
          </button>
          <button onClick={() => setShowPending(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${showPending ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            <Clock size={14} />
            Chờ duyệt
            {pendingUsers.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${showPending ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3">
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Tất cả vai trò</option>
            <option value="admin">Quản trị viên</option>
            <option value="teacher">Giáo viên</option>
            <option value="student">Học sinh</option>
          </select>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Tất cả khối</option>
            {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Không có người dùng nào</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Họ tên</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Tên đăng nhập</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Vai trò</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Khối</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Ngày tạo</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition ${!u.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <RoleIcon role={u.role} />
                        </div>
                        <span className="font-medium text-gray-800">{u.full_name || '(chưa có tên)'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                        {u.role === 'admin' ? 'Quản trị viên' : u.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.grade ? `Khối ${u.grade}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {u.is_approved === false ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock size={13} /> Chờ duyệt
                        </span>
                      ) : (
                        <button onClick={() => toggleActive(u)} className="flex items-center gap-1.5 text-xs font-medium transition">
                          {u.is_active
                            ? <><ToggleRight size={18} className="text-green-500" /><span className="text-green-600">Hoạt động</span></>
                            : <><ToggleLeft size={18} className="text-gray-400" /><span className="text-gray-400">Đã khóa</span></>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.is_approved === false && (
                          <button onClick={() => approveUser(u)} className="p-1.5 text-amber-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Duyệt tài khoản">
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button onClick={() => setEditUser(u)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Chỉnh sửa">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setResetUser(u)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition" title="Reset mật khẩu">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => deleteUser(u.id, u.full_name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(u => (
              <div key={u.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!u.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <RoleIcon role={u.role} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 truncate">{u.full_name || '(chưa có tên)'}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email || new Date(u.created_at).toLocaleDateString('vi-VN')}</div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {u.is_approved === false && (
                      <button onClick={() => approveUser(u)} className="p-1.5 text-amber-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Duyệt">
                        <UserCheck size={14} />
                      </button>
                    )}
                    <button onClick={() => setEditUser(u)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setResetUser(u)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition">
                      <KeyRound size={14} />
                    </button>
                    <button onClick={() => deleteUser(u.id, u.full_name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {u.role === 'admin' ? 'Quản trị viên' : u.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  </span>
                  {u.grade && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Khối {u.grade}</span>}
                  <button onClick={() => toggleActive(u)} className="flex items-center gap-1 text-xs font-medium ml-auto">
                    {u.is_active
                      ? <><ToggleRight size={16} className="text-green-500" /><span className="text-green-600">Hoạt động</span></>
                      : <><ToggleLeft size={16} className="text-gray-400" /><span className="text-gray-400">Đã khóa</span></>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editUser && <EditUserModal user={editUser} grades={grades} onClose={() => setEditUser(null)} onSaved={fetchUsers} />}

      {/* Reset Password Modal */}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  )
}

/* ── Edit User Modal ── */
function EditUserModal({ user, grades, onClose, onSaved }) {
  const [form, setForm] = useState({ full_name: user.full_name || '', role: user.role, grade: user.grade || '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const update = { full_name: form.full_name, role: form.role }
    if (form.role === 'student') update.grade = form.grade || null
    else update.grade = null
    const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
    setSaving(false)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã cập nhật'); onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Chỉnh sửa người dùng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="admin">Quản trị viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="student">Học sinh</option>
            </select>
          </div>
          {form.role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối</label>
              <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Chọn khối --</option>
                {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Check size={14} /> Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Reset Password Modal ── */
function ResetPasswordModal({ user, onClose }) {
  const [saving, setSaving] = useState(false)

  async function handleSendResetEmail() {
    if (!user.email) { toast.error('Tài khoản này chưa có email'); return }
    setSaving(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + '/login',
    })
    setSaving(false)
    if (error) toast.error('Lỗi: ' + error.message)
    else { toast.success('Đã gửi email đặt lại mật khẩu'); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Reset mật khẩu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-1">
            Gửi email đặt lại mật khẩu cho <span className="font-semibold">{user.full_name}</span>
          </p>
          {user.email && (
            <p className="text-sm text-gray-400 mb-4">Email: <span className="text-gray-600">{user.email}</span></p>
          )}
          <p className="text-xs text-gray-400">
            Người dùng sẽ nhận được link đặt lại mật khẩu qua email.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
          <button onClick={handleSendResetEmail} disabled={saving || !user.email}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <KeyRound size={14} /> Gửi email reset
          </button>
        </div>
      </div>
    </div>
  )
}
