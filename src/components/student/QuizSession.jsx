// ============================================================
// QuizSession.jsx — Component làm bài (dùng cho cả thi & luyện tập)
// ------------------------------------------------------------
// Đây là component PHỨC TẠP NHẤT trong app — xử lý toàn bộ
// luồng làm bài từ lúc bắt đầu đến khi nộp.
//
// Props nhận vào:
//   questions    - mảng các câu hỏi cần làm
//   mode         - 'exam' hoặc 'practice'
//   timeLimit    - thời gian (phút), null = không giới hạn
//   examMode     - true nếu làm đề thi chính thức
//   examId       - id của đề thi (dùng để lưu kết quả)
//   attemptNumber - lần làm thứ mấy
//   showAnswer   - true = hiện đáp án đúng/sai ngay sau mỗi câu
//   showScore    - true = hiện điểm sau khi nộp
//   onFinish     - hàm gọi khi học sinh xong bài
// ============================================================

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, XCircle, Clock, ChevronRight, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react'

// Chuẩn hóa mảng options về dạng [{key, text}]
// Xử lý nhiều định dạng dữ liệu khác nhau trong database:
//   - ["small", "big", ...]          → [{key:"A",text:"small"}, ...]
//   - [{key:"A",text:"small"}, ...]  → giữ nguyên (đúng rồi)
//   - [{"A":"small"}, ...]           → [{key:"A",text:"small"}, ...]
function normalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options.map((opt, i) => {
    const fallbackKey = String.fromCharCode(65 + i) // A, B, C, D, ...
    if (typeof opt === 'string') return { key: fallbackKey, text: opt, image_url: '' }
    if (!opt || typeof opt !== 'object') return { key: fallbackKey, text: String(opt ?? ''), image_url: '' }
    if (opt.key !== undefined && opt.text !== undefined) return opt // định dạng đúng
    // Thử lấy từ key đơn: {"A": "small"} → {key:"A", text:"small"}
    const keys = Object.keys(opt)
    if (keys.length >= 1 && keys[0].length === 1) return { key: keys[0], text: opt[keys[0]], image_url: opt.image_url || '' }
    return { key: fallbackKey, text: opt.text || opt.value || opt.label || '', image_url: opt.image_url || '' }
  })
}

// Hàm trộn ngẫu nhiên một mảng (thuật toán Fisher-Yates)
// Dùng để trộn đáp án trắc nghiệm và từ kéo thả
function shuffle(arr) {
  const a = [...arr] // tạo bản sao để không làm thay đổi mảng gốc
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]] // hoán đổi 2 phần tử
  }
  return a
}

// Kiểm tra đáp án học sinh có đúng không
// Mỗi loại câu hỏi có cách so sánh khác nhau
function normalizeAnswer(type, ans, correct) {
  if (!ans) return false
  if (type === 'word_order') {
    // Học sinh lưu: "She,is,a,teacher" → nối lại thành "She is a teacher" rồi so sánh
    const studentSentence = ans.split(',').map(w => w.trim()).join(' ')
    return studentSentence.toLowerCase() === (correct || '').trim().toLowerCase()
  }
  if (type === 'matching') {
    // Câu nối đôi: "A-1,B-2" và "B-2,A-1" đều đúng → sort trước khi so sánh
    const norm = s => s?.split(',').map(p => p.trim()).sort().join(',')
    return norm(ans) === norm(correct)
  }
  if (type === 'drag_word') {
    // Kéo thả từ: thứ tự quan trọng, so sánh từng từ
    const a = ans.split(',').map(w => w.trim().toLowerCase())
    const c = (correct || '').split(',').map(w => w.trim().toLowerCase())
    return a.length === c.length && a.every((w, i) => w === c[i])
  }
  if (type === 'fill_blank') {
    const correctParts = (correct || '').split(',').map(a => a.trim().toLowerCase())
    if (correctParts.length <= 1) {
      return ans.toLowerCase() === (correct || '').toLowerCase()
    }
    // Nhiều khoảng trống: so sánh từng phần
    const ansParts = ans.split(',').map(a => a.trim().toLowerCase())
    return ansParts.length === correctParts.length && ansParts.every((a, i) => a === correctParts[i])
  }
  // Các loại còn lại: so sánh chuỗi (không phân biệt hoa thường)
  return ans.toLowerCase() === (correct || '').toLowerCase()
}

export default function QuizSession({
  questions, mode, timeLimit, onFinish,
  examMode = false, examId = null, attemptNumber = 1,
  showAnswer = true, showScore = true,
}) {
  const { user } = useAuth()

  // --- State quản lý tiến trình làm bài ---
  const [current, setCurrent] = useState(0)      // chỉ số câu đang làm (0 = câu 1)
  const [answers, setAnswers] = useState({})      // { 0: 'A', 1: 'Đúng', 2: 'Paris', ... }
  const [selected, setSelected] = useState(null)  // đáp án đang được chọn (chưa xác nhận)
  const [confirmed, setConfirmed] = useState(false) // đã bấm "Xác nhận" chưa?
  const [showResult, setShowResult] = useState(false) // hiện màn hình kết quả?

  // Đếm ngược thời gian — chuyển phút thành giây
  const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : null)

  // useEffect chạy mỗi giây để đếm ngược
  useEffect(() => {
    if (timeLeft === null) return   // không có giới hạn thời gian
    if (timeLeft <= 0) { handleFinish(); return } // hết giờ → tự nộp
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000) // giảm 1 giây
    return () => clearTimeout(t)   // cleanup: hủy timeout khi component unmount
  }, [timeLeft])

  const q = questions[current]              // câu hỏi hiện tại
  const isLastQuestion = current === questions.length - 1 // có phải câu cuối không?

  // Học sinh chọn đáp án
  function handleSelect(answer) {
    if (confirmed && showAnswer) return // đã xác nhận rồi → không cho đổi
    setSelected(answer)
    if (!showAnswer) {
      // Chế độ thi nghiêm túc (showAnswer=false): lưu ngay, không cần xác nhận
      setAnswers(prev => ({ ...prev, [current]: answer }))
    }
  }

  // Bấm "Xác nhận" — lưu đáp án và hiện kết quả đúng/sai
  function handleConfirm() {
    if (!selected || !showAnswer) return
    setAnswers(prev => ({ ...prev, [current]: selected }))
    setConfirmed(true) // kích hoạt hiện màu đúng/sai
  }

  // Chuyển sang câu tiếp theo (hoặc nộp bài nếu là câu cuối)
  function handleNext() {
    if (isLastQuestion) {
      handleFinish()
    } else {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      // Khôi phục đáp án đã chọn trước đó (nếu quay lại câu này)
      setSelected(answers[nextIndex] || null)
      setConfirmed(false)
    }
  }

  // Nhảy đến câu bất kỳ từ panel điều hướng bên phải
  function jumpTo(index) {
    // Lưu đáp án câu hiện tại trước khi nhảy
    if (selected && !confirmed) {
      setAnswers(prev => ({ ...prev, [current]: selected }))
    }
    setCurrent(index)
    setSelected(answers[index] || null)
    setConfirmed(false)
  }

  // Nộp bài và tính điểm
  async function handleFinish() {
    // Gộp đáp án cuối cùng (bao gồm cả câu đang làm dở)
    const finalAnswers = { ...answers }
    if (selected && !confirmed) finalAnswers[current] = selected

    // Đếm số câu đúng
    let correct = 0
    questions.forEach((q, i) => {
      if (normalizeAnswer(q.type, finalAnswers[i], q.correct_answer)) correct++
    })
    // Tính điểm theo thang 10, làm tròn 1 chữ số thập phân
    const score = Math.round((correct / questions.length) * 10 * 10) / 10

    try {
      if (examMode && examId) {
        // Lưu kết quả vào bảng quiz_sessions (đề thi chính thức)
        await supabase.from('quiz_sessions').insert({
          exam_id: examId,
          user_id: user.id,
          mode: 'exam',
          total: questions.length,
          correct,
          score,
          answers: finalAnswers,     // lưu toàn bộ đáp án dưới dạng JSON
          question_ids: questions.map(q => q.id),
          attempt_number: attemptNumber,
          submitted_at: new Date().toISOString(),
        })
      } else {
        // Lưu kết quả luyện tập (không gắn với đề thi nào)
        await supabase.from('quiz_sessions').insert({
          user_id: user.id,
          mode,
          total: questions.length,
          correct,
          score,
          answers: finalAnswers,
          question_ids: questions.map(q => q.id), // lưu id các câu để xem lại
        })
      }
    } catch {} // bỏ qua lỗi lưu (không ảnh hưởng giao diện)

    setAnswers(finalAnswers)
    setShowResult(true) // chuyển sang màn hình kết quả
  }

  // Nếu đã nộp → hiện component QuizResult
  if (showResult) {
    return (
      <QuizResult
        questions={questions}
        answers={answers}
        onRetry={onFinish}
        examMode={examMode}
        showScore={showScore}
      />
    )
  }

  const isCorrect = confirmed && normalizeAnswer(q.type, selected, q.correct_answer)
  // Đếm số câu đã trả lời (dùng cho thanh tiến trình)
  const answeredCount = showAnswer
    ? Object.keys(answers).length + (selected && !confirmed ? 1 : 0)
    : Object.keys(answers).length

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-col md:flex-row w-full">

        {/* ===== PHẦN CHÍNH: câu hỏi + đáp án ===== */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-gray-50">
          {/* Dòng trạng thái: số câu + đồng hồ lớn */}
          <div className="flex items-start justify-between mb-4 max-w-3xl mx-auto gap-4">
            <span className="text-sm text-gray-500 pt-1">
              Câu <span className="font-bold text-gray-800">{current + 1}</span> / {questions.length}
            </span>
            {timeLeft !== null && (
              // Khung đồng hồ lớn — đổi màu đỏ khi còn < 60 giây
              <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 shadow-sm
                ${timeLeft < 60
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-indigo-200 bg-white text-indigo-700'}`}>
                <Clock size={20} />
                {/* Hiển thị mm:ss cỡ lớn */}
                <span className="text-3xl font-bold tabular-nums tracking-tight">
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Thanh tiến trình — chiều rộng tỉ lệ với số câu đã làm */}
          <div className="h-2 bg-gray-200 rounded-full mb-8 max-w-3xl mx-auto">
            <div
              className="h-2 bg-indigo-600 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          {/* Nội dung câu hỏi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-5 max-w-3xl mx-auto shadow-sm">
            {/* Phát audio nếu câu hỏi có đính kèm file âm thanh */}
            {q.audio_url && (
              <div className="mb-5">
                <audio controls className="w-full rounded-xl" src={q.audio_url}>
                  Trình duyệt không hỗ trợ phát âm thanh
                </audio>
              </div>
            )}
            {q.image_url && (
              <img src={q.image_url} alt="" className="rounded-lg mb-5 max-h-64 w-auto" />
            )}
            {/* whitespace-pre-wrap: giữ nguyên xuống hàng khi giáo viên nhập nhiều dòng */}
            <p className="text-gray-800 font-semibold text-lg leading-relaxed whitespace-pre-wrap">{q.question}</p>
          </div>

          {/* Khu vực đáp án — render theo loại câu hỏi */}
          <div className="space-y-3 mb-6 max-w-3xl mx-auto">
            {/* Loại trắc nghiệm: render từng lựa chọn A, B, C, D */}
            {q.type === 'multiple_choice' && normalizeOptions(q.options).map(opt => (
              <OptionButton
                key={opt.key}
                label={opt.key}
                text={opt.text}
                imageUrl={opt.image_url}
                selected={selected === opt.key}
                confirmed={confirmed && showAnswer}
                correct={opt.key === q.correct_answer}
                onClick={() => handleSelect(opt.key)}
              />
            ))}

            {/* Loại đúng/sai: chỉ có 2 lựa chọn */}
            {q.type === 'true_false' && ['Đúng', 'Sai'].map(val => (
              <OptionButton
                key={val}
                label={val === 'Đúng' ? '✓' : '✗'}
                text={val}
                selected={selected === val}
                confirmed={confirmed && showAnswer}
                correct={val === q.correct_answer}
                onClick={() => handleSelect(val)}
              />
            ))}

            {/* Loại điền từ: 1 ô hoặc nhiều ô tùy số ___ trong câu hỏi */}
            {q.type === 'fill_blank' && (() => {
              const blanks = (q.question.match(/___/g) || []).length
              const isDisabled = confirmed && showAnswer
              if (blanks === 0) {
                return (
                  <input
                    value={selected || ''}
                    onChange={e => handleSelect(e.target.value)}
                    disabled={isDisabled}
                    placeholder="Nhập câu trả lời..."
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 disabled:bg-gray-50"
                  />
                )
              }
              const answers = selected ? selected.split(',') : []
              return (
                <div className="space-y-3">
                  {Array.from({ length: blanks }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <input
                        value={answers[i] || ''}
                        onChange={e => {
                          const arr = selected ? selected.split(',') : Array(blanks).fill('')
                          while (arr.length < blanks) arr.push('')
                          arr[i] = e.target.value
                          handleSelect(arr.join(','))
                        }}
                        disabled={isDisabled}
                        placeholder={`Chỗ trống ${i + 1}...`}
                        className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 disabled:bg-gray-50"
                      />
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Loại nối đôi */}
            {q.type === 'matching' && (
              <MatchingQuestion
                key={current} // key=current để reset khi đổi câu
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}

            {/* Loại sắp xếp */}
            {q.type === 'ordering' && (
              <OrderingQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}

            {/* Loại kéo thả từ */}
            {q.type === 'drag_word' && (
              <DragWordQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}

            {/* Loại sắp xếp từ thành câu (thường dùng cho tiếng Anh) */}
            {q.type === 'word_order' && (
              <WordOrderQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}
          </div>

          {/* Phản hồi đúng/sai (chỉ hiện sau khi xác nhận, khi showAnswer=true) */}
          {confirmed && showAnswer && (
            <div className={`flex items-center gap-2 px-5 py-4 rounded-xl mb-5 text-sm font-medium max-w-3xl mx-auto
              ${isCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {isCorrect
                ? <><CheckCircle size={18} /> Chính xác!</>
                : <><XCircle size={18} /> Sai rồi! Đáp án đúng: <strong>{q.correct_answer}</strong></>
              }
            </div>
          )}

          {/* Nút hành động — thay đổi tùy trạng thái */}
          <div className="max-w-3xl mx-auto">
            {!showAnswer ? (
              // Chế độ thi: không cần xác nhận, chọn xong → Tiếp theo
              <button
                onClick={handleNext}
                disabled={!selected}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                {isLastQuestion ? 'Xem kết quả' : <><span>Câu tiếp theo</span><ChevronRight size={18} /></>}
              </button>
            ) : !confirmed ? (
              // Chế độ luyện tập: phải xác nhận trước
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 text-base"
              >
                Xác nhận
              </button>
            ) : (
              // Đã xác nhận → nút Tiếp theo / Xem kết quả
              <button
                onClick={handleNext}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2 text-base"
              >
                {isLastQuestion ? 'Xem kết quả' : 'Câu tiếp theo'} <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ===== PANEL BÊN PHẢI: điều hướng câu ===== */}
        <div className="md:w-64 shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 p-5 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Danh sách câu
          </div>

          {/* Grid các nút số câu — mỗi nút có màu khác nhau tùy trạng thái */}
          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2rem, 1fr))' }}>
            {questions.map((_, i) => {
              const isAnswered = answers[i] !== undefined || (showAnswer && i === current && selected)
              const isCurrent = i === current
              let cls = 'w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center cursor-pointer border-2 transition '
              if (isCurrent)
                cls += 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-110' // câu đang làm
              else if (isAnswered)
                cls += 'bg-red-100 border-red-300 text-red-600'    // đã trả lời
              else
                cls += 'bg-white border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600' // chưa làm

              return (
                <button key={i} onClick={() => jumpTo(i)} className={cls}>
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Chú thích màu sắc */}
          <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 inline-block shrink-0" />
              Câu đang làm
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-300 inline-block shrink-0" />
              Đã trả lời
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 inline-block shrink-0" />
              Chưa làm
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
            Đã làm: <span className="font-semibold text-indigo-600">{answeredCount}</span> / {questions.length}
          </div>

          {/* Nút nộp bài sớm */}
          <button
            onClick={() => {
              const unanswered = questions.length - Object.keys(answers).length
              const msg = unanswered > 0
                ? `Còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`
                : 'Bạn có chắc muốn nộp bài không?'
              if (window.confirm(msg)) handleFinish()
            }}
            className="mt-5 w-full text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 rounded-lg transition border border-red-200"
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// OptionButton — Nút lựa chọn cho câu trắc nghiệm / đúng sai
// Đổi màu theo trạng thái: đang chọn, đúng, sai
// ============================================================
function OptionButton({ label, text, imageUrl, selected, confirmed, correct, onClick }) {
  // Xây dựng class CSS dựa vào trạng thái
  let cls = 'flex items-center gap-4 w-full px-5 py-4 rounded-xl border-2 text-left text-base font-medium transition '
  if (confirmed && correct)             cls += 'bg-green-50 border-green-500 text-green-800'   // đáp án đúng
  else if (confirmed && selected && !correct) cls += 'bg-red-50 border-red-400 text-red-700'   // học sinh chọn sai
  else if (selected)                    cls += 'border-indigo-500 bg-indigo-50 text-indigo-800' // đang chọn
  else                                  cls += 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'

  return (
    <button onClick={onClick} disabled={confirmed} className={cls}>
      {/* Badge chữ cái A/B/C/D */}
      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
        ${confirmed && correct ? 'bg-green-500 text-white'
          : confirmed && selected ? 'bg-red-400 text-white'
          : selected ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-500'}`}>
        {label}
      </span>
      <span className="flex-1">
        {text}
        {imageUrl && <img src={imageUrl} alt="" className="mt-1 rounded max-h-20 w-auto" />}
      </span>
    </button>
  )
}

// ============================================================
// MatchingQuestion — Câu hỏi nối đôi
// Học sinh bấm cột trái rồi bấm cột phải để tạo cặp
// Đáp án lưu dạng chuỗi: "A-1,B-3,C-2"
// ============================================================
function MatchingQuestion({ q, value, onChange, disabled }) {
  // useMemo: tính toán 1 lần rồi cache lại, không tính lại mỗi lần render
  const rightShuffled = useMemo(() => shuffle(q.match_options || []), [q.id])
  const [activeLeft, setActiveLeft] = useState(null) // đang chọn dòng trái nào?
  const [pairs, setPairs] = useState(() => {
    // Khôi phục các cặp đã nối từ đáp án cũ (khi quay lại câu này)
    if (!value) return {}
    const p = {}
    value.split(',').forEach(pair => {
      const [l, r] = pair.split('-')
      if (l && r) p[l] = r
    })
    return p
  })

  // Tạo chuỗi đáp án từ object pairs
  function buildAnswer(newPairs) {
    return q.options?.map(o => `${o.key}-${newPairs[o.key] || ''}`).filter(s => !s.endsWith('-')).join(',')
  }

  function handleLeftClick(key) {
    if (disabled) return
    setActiveLeft(activeLeft === key ? null : key) // click lại = bỏ chọn
  }

  function handleRightClick(key) {
    if (disabled || !activeLeft) return
    const newPairs = { ...pairs, [activeLeft]: key } // thêm cặp mới
    setPairs(newPairs)
    setActiveLeft(null) // bỏ chọn sau khi nối xong
    const ans = buildAnswer(newPairs)
    if (ans) onChange(ans)
  }

  function clearPair(leftKey) {
    if (disabled) return
    const newPairs = { ...pairs }
    delete newPairs[leftKey] // xóa cặp của dòng trái này
    setPairs(newPairs)
    const ans = buildAnswer(newPairs)
    onChange(ans || null)
  }

  const usedRight = new Set(Object.values(pairs)) // các lựa chọn phải đã được dùng

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">Bấm cột trái → sau đó bấm cột phải để nối</p>
      <div className="flex gap-3">
        {/* Cột trái */}
        <div className="flex-1 space-y-2">
          {q.options?.map(opt => {
            const matched = pairs[opt.key]
            const isActive = activeLeft === opt.key
            return (
              <div key={opt.key} className="flex items-center gap-1">
                <button
                  onClick={() => handleLeftClick(opt.key)}
                  disabled={disabled}
                  className={`flex-1 text-left px-3 py-2 rounded-lg border-2 text-sm transition ${
                    isActive ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : matched ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {opt.image_url && <img src={opt.image_url} alt="" className="h-12 w-auto mb-1 rounded" />}
                  <span className="font-bold mr-1">{opt.key}.</span>{opt.text}
                </button>
                {matched && !disabled && (
                  <button onClick={() => clearPair(opt.key)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Mũi tên giữa */}
        <div className="flex flex-col justify-around text-gray-300 text-lg select-none">
          {q.options?.map((_, i) => <span key={i}>→</span>)}
        </div>

        {/* Cột phải (đã trộn ngẫu nhiên) */}
        <div className="flex-1 space-y-2">
          {rightShuffled.map(opt => {
            const isUsed = usedRight.has(opt.key)
            const pairedLeft = Object.entries(pairs).find(([, r]) => r === opt.key)?.[0]
            return (
              <button
                key={opt.key}
                onClick={() => handleRightClick(opt.key)}
                disabled={disabled || (isUsed && !activeLeft)}
                className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition ${
                  isUsed ? 'border-green-400 bg-green-50 text-green-800'
                  : activeLeft ? 'border-indigo-300 bg-white text-gray-700 hover:border-indigo-500 hover:bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                {opt.image_url && <img src={opt.image_url} alt="" className="h-12 w-auto mb-1 rounded" />}
                {isUsed && <span className="font-bold mr-1 text-green-600">{pairedLeft}-</span>}
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// OrderingQuestion — Câu hỏi sắp xếp thứ tự
// Học sinh dùng nút ↑ ↓ để di chuyển các mục
// Đáp án lưu dạng: "B,D,A,C" (thứ tự key các lựa chọn)
// ============================================================
function OrderingQuestion({ q, value, onChange, disabled }) {
  const [items, setItems] = useState(() => {
    if (value) {
      // Khôi phục thứ tự đã sắp xếp từ đáp án cũ
      const keyOrder = value.split(',')
      return keyOrder.map(k => q.options?.find(o => o.key === k)).filter(Boolean)
    }
    return shuffle(q.options || []) // trộn ngẫu nhiên lần đầu
  })

  // Di chuyển item lên (-1) hoặc xuống (+1)
  function move(index, dir) {
    if (disabled) return
    const newItems = [...items]
    const target = index + dir
    if (target < 0 || target >= newItems.length) return; // không ra ngoài biên
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]] // hoán đổi
    setItems(newItems)
    onChange(newItems.map(o => o.key).join(',')) // cập nhật đáp án
  }

  // Lần đầu render: tự lưu thứ tự ban đầu (dù chưa sắp xếp)
  useEffect(() => {
    if (!value) onChange(items.map(o => o.key).join(','))
  }, [])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">Sắp xếp theo thứ tự đúng bằng cách bấm ↑ ↓</p>
      <div className="space-y-2">
        {items.map((opt, i) => (
          <div key={opt.key} className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800">
              {opt.text}
            </span>
            {!disabled && (
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition">
                  <ArrowUp size={14} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1}
                  className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition">
                  <ArrowDown size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// DragWordQuestion — Kéo thả từ vào chỗ trống
// Câu hỏi dùng "___" để đánh dấu chỗ trống
// Ví dụ: "Hà Nội là ___ của Việt Nam"
// Đáp án lưu dạng: "thủ đô" (thứ tự các từ điền vào)
//
// Hỗ trợ 2 cách tương tác:
//   1. Kéo thả thật (HTML5 drag & drop) — dùng trên máy tính
//   2. Bấm để chọn rồi bấm ô (click mode) — tiện hơn trên mobile
//      Bấm từ → từ sáng lên (activeWord) → bấm ô bất kỳ để điền
// ============================================================
function DragWordQuestion({ q, value, onChange, disabled }) {
  // Tách câu thành các đoạn xung quanh chỗ trống
  const segments = q.question.split('___')
  const blankCount = segments.length - 1 // số chỗ trống = số ___
  const wordBank = useMemo(() => shuffle(q.options || []), [q.id])

  // Mảng các từ đã điền vào từng chỗ trống: ['thủ đô', null, 'Hà Nội']
  const [filled, setFilled] = useState(() => {
    if (value) return value.split(',').map(w => w.trim())
    return Array(blankCount).fill(null)
  })

  // Click mode: từ đang được chọn (sẽ điền vào ô tiếp theo bấm)
  const [activeWord, setActiveWord] = useState(null)

  // Drag mode: {type: 'bank'|'blank', word, index?}
  const [dragSrc, setDragSrc] = useState(null)

  const usedWords = new Set(filled.filter(Boolean))

  // Lưu đáp án sau mỗi thay đổi
  function commit(newFilled) {
    setFilled(newFilled)
    const hasAny = newFilled.some(Boolean)
    onChange(hasAny ? newFilled.map(w => w || '').join(',') : null)
  }

  // ── CLICK MODE ──────────────────────────────────────────────
  // Bấm một từ trong ngân hàng: chọn/bỏ chọn
  function handleWordClick(word) {
    if (disabled || usedWords.has(word)) return
    setActiveWord(prev => prev === word ? null : word)
  }

  // Bấm một ô trống:
  //   - Nếu đang có activeWord → điền từ đó vào ô này
  //   - Nếu ô đã có từ và không có activeWord → lấy từ đó ra (trả về ngân hàng)
  //   - Nếu đang có activeWord và ô đã có từ → hoán đổi
  function handleBlankClick(idx) {
    if (disabled) return
    if (activeWord) {
      const newFilled = [...filled]
      // Nếu ô đang có từ khác → trả từ cũ về ngân hàng (chỉ cần xóa khỏi filled)
      newFilled[idx] = activeWord
      setActiveWord(null)
      commit(newFilled)
    } else if (filled[idx]) {
      // Không có activeWord → lấy từ ra khỏi ô, đặt làm activeWord
      const word = filled[idx]
      const newFilled = [...filled]
      newFilled[idx] = null
      commit(newFilled)
      setActiveWord(word)
    }
  }

  // ── DRAG MODE ───────────────────────────────────────────────
  function onDragStartBank(e, word) {
    setDragSrc({ type: 'bank', word })
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragStartBlank(e, idx) {
    if (!filled[idx]) return
    setDragSrc({ type: 'blank', word: filled[idx], index: idx })
    e.dataTransfer.effectAllowed = 'move'
  }

  // Drop vào một ô trống
  function onDropBlank(e, idx) {
    e.preventDefault()
    if (!dragSrc) return
    const newFilled = [...filled]
    if (dragSrc.type === 'blank') {
      // Hoán đổi: đưa từ kéo vào ô mới, đưa từ ô mới (nếu có) vào ô cũ
      newFilled[idx] = dragSrc.word
      newFilled[dragSrc.index] = filled[idx] || null
    } else {
      // Từ ngân hàng → điền vào ô (nếu ô đã có từ, từ cũ tự trở về ngân hàng)
      newFilled[idx] = dragSrc.word
    }
    setDragSrc(null)
    commit(newFilled)
  }

  // Drop vào vùng ngân hàng từ → trả từ về
  function onDropBank(e) {
    e.preventDefault()
    if (!dragSrc || dragSrc.type === 'bank') return
    const newFilled = [...filled]
    newFilled[dragSrc.index] = null
    setDragSrc(null)
    commit(newFilled)
  }

  return (
    <div className="space-y-4">
      {/* Câu có chỗ trống — whitespace-pre-wrap giữ nguyên xuống hàng giáo viên nhập */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-base leading-loose text-gray-800 whitespace-pre-wrap">
        {segments.map((seg, i) => (
          <span key={i}>
            <span>{seg}</span>
            {i < blankCount && (
              <span
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDropBlank(e, i)}
                onClick={() => handleBlankClick(i)}
                className={`inline-flex items-center mx-1 px-3 py-0.5 rounded-lg border-2 min-w-16 text-sm font-semibold transition cursor-pointer select-none
                  ${filled[i]
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 hover:border-red-300 hover:bg-red-50'
                    : activeWord
                      ? 'border-dashed border-indigo-400 bg-indigo-50/60 text-indigo-300 animate-pulse'
                      : 'border-dashed border-gray-300 text-gray-300'
                  }`}
              >
                {filled[i]
                  ? <span draggable={!disabled} onDragStart={e => onDragStartBlank(e, i)} className="cursor-grab">{filled[i]}</span>
                  : <span className="select-none text-gray-300">{'____'}</span>
                }
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Ngân hàng từ — drop zone để trả từ về */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDropBank}
      >
        <p className="text-xs text-gray-400 mb-2">
          Kéo thả từ vào ô · hoặc bấm từ rồi bấm ô để điền · bấm ô đã điền để lấy lại
        </p>
        <div className="flex flex-wrap gap-2 min-h-12 p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          {wordBank.map(opt => {
            const isUsed = usedWords.has(opt.text)
            const isActive = activeWord === opt.text
            return (
              <span
                key={opt.key}
                draggable={!disabled && !isUsed}
                onDragStart={e => onDragStartBank(e, opt.text)}
                onClick={() => handleWordClick(opt.text)}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition select-none
                  ${isUsed
                    ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed opacity-40'
                    : isActive
                      ? 'border-indigo-500 bg-indigo-600 text-white cursor-pointer shadow-md scale-105'
                      : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 cursor-grab'
                  }`}
              >
                {opt.text}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// WordOrderQuestion — Sắp xếp từ thành câu hoàn chỉnh
// Dùng cho bài tập tiếng Anh: các từ bị xáo trộn → học sinh ghép lại
//
// Dữ liệu:
//   q.options        = [{key:"A", text:"She"}, {key:"B", text:"is"}, ...]
//   q.correct_answer = "She is a teacher" (câu đúng, cách nhau bằng dấu cách)
//
// Đáp án học sinh lưu dạng: "She,is,a,teacher" (cách nhau bằng dấu phẩy)
// Hỗ trợ kéo thả và bấm (click mode)
// ============================================================
function WordOrderQuestion({ q, value, onChange, disabled }) {
  // Trộn ngẫu nhiên các từ trong ngân hàng khi component khởi tạo
  const wordBank = useMemo(() => shuffle(normalizeOptions(q.options)), [q.id])

  // Mảng các từ học sinh đã xếp theo thứ tự
  const [ordered, setOrdered] = useState(() => {
    if (value) return value.split(',').map(w => w.trim()).filter(Boolean)
    return []
  })

  // Theo dõi nguồn đang kéo: {type: 'bank'|'ordered', word, index?}
  const [dragSrc, setDragSrc] = useState(null)

  // Tập từ đã dùng — để làm mờ từ đó trong ngân hàng
  const usedWords = useMemo(() => new Set(ordered), [ordered])

  // Lưu đáp án: nối các từ bằng dấu phẩy
  function commit(newOrdered) {
    setOrdered(newOrdered)
    onChange(newOrdered.length > 0 ? newOrdered.join(',') : null)
  }

  // Bấm từ trong ngân hàng → thêm vào cuối câu
  function handleBankClick(word) {
    if (disabled || usedWords.has(word)) return
    commit([...ordered, word])
  }

  // Bấm từ trong câu → xóa khỏi câu, trả về ngân hàng
  function handleOrderedClick(idx) {
    if (disabled) return
    commit(ordered.filter((_, i) => i !== idx))
  }

  // Bắt đầu kéo từ ngân hàng
  function onDragStartBank(e, word) {
    setDragSrc({ type: 'bank', word })
    e.dataTransfer.effectAllowed = 'move'
  }

  // Bắt đầu kéo từ trong câu đã xếp
  function onDragStartOrdered(e, idx) {
    setDragSrc({ type: 'ordered', word: ordered[idx], index: idx })
    e.dataTransfer.effectAllowed = 'move'
  }

  // Thả vào vị trí cụ thể trong câu → chèn hoặc hoán đổi
  function onDropAt(e, targetIdx) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragSrc) return
    const newOrdered = [...ordered]
    if (dragSrc.type === 'ordered') {
      // Di chuyển trong câu: xóa vị trí cũ, chèn vào vị trí mới
      newOrdered.splice(dragSrc.index, 1)
      const insertIdx = dragSrc.index < targetIdx ? targetIdx - 1 : targetIdx
      newOrdered.splice(insertIdx, 0, dragSrc.word)
    } else {
      // Từ ngân hàng: chèn vào trước vị trí target
      newOrdered.splice(targetIdx, 0, dragSrc.word)
    }
    setDragSrc(null)
    commit(newOrdered)
  }

  // Thả vào cuối khu vực câu
  function onDropEnd(e) {
    e.preventDefault()
    if (!dragSrc || dragSrc.type === 'ordered') { setDragSrc(null); return }
    commit([...ordered, dragSrc.word])
    setDragSrc(null)
  }

  // Thả trả về ngân hàng → xóa khỏi câu
  function onDropBank(e) {
    e.preventDefault()
    if (!dragSrc || dragSrc.type === 'bank') return
    commit(ordered.filter((_, i) => i !== dragSrc.index))
    setDragSrc(null)
  }

  return (
    <div className="space-y-4">
      {/* Khu vực câu đã xếp — thả từ vào đây để ghép câu */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDropEnd}
        className="bg-white rounded-2xl border-2 border-indigo-200 p-5 min-h-16 flex flex-wrap gap-2 items-center"
      >
        {ordered.length === 0 ? (
          <span className="text-gray-300 text-sm select-none">Kéo hoặc bấm từ để ghép thành câu...</span>
        ) : (
          ordered.map((word, i) => (
            <span
              key={i}
              draggable={!disabled}
              onDragStart={e => onDragStartOrdered(e, i)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDropAt(e, i)}
              onClick={() => handleOrderedClick(i)}
              className="px-3 py-1.5 rounded-lg border-2 border-indigo-400 bg-indigo-50 text-indigo-800 text-sm font-medium cursor-pointer select-none hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition"
            >
              {word}
            </span>
          ))
        )}
      </div>

      {/* Ngân hàng từ — drop zone để trả từ về */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDropBank}
      >
        <p className="text-xs text-gray-400 mb-2">
          Bấm từ để thêm vào câu · bấm từ đã xếp để xóa · kéo để chèn vào vị trí cụ thể
        </p>
        <div className="flex flex-wrap gap-2 min-h-12 p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          {wordBank.map(opt => {
            const isUsed = usedWords.has(opt.text)
            return (
              <span
                key={opt.key}
                draggable={!disabled && !isUsed}
                onDragStart={e => onDragStartBank(e, opt.text)}
                onClick={() => handleBankClick(opt.text)}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition select-none
                  ${isUsed
                    ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed opacity-40'
                    : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 cursor-grab'
                  }`}
              >
                {opt.text}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// QuizResult — Màn hình kết quả sau khi nộp bài
// Hiện điểm số, số câu đúng, và chi tiết từng câu
// ============================================================
function QuizResult({ questions, answers, onRetry, examMode = false, showScore = true }) {
  // Tính lại điểm (giống handleFinish)
  let correct = 0
  questions.forEach((q, i) => {
    if (normalizeAnswer(q.type, answers[i], q.correct_answer)) correct++
  })
  const score = Math.round((correct / questions.length) * 10 * 10) / 10
  const percent = Math.round((correct / questions.length) * 100)

  // Nếu GV tắt show_score → chỉ hiện "Đã nộp bài"
  if (!showScore) {
    return (
      <div className="p-4 md:p-8 max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đã nộp bài thành công!</h2>
          <p className="text-gray-500 text-sm">Giáo viên sẽ thông báo kết quả sau.</p>
        </div>
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
        >
          <RotateCcw size={18} /> Quay lại danh sách đề
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Card điểm số tổng */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
        <div className={`text-6xl font-bold mb-2 ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
          {score}
        </div>
        <div className="text-gray-500 mb-1">điểm</div>
        <div className="text-lg font-semibold text-gray-800 mt-3">
          {correct} / {questions.length} câu đúng
        </div>
        <div className={`text-sm mt-2 ${percent >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
          {percent >= 90 ? 'Xuất sắc!' : percent >= 70 ? 'Tốt lắm!' : percent >= 50 ? 'Cố gắng thêm nhé!' : 'Cần ôn luyện thêm!'}
        </div>
      </div>

      {/* Chi tiết từng câu — xanh = đúng, đỏ = sai */}
      <div className="space-y-3 mb-6">
        {questions.map((q, i) => {
          const ans = answers[i]
          const isOk = normalizeAnswer(q.type, ans, q.correct_answer)
          return (
            <div key={i} className={`rounded-xl border p-4 text-sm ${isOk ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-2">
                {isOk
                  ? <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                  : <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium text-gray-800">{q.question}</p>
                  {!isOk && (
                    <p className="text-red-600 mt-1">
                      Bạn chọn: <strong>{ans || '(chưa trả lời)'}</strong> — Đáp án đúng: <strong>{q.correct_answer}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
      >
        <RotateCcw size={18} /> {examMode ? 'Quay lại danh sách đề' : 'Làm bài khác'}
      </button>
    </div>
  )
}
