import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { BookOpen } from 'lucide-react'

const GRADES = ['6', '7', '8', '9']

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    grade: '6',
    subject_ids: [],  // giáo viên chọn môn dạy
  })
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)

  // Load danh sách môn từ database (không cần đăng nhập)
  useEffect(() => {
    supabase.from('subjects').select('id, name').order('name').then(({ data }) => {
      setSubjects(data || [])
    })
  }, [])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleSubject(id) {
    setForm(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(id)
        ? prev.subject_ids.filter(s => s !== id)
        : [...prev.subject_ids, id],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return }
    if (form.password !== form.confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return }
    if (!form.full_name.trim()) { toast.error('Vui lòng nhập họ và tên'); return }
    if (form.role === 'teacher' && form.subject_ids.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 môn dạy')
      return
    }

    setLoading(true)
    try {
      const metadata = {
        full_name: form.full_name.trim(),
        role: form.role,
        grade: form.role === 'student' ? form.grade : null,
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: metadata },
      })
      if (error) throw error

      // Nếu là giáo viên: ghi môn dạy vào teacher_subjects
      if (form.role === 'teacher' && authData?.user && form.subject_ids.length > 0) {
        await supabase.from('teacher_subjects').insert(
          form.subject_ids.map(sid => ({ teacher_id: authData.user.id, subject_id: sid }))
        )
      }

      toast.success('Đăng ký thành công! Vui lòng chờ admin duyệt tài khoản trước khi đăng nhập.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.message || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 text-white rounded-full p-3 mb-3">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Ôn Tập THCS</h1>
          <p className="text-gray-500 text-sm mt-1">Tạo tài khoản mới</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Họ và tên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input type="text" required value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nguyễn Văn A" autoComplete="name" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="example@email.com" autoComplete="email" />
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input type="password" required minLength={6} value={form.password}
              onChange={e => set('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" />
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
            <input type="password" required value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
          </div>

          {/* Vai trò */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
            <div className="flex gap-4">
              {[{ value: 'student', label: 'Học sinh' }, { value: 'teacher', label: 'Giáo viên' }].map(opt => (
                <label key={opt.value}
                  className={`flex items-center gap-2 flex-1 border rounded-lg px-4 py-2.5 cursor-pointer transition
                    ${form.role === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-300 text-gray-600 hover:border-indigo-300'}`}>
                  <input type="radio" name="role" value={opt.value}
                    checked={form.role === opt.value}
                    onChange={() => set('role', opt.value)}
                    className="accent-indigo-600" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Học sinh: chọn khối */}
          {form.role === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
              <select value={form.grade} onChange={e => set('grade', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
              </select>
            </div>
          )}

          {/* Giáo viên: chọn môn dạy */}
          {form.role === 'teacher' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Môn dạy <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-400 ml-1">(chọn ít nhất 1)</span>
              </label>
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-400">Đang tải danh sách môn...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {subjects.map(s => (
                    <label key={s.id}
                      className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition
                        ${form.subject_ids.includes(s.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-300 text-gray-600 hover:border-indigo-300'}`}>
                      <input type="checkbox" checked={form.subject_ids.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                        className="accent-indigo-600" />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Thông báo chờ duyệt */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⏳ Tài khoản mới cần được admin duyệt trước khi đăng nhập được.
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60 mt-2">
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
