import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PenSquare, BarChart2 } from 'lucide-react'

export default function StudentDashboard() {
  const { profile } = useAuth()

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Xin chào, {profile?.full_name}!
      </h1>
      <p className="text-gray-500 mb-8">Lớp {profile?.grade} — Hôm nay ôn bài gì nhỉ?</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
        <Link
          to="/student/practice"
          className="flex flex-col items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-8 transition shadow"
        >
          <PenSquare size={36} />
          <span className="text-lg font-semibold">Luyện tập</span>
          <span className="text-indigo-200 text-sm text-center">Ôn bài theo chủ đề, tự chọn số câu</span>
        </Link>

        <Link
          to="/student/history"
          className="flex flex-col items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-8 transition shadow border border-gray-200"
        >
          <BarChart2 size={36} className="text-indigo-600" />
          <span className="text-lg font-semibold">Kết quả</span>
          <span className="text-gray-400 text-sm text-center">Xem lại các lần làm bài</span>
        </Link>
      </div>
    </div>
  )
}
