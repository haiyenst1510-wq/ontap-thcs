// ============================================================
// QuestionsPage.jsx — Trang ngân hàng câu hỏi (giáo viên)
// ------------------------------------------------------------
// Chức năng:
//   - Xem danh sách câu hỏi (lọc theo môn / khối / chủ đề)
//   - Tạo câu hỏi mới (mở QuestionFormModal)
//   - Nhập hàng loạt từ file CSV/Excel (mở QuestionImportModal)
//   - Xóa câu hỏi
//
// Câu hỏi hỗ trợ nhiều loại: trắc nghiệm, đúng/sai,
// điền từ, nối đôi, sắp xếp, kéo thả từ.
// ============================================================

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useTopics } from '../../hooks/useTopics'
import { useGrades } from '../../hooks/useGrades'
import { useSubjects } from '../../hooks/useSubjects'
import QuestionImportModal from '../../components/teacher/QuestionImportModal'
import QuestionCard from '../../components/teacher/QuestionCard'
import QuestionFormModal from '../../components/teacher/QuestionFormModal'
import toast from 'react-hot-toast'
import { Upload, Plus } from 'lucide-react'

export default function QuestionsPage() {
  // Lấy dữ liệu từ hooks — các hook tự xử lý việc gọi Supabase
  const { topics } = useTopics()
  const { grades: GRADES } = useGrades()
  const { subjects } = useSubjects() // GV chỉ thấy môn mình được phân công

  // Danh sách câu hỏi sau khi fetch từ database
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  // Điều khiển hiện/ẩn modal
  const [showImport, setShowImport] = useState(false) // modal nhập hàng loạt
  const [showCreate, setShowCreate] = useState(false) // modal tạo câu hỏi mới

  // Bộ lọc
  const [filterGrade, setFilterGrade] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterSubject, setFilterSubject] = useState('')

  // Khi subjects load xong → tự chọn môn đầu tiên
  useEffect(() => {
    if (subjects.length > 0 && !filterSubject) {
      setFilterSubject(subjects[0].id)
    }
  }, [subjects])

  // Gọi lại fetchQuestions mỗi khi bộ lọc thay đổi hoặc subjects load xong
  // subjects phải có dữ liệu mới gọi — tránh fetch với mảng rỗng
  useEffect(() => { if (subjects.length > 0) fetchQuestions() }, [filterGrade, filterTopic, filterSubject, subjects])

  // Lấy câu hỏi từ Supabase với các bộ lọc hiện tại
  async function fetchQuestions() {
    setLoading(true)
    // Bắt đầu xây dựng query — các bước sau sẽ thêm điều kiện lọc vào
    let query = supabase.from('questions').select('*').order('created_at', { ascending: false })

    if (filterGrade) query = query.eq('grade', filterGrade)        // lọc khối
    if (filterTopic) query = query.eq('topic', filterTopic)        // lọc chủ đề

    if (filterSubject) {
      query = query.eq('subject_id', filterSubject)                // lọc 1 môn cụ thể
    } else {
      // Nếu "tất cả môn": chỉ lấy câu hỏi của các môn được phân công
      // .in() = WHERE subject_id IN (id1, id2, id3) trong SQL
      const ids = subjects.map(s => s.id)
      query = query.in('subject_id', ids)
    }

    const { data, error } = await query
    if (error) toast.error('Lỗi tải câu hỏi')
    else setQuestions(data || [])
    setLoading(false)
  }

  // Xóa câu hỏi khỏi database
  async function handleDelete(id) {
    const { data: deleted, error } = await supabase.from('questions').delete().eq('id', id).select()
    if (error) toast.error('Xóa thất bại: ' + error.message)
    else if (!deleted || deleted.length === 0) toast.error('Không có quyền xóa')
    else { toast.success('Đã xóa'); fetchQuestions() }
  }

  // Tính danh sách tên chủ đề cho dropdown lọc
  // Chỉ hiện chủ đề thuộc môn/khối đang lọc — tránh lẫn chủ đề môn khác
  const assignedSubjectIds = new Set(subjects.map(s => s.id))
  const topicNames = topics.filter(t =>
    assignedSubjectIds.has(t.subject_id) &&                            // thuộc môn được phân công
    (!filterGrade || t.grade === filterGrade) &&                       // đúng khối đang lọc
    (!filterSubject || t.subject_id === filterSubject)                 // đúng môn đang lọc
  ).map(t => t.name) // chỉ lấy tên, không cần toàn bộ object

  return (
    <div className="p-4 md:p-8">
      {/* Header: tiêu đề + 2 nút */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ngân hàng câu hỏi</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Plus size={16} /> Tạo câu hỏi
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Upload size={16} /> Nhập câu hỏi
          </button>
        </div>
      </div>

      {/* Bộ lọc: môn → khối → chủ đề (thứ tự quan trọng — thay đổi môn/khối sẽ reset chủ đề) */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {subjects.length > 0 && (
          <select
            value={filterSubject}
            // Khi đổi môn: reset filterTopic để tránh hiện chủ đề môn cũ
            onChange={e => { setFilterSubject(e.target.value); setFilterTopic('') }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả môn</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select
          value={filterGrade}
          onChange={e => { setFilterGrade(e.target.value); setFilterTopic('') }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả khối</option>
          {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
        {/* Dropdown chủ đề được lọc theo môn + khối đang chọn */}
        <select
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả chủ đề</option>
          {topicNames.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-gray-500 text-sm self-center">{questions.length} câu hỏi</span>
      </div>

      {/* Danh sách câu hỏi */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Chưa có câu hỏi nào</p>
          <p className="text-sm mt-1">Bấm "Nhập câu hỏi" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Render từng câu hỏi bằng component QuestionCard */}
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i + 1}
              onDelete={() => handleDelete(q.id)}
              onUpdate={fetchQuestions} // callback: khi sửa xong → tải lại danh sách
            />
          ))}
        </div>
      )}

      {/* Modal tạo câu hỏi mới — chỉ render khi showCreate = true */}
      {showCreate && (
        <QuestionFormModal
          defaultSubjectId={filterSubject} // điền sẵn môn đang lọc
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); fetchQuestions() }}
        />
      )}

      {/* Modal nhập hàng loạt từ file */}
      {showImport && (
        <QuestionImportModal
          onClose={() => setShowImport(false)}
          onSaved={() => { setShowImport(false); fetchQuestions() }}
          grades={GRADES}
          topics={topics.filter(t => assignedSubjectIds.has(t.subject_id))}
          subjects={subjects}
        />
      )}
    </div>
  )
}
