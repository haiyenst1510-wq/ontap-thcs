// ============================================================
// LoginPage.jsx — Trang đăng nhập
// ------------------------------------------------------------
// Người dùng nhập email + mật khẩu → gửi lên Supabase Auth
// → nếu đúng: chuyển sang trang chính
// → nếu sai: hiện thông báo lỗi
// ============================================================

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { GraduationCap } from 'lucide-react'

export default function LoginPage() {
  // signIn là hàm được lấy từ AuthContext — nơi lưu trạng thái đăng nhập
  const { signIn } = useAuth()
  // useNavigate cho phép chuyển trang bằng code (thay vì click link)
  const navigate = useNavigate()

  // Lưu dữ liệu form vào state dưới dạng object
  const [form, setForm] = useState({ email: '', password: '' })
  // Trạng thái "đang xử lý" — dùng để disable nút tránh click nhiều lần
  const [loading, setLoading] = useState(false)

  // Hàm xử lý khi người dùng bấm nút "Đăng nhập"
  async function handleSubmit(e) {
    e.preventDefault() // ngăn trình duyệt tải lại trang (hành vi mặc định của form)
    setLoading(true)
    try {
      await signIn(form.email, form.password) // gọi Supabase Auth
      navigate('/')  // đăng nhập thành công → về trang chính
    } catch (err) {
      // Nếu lỗi → hiện thông báo đỏ ở góc màn hình
      toast.error(err.message || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false) // dù thành công hay lỗi đều tắt trạng thái loading
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo và tiêu đề */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 text-white rounded-full p-3 mb-3">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">EduQuizMaster</h1>
          <p className="text-gray-500 text-sm mt-1">Ứng dụng ôn tập trực tuyến dành cho học sinh THCS</p>
        </div>

        {/* Form: onSubmit gọi handleSubmit khi bấm nút hoặc Enter */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              // Mỗi lần gõ: cập nhật form.email, giữ nguyên các trường khác (...form)
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            
           
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>
          {/* disabled khi đang loading → tránh click nhiều lần */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
