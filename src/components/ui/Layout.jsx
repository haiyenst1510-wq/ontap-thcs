import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LogOut, LayoutDashboard, PenSquare, ClipboardList,
  BarChart2, Tags, Menu, X, TableProperties,
  BookMarked, Layers, Users, GraduationCap,
} from 'lucide-react'

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isStudent = profile?.role === 'student'
  const isAdmin = profile?.role === 'admin'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const teacherItems = [
    { to: '/teacher', icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
    { to: '/teacher/questions', icon: <PenSquare size={18} />, label: 'Câu hỏi' },
    { to: '/teacher/topics', icon: <Tags size={18} />, label: 'Chủ đề' },
    { to: '/teacher/exams', icon: <ClipboardList size={18} />, label: 'Đề thi' },
    { to: '/teacher/exam-stats', icon: <TableProperties size={18} />, label: 'Thống kê' },
    { to: '/teacher/lessons', icon: <BookMarked size={18} />, label: 'Bài học' },
    
    ...(isAdmin ? [
      null,
      { to: '/teacher/grades', icon: <GraduationCap size={18} />, label: 'Khối' },
      { to: '/admin/subjects', icon: <Layers size={18} />, label: 'Môn học' },
      { to: '/admin/users', icon: <Users size={18} />, label: 'Người dùng' },
    ] : []),
  ]

  const studentItems = [
    { to: '/student', icon: <LayoutDashboard size={18} />, label: 'Trang chủ' },
    { to: '/student/learn', icon: <BookMarked size={18} />, label: 'Học tập' },
    { to: '/student/exams', icon: <ClipboardList size={18} />, label: 'Đề thi' },
    { to: '/student/practice', icon: <PenSquare size={18} />, label: 'Luyện tập' },
    { to: '/student/history', icon: <BarChart2 size={18} />, label: 'Kết quả' },
  ]

  const navItems = isStudent ? studentItems : teacherItems

  function NavLinks({ onLinkClick }) {
    return (
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) =>
          item === null ? (
            <div key={`sep-${i}`} className="my-2 border-t border-indigo-600 opacity-50" />
          ) : (
            <Link
              key={item.to}
              to={item.to}
              onClick={onLinkClick}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${location.pathname === item.to
                  ? 'bg-white text-indigo-700'
                  : 'text-indigo-100 hover:bg-indigo-600'}`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        )}
      </nav>
    )
  }

  function UserFooter() {
    const roleLabel = profile?.role === 'admin' ? 'Quản trị viên'
      : profile?.role === 'teacher' ? 'Giáo viên'
      : `Học sinh khối ${profile?.grade}`
    return (
      <div className="px-3 py-4 border-t border-indigo-600">
        <div className="text-xs text-indigo-300 mb-1 px-3">{profile?.full_name}</div>
        <div className="text-xs text-indigo-400 mb-3 px-3">{roleLabel}</div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-200 hover:text-white hover:bg-indigo-600 rounded-lg w-full transition"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden bg-indigo-700 text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="logo" className="w-7 h-7" />
          <span className="font-bold">EduQuizMaster</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-indigo-200 hover:text-white p-1">
          <Menu size={22} />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-violet-700 text-white flex-col shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-indigo-600">
          <img src="/icon.png" alt="logo" className="w-8 h-8" />
          <span className="font-bold text-lg">EduQuizMaster</span>
        </div>
        <NavLinks />
        <UserFooter />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="w-64 bg-indigo-700 text-white flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-5 border-b border-indigo-600">
              <div className="flex items-center gap-2">
                <img src="/icon.png" alt="logo" className="w-8 h-8" />
                <span className="font-bold text-lg">EduQuizMaster</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-indigo-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <NavLinks onLinkClick={() => setSidebarOpen(false)} />
            <UserFooter />
          </aside>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
