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
  const { topics } = useTopics()
  const { grades: GRADES } = useGrades()
  const { subjects } = useSubjects()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filterGrade, setFilterGrade] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterSubject, setFilterSubject] = useState('')

  // Set default subject filter when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !filterSubject) {
      setFilterSubject(subjects[0].id)
    }
  }, [subjects])

  useEffect(() => { fetchQuestions() }, [filterGrade, filterTopic, filterSubject])

  async function fetchQuestions() {
    setLoading(true)
    let query = supabase.from('questions').select('*').order('created_at', { ascending: false })
    if (filterGrade) query = query.eq('grade', filterGrade)
    if (filterTopic) query = query.eq('topic', filterTopic)
    if (filterSubject) query = query.eq('subject_id', filterSubject)
    const { data, error } = await query
    if (error) toast.error('Lỗi tải câu hỏi')
    else setQuestions(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) toast.error('Xóa thất bại')
    else { toast.success('Đã xóa'); fetchQuestions() }
  }

  const topicNames = topics.map(t => t.name)

  return (
    <div className="p-4 md:p-8">
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

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {subjects.length > 0 && (
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả môn</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả khối</option>
          {GRADES.map(g => <option key={g} value={g}>Khối {g}</option>)}
        </select>
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

      {/* Question list */}
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
          {questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i + 1} onDelete={() => handleDelete(q.id)} onUpdate={fetchQuestions} />
          ))}
        </div>
      )}

      {showCreate && (
        <QuestionFormModal
          defaultSubjectId={filterSubject}
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); fetchQuestions() }}
        />
      )}

      {showImport && (
        <QuestionImportModal
          onClose={() => setShowImport(false)}
          onSaved={() => { setShowImport(false); fetchQuestions() }}
          grades={GRADES}
          topics={topicNames}
        />
      )}
    </div>
  )
}
