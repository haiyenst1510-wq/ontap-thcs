import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PenSquare, BarChart2, BookOpen, FileText } from 'lucide-react'

export default function StudentDashboard() {
  const { profile } = useAuth()

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Xin chào, {profile?.full_name}!
      </h1>
      <p className="text-gray-500 mb-8">Lớp {profile?.grade} — Hôm nay ôn bài gì nhỉ?</p>

      <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-xl">
        <Link
          to="/student/learn"
          className="flex flex-col items-center justify-center gap-2 md:gap-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-4 md:p-8 transition shadow"
        >
          <BookOpen size={28} className="md:hidden" />
          <BookOpen size={36} className="hidden md:block" />
          <span className="text-base md:text-lg font-semibold">Học tập</span>
          <span className="text-indigo-200 text-xs md:text-sm text-center">Xem bài học theo chủ đề</span>
        </Link>

        <Link
          to="/student/exams"
          className="flex flex-col items-center justify-center gap-2 md:gap-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-4 md:p-8 transition shadow border border-gray-200"
        >
          <FileText size={28} className="text-indigo-600 md:hidden" />
          <FileText size={36} className="text-indigo-600 hidden md:block" />
          <span className="text-base md:text-lg font-semibold">Đề thi</span>
          <span className="text-gray-400 text-xs md:text-sm text-center">Làm bài kiểm tra</span>
        </Link>

        <Link
          to="/student/practice"
          className="flex flex-col items-center justify-center gap-2 md:gap-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-4 md:p-8 transition shadow border border-gray-200"
        >
          <PenSquare size={28} className="text-indigo-600 md:hidden" />
          <PenSquare size={36} className="text-indigo-600 hidden md:block" />
          <span className="text-base md:text-lg font-semibold">Luyện tập</span>
          <span className="text-gray-400 text-xs md:text-sm text-center">Ôn bài theo chủ đề</span>
        </Link>

        <Link
          to="/student/history"
          className="flex flex-col items-center justify-center gap-2 md:gap-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl p-4 md:p-8 transition shadow border border-gray-200"
        >
          <BarChart2 size={28} className="text-indigo-600 md:hidden" />
          <BarChart2 size={36} className="text-indigo-600 hidden md:block" />
          <span className="text-base md:text-lg font-semibold">Kết quả</span>
          <span className="text-gray-400 text-xs md:text-sm text-center">Xem lại lần làm bài</span>
        </Link>
      </div>
    </div>
  )
}
