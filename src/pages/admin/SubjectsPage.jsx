import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, Pencil, Users, Check } from 'lucide-react'

const COLOR_OPTIONS = [
  { label: 'Indigo',  value: 'indigo',  bg: 'bg-indigo-500' },
  { label: 'Blue',    value: 'blue',    bg: 'bg-blue-500'   },
  { label: 'Green',   value: 'green',   bg: 'bg-green-500'  },
  { label: 'Red',     value: 'red',     bg: 'bg-red-500'    },
  { label: 'Purple',  value: 'purple',  bg: 'bg-purple-500' },
  { label: 'Orange',  value: 'orange',  bg: 'bg-orange-500' },
  { label: 'Pink',    value: 'pink',    bg: 'bg-pink-500'   },
]

const COLOR_BG_MAP = {
  indigo: 'bg-indigo-500',
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink:   'bg-pink-500',
}

// ---- SubjectModal ----
function SubjectModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || 'indigo')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Vui lòng nhập tên môn học'); return }
    setSaving(true)
    try {
      if (initial?.id) {
        const { error } = await supabase
          .from('subjects')
          .update({ name: name.trim(), color })
          .eq('id', initial.id)
        if (error) throw error
        toast.success('Đã cập nhật môn học')
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({ name: name.trim(), color })
        if (error) throw error
        toast.success('Đã thêm môn học')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {initial?.id ? 'Sửa môn học' : 'Thêm môn học'}
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên môn học
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="VD: Tin học, Toán, Ngữ văn..."
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Màu sắc
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  title={opt.label}
                  className={`w-8 h-8 rounded-full ${opt.bg} flex items-center justify-center transition
                    ring-offset-2 ${color === opt.value ? 'ring-2 ring-gray-700 scale-110' : 'hover:scale-105'}`}
                >
                  {color === opt.value && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 font-medium transition disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([]) // [{teacher_id, subject_id}]
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [modal, setModal] = useState(null) // null | { mode: 'add' } | { mode: 'edit', subject }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ---- Fetch subjects ----
  async function fetchSubjects() {
    setLoadingSubjects(true)
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (error) { toast.error('Không thể tải danh sách môn học'); }
    else setSubjects(data || [])
    setLoadingSubjects(false)
  }

  // ---- Fetch teachers ----
  async function fetchTeachers() {
    setLoadingTeachers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['teacher', 'admin'])
      .order('full_name')
    if (error) toast.error('Không thể tải danh sách giáo viên')
    else setTeachers(data || [])
    setLoadingTeachers(false)
  }

  // ---- Fetch teacher_subjects for a given subject ----
  async function fetchTeacherSubjects(subjectId) {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('teacher_id, subject_id')
      .eq('subject_id', subjectId)
    if (error) toast.error('Không thể tải phân công giáo viên')
    else setTeacherSubjects(data || [])
  }

  useEffect(() => {
    fetchSubjects()
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      fetchTeacherSubjects(selectedSubject.id)
    } else {
      setTeacherSubjects([])
    }
  }, [selectedSubject])

  // ---- Select subject (keep in sync after edits) ----
  function selectSubject(subject) {
    setSelectedSubject(subject)
  }

  // ---- Delete subject ----
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      toast.error('Xóa thất bại: ' + error.message)
    } else {
      toast.success(`Đã xóa môn "${deleteTarget.name}"`)
      if (selectedSubject?.id === deleteTarget.id) setSelectedSubject(null)
      await fetchSubjects()
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  // ---- Toggle teacher assignment ----
  async function toggleTeacher(teacherId) {
    if (!selectedSubject) return
    setTogglingId(teacherId)
    const isAssigned = teacherSubjects.some(ts => ts.teacher_id === teacherId)
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('teacher_subjects')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('subject_id', selectedSubject.id)
        if (error) throw error
        setTeacherSubjects(prev => prev.filter(ts => ts.teacher_id !== teacherId))
        toast.success('Đã bỏ phân công')
      } else {
        const { error } = await supabase
          .from('teacher_subjects')
          .insert({ teacher_id: teacherId, subject_id: selectedSubject.id })
        if (error) throw error
        setTeacherSubjects(prev => [...prev, { teacher_id: teacherId, subject_id: selectedSubject.id }])
        toast.success('Đã phân công giáo viên')
      }
    } catch (err) {
      toast.error(err.message || 'Thao tác thất bại')
    } finally {
      setTogglingId(null)
    }
  }

  // ---- After modal saved ----
  async function onModalSaved() {
    await fetchSubjects()
    // If editing selected subject, re-sync
    if (modal?.mode === 'edit' && modal.subject?.id === selectedSubject?.id) {
      // Updated subject data will be refreshed; clear selection to avoid stale state
      setSelectedSubject(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý môn học</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ============ LEFT PANEL: Subject list ============ */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-700">Danh sách môn học</span>
              <button
                onClick={() => setModal({ mode: 'add' })}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={15} />
                Thêm môn
              </button>
            </div>

            {/* List */}
            {loadingSubjects ? (
              <div className="py-10 text-center text-gray-400 text-sm">Đang tải...</div>
            ) : subjects.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Chưa có môn học nào</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {subjects.map(subject => {
                  const isSelected = selectedSubject?.id === subject.id
                  const colorBg = COLOR_BG_MAP[subject.color] || 'bg-indigo-500'
                  return (
                    <li
                      key={subject.id}
                      onClick={() => selectSubject(subject)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition
                        ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      {/* Color dot */}
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colorBg}`} />

                      {/* Name */}
                      <span className={`flex-1 text-sm font-medium truncate
                        ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {subject.name}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setModal({ mode: 'edit', subject })}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(subject)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ============ RIGHT PANEL: Teacher assignment ============ */}
        <div className="flex-1 min-w-0">
          {!selectedSubject ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full min-h-48
              flex flex-col items-center justify-center text-gray-400 gap-2 py-16">
              <Users size={40} className="text-gray-300" />
              <p className="text-sm">Chọn một môn học để phân công giáo viên</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full flex-shrink-0
                  ${COLOR_BG_MAP[selectedSubject.color] || 'bg-indigo-500'}`}
                />
                <h2 className="font-semibold text-gray-700 text-base">
                  Phân công giáo viên —{' '}
                  <span className="text-indigo-600">{selectedSubject.name}</span>
                </h2>
              </div>

              {/* Teacher list */}
              {loadingTeachers ? (
                <div className="py-10 text-center text-gray-400 text-sm">Đang tải...</div>
              ) : teachers.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  Chưa có giáo viên nào trong hệ thống
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {teachers.map(teacher => {
                    const isAssigned = teacherSubjects.some(ts => ts.teacher_id === teacher.id)
                    const isToggling = togglingId === teacher.id
                    return (
                      <li
                        key={teacher.id}
                        className="flex items-center gap-4 px-5 py-3"
                      >
                        {/* Avatar placeholder */}
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center
                          justify-center text-sm font-bold flex-shrink-0">
                          {teacher.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        {/* Name + role */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {teacher.full_name || '(Chưa có tên)'}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">{teacher.role}</p>
                        </div>

                        {/* Toggle button */}
                        <button
                          onClick={() => toggleTeacher(teacher.id)}
                          disabled={isToggling}
                          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition
                            disabled:opacity-60
                            ${isAssigned
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                          {isToggling ? (
                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isAssigned ? (
                            <>
                              <Check size={14} strokeWidth={2.5} />
                              Đã phân công
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              Phân công
                            </>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============ Add / Edit Modal ============ */}
      {modal && (
        <SubjectModal
          initial={modal.mode === 'edit' ? modal.subject : null}
          onClose={() => setModal(null)}
          onSaved={onModalSaved}
        />
      )}

      {/* ============ Delete Confirmation Modal ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Xác nhận xóa</h2>
            <p className="text-gray-600 text-sm mb-6">
              Bạn có chắc muốn xóa môn{' '}
              <span className="font-semibold text-red-600">"{deleteTarget.name}"</span>?
              Tất cả chủ đề, bài học và câu hỏi thuộc môn này cũng sẽ bị xóa.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-medium transition disabled:opacity-60"
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
