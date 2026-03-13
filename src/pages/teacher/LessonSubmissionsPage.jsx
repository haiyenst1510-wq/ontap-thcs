import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, MessageSquare, CheckCircle, Loader2, X } from 'lucide-react'

export default function LessonSubmissionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [lesson, setLesson] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)

    const [{ data: lessonData }, { data: subData }] = await Promise.all([
      supabase.from('lessons').select('id, title').eq('id', id).single(),
      supabase.from('lesson_submissions').select('*').eq('lesson_id', id).order('submitted_at', { ascending: false }),
    ])

    setLesson(lessonData || null)
    const subs = subData || []

    // Fetch profiles for all submitting users (2-step)
    if (subs.length > 0) {
      const userIds = [...new Set(subs.map(s => s.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, class_name, grade')
        .in('id', userIds)
      const pm = {}
      ;(profiles || []).forEach(p => { pm[p.id] = p })
      setProfileMap(pm)
    }

    // Sort: unreviewed first, then by submitted_at desc
    const sorted = [...subs].sort((a, b) => {
      const aReviewed = !!a.reviewed_at
      const bReviewed = !!b.reviewed_at
      if (aReviewed !== bReviewed) return aReviewed ? 1 : -1
      return new Date(b.submitted_at) - new Date(a.submitted_at)
    })

    setSubmissions(sorted)
    setLoading(false)
  }

  function openDetail(sub) {
    setSelected(sub)
    setComment(sub.teacher_comment || '')
    setSavedId(null)
  }

  async function saveComment() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('lesson_submissions').update({
      teacher_comment: comment,
      reviewed_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setSaving(false)
    if (error) {
      toast.error('Lưu thất bại: ' + error.message)
    } else {
      toast.success('Đã lưu nhận xét')
      setSavedId(selected.id)
      // Update local state
      setSubmissions(prev => prev.map(s =>
        s.id === selected.id
          ? { ...s, teacher_comment: comment, reviewed_at: new Date().toISOString() }
          : s
      ))
      setSelected(prev => prev ? { ...prev, teacher_comment: comment, reviewed_at: new Date().toISOString() } : prev)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/teacher/lessons')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition"
      >
        <ArrowLeft size={16} /> Bài học
      </button>

      <h1 className="text-xl font-bold text-gray-800 mb-1">
        Bài nộp: {lesson?.title || 'Bài học'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{submissions.length} bài nộp</p>

      {selected ? (
        /* ── Detail view ── */
        <div>
          <button
            onClick={() => { setSelected(null); setSavedId(null) }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
          >
            <ArrowLeft size={14} /> Danh sách
          </button>

          {/* Student info header */}
          <div className="bg-indigo-600 text-white rounded-xl px-5 py-4 mb-5">
            <p className="font-semibold text-base">{profileMap[selected.user_id]?.full_name || 'Học sinh'}</p>
            <p className="text-indigo-200 text-sm mt-0.5">
              {profileMap[selected.user_id]?.class_name
                ? `Lớp ${profileMap[selected.user_id].class_name}`
                : profileMap[selected.user_id]?.grade
                  ? `Khối ${profileMap[selected.user_id].grade}`
                  : ''}
              {' · '}Nộp lúc {new Date(selected.submitted_at).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Submission content */}
          <div className="space-y-4 mb-6">
            {selected.text_content && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nội dung</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.text_content}</p>
              </div>
            )}
            {selected.file_url && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ảnh minh chứng</p>
                <img
                  src={selected.file_url}
                  alt="Bài nộp"
                  className="rounded-xl border border-gray-200 max-h-80 object-contain"
                />
              </div>
            )}
            {!selected.text_content && !selected.file_url && (
              <p className="text-sm text-gray-400 italic">Học sinh không để lại nội dung</p>
            )}
          </div>

          {/* Teacher comment */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={16} className="text-indigo-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Nhận xét của giáo viên</h3>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="Nhập nhận xét cho học sinh..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={saveComment}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Lưu nhận xét
              </button>
              {savedId === selected.id && (
                <span className="text-sm text-green-600 font-medium">Đã lưu ✓</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── List view ── */
        <>
          {submissions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg">Chưa có bài nộp nào</p>
              <p className="text-sm mt-1">Học sinh chưa nộp bài thực hành</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => {
                const profile = profileMap[sub.user_id]
                const reviewed = !!sub.reviewed_at
                const preview = sub.text_content
                  ? sub.text_content.slice(0, 60) + (sub.text_content.length > 60 ? '...' : '')
                  : null

                return (
                  <div
                    key={sub.id}
                    onClick={() => openDetail(sub)}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition"
                  >
                    {/* Avatar placeholder */}
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 text-sm">{profile?.full_name || 'Học sinh'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${reviewed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {reviewed ? 'Đã nhận xét ✓' : 'Chưa nhận xét'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {profile?.class_name ? `Lớp ${profile.class_name}` : profile?.grade ? `Khối ${profile.grade}` : ''}
                        {' · '}{new Date(sub.submitted_at).toLocaleString('vi-VN')}
                      </p>
                      {preview && (
                        <p className="text-sm text-gray-500 mt-1 truncate">{preview}</p>
                      )}
                      {sub.file_url && (
                        <div className="mt-2">
                          <img
                            src={sub.file_url}
                            alt="thumb"
                            className="h-12 w-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
