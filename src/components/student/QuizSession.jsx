import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle, XCircle, Clock, ChevronRight, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalizeAnswer(type, ans, correct) {
  if (!ans) return false
  if (type === 'matching') {
    const norm = s => s?.split(',').map(p => p.trim()).sort().join(',')
    return norm(ans) === norm(correct)
  }
  if (type === 'drag_word') {
    const a = ans.split(',').map(w => w.trim().toLowerCase())
    const c = (correct || '').split(',').map(w => w.trim().toLowerCase())
    return a.length === c.length && a.every((w, i) => w === c[i])
  }
  return ans.toLowerCase() === (correct || '').toLowerCase()
}

export default function QuizSession({
  questions, mode, timeLimit, onFinish,
  examMode = false, examId = null, attemptNumber = 1,
  showAnswer = true, showScore = true,
}) {
  const { user } = useAuth()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : null)

  useEffect(() => {
    if (!timeLeft) return
    if (timeLeft <= 0) { handleFinish(); return }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  const q = questions[current]
  const isLastQuestion = current === questions.length - 1

  function handleSelect(answer) {
    if (confirmed && showAnswer) return
    setSelected(answer)
    if (!showAnswer) {
      setAnswers(prev => ({ ...prev, [current]: answer }))
    }
  }

  function handleConfirm() {
    if (!selected || !showAnswer) return
    setAnswers(prev => ({ ...prev, [current]: selected }))
    setConfirmed(true)
  }

  function handleNext() {
    if (isLastQuestion) {
      handleFinish()
    } else {
      const nextIndex = current + 1
      setCurrent(nextIndex)
      setSelected(answers[nextIndex] || null)
      setConfirmed(false)
    }
  }

  function jumpTo(index) {
    if (selected && !confirmed) {
      setAnswers(prev => ({ ...prev, [current]: selected }))
    }
    setCurrent(index)
    setSelected(answers[index] || null)
    setConfirmed(false)
  }

  async function handleFinish() {
    const finalAnswers = { ...answers }
    if (selected && !confirmed) finalAnswers[current] = selected

    let correct = 0
    questions.forEach((q, i) => {
      if (normalizeAnswer(q.type, finalAnswers[i], q.correct_answer)) correct++
    })
    const score = Math.round((correct / questions.length) * 10 * 10) / 10

    try {
      if (examMode && examId) {
        await supabase.from('quiz_sessions').insert({
          exam_id: examId,
          user_id: user.id,
          total: questions.length,
          correct,
          score,
          answers: finalAnswers,
          attempt_number: attemptNumber,
        })
      } else {
        await supabase.from('quiz_sessions').insert({
          user_id: user.id,
          mode,
          total: questions.length,
          correct,
          score,
          answers: finalAnswers,
          question_ids: questions.map(q => q.id),
        })
      }
    } catch {}

    setAnswers(finalAnswers)
    setShowResult(true)
  }

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
  const answeredCount = showAnswer
    ? Object.keys(answers).length + (selected && !confirmed ? 1 : 0)
    : Object.keys(answers).length

  return (
    <div className="flex min-h-screen justify-center">
      <div className="flex flex-col md:flex-row w-full max-w-3xl">
        {/* Main quiz area */}
        <div className="flex-1 p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm text-gray-500">
              Câu <span className="font-bold text-gray-800">{current + 1}</span> / {questions.length}
            </span>
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                <Clock size={16} />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full mb-7">
            <div
              className="h-1.5 bg-indigo-600 rounded-full transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
            {q.image_url && (
              <img src={q.image_url} alt="" className="rounded-lg mb-4 max-h-48 w-auto" />
            )}
            <p className="text-gray-800 font-medium text-base leading-relaxed">{q.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2.5 mb-6">
            {q.type === 'multiple_choice' && q.options?.map(opt => (
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

            {q.type === 'fill_blank' && (
              <input
                value={selected || ''}
                onChange={e => handleSelect(e.target.value)}
                disabled={confirmed && showAnswer}
                placeholder="Nhập câu trả lời..."
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 disabled:bg-gray-50"
              />
            )}

            {q.type === 'matching' && (
              <MatchingQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}

            {q.type === 'ordering' && (
              <OrderingQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}

            {q.type === 'drag_word' && (
              <DragWordQuestion
                key={current}
                q={q}
                value={selected}
                onChange={handleSelect}
                disabled={confirmed && showAnswer}
              />
            )}
          </div>

          {/* Feedback — only when showAnswer */}
          {confirmed && showAnswer && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm font-medium
              ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {isCorrect
                ? <><CheckCircle size={18} /> Chính xác!</>
                : <><XCircle size={18} /> Sai rồi! Đáp án đúng: <strong>{q.correct_answer}</strong></>
              }
            </div>
          )}

          {/* Action button */}
          {!showAnswer ? (
            <button
              onClick={handleNext}
              disabled={!selected}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLastQuestion ? 'Xem kết quả' : <><span>Câu tiếp theo</span><ChevronRight size={18} /></>}
            </button>
          ) : !confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              Xác nhận
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isLastQuestion ? 'Xem kết quả' : 'Câu tiếp theo'} <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Question navigator panel */}
        <div className="md:w-60 shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Danh sách câu
          </div>

          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2rem, 1fr))' }}>
            {questions.map((_, i) => {
              const isAnswered = answers[i] !== undefined || (showAnswer && i === current && selected)
              const isCurrent = i === current
              let cls = 'w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center cursor-pointer border-2 transition '
              if (isCurrent)
                cls += 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-110'
              else if (isAnswered)
                cls += 'bg-red-100 border-red-300 text-red-600'
              else
                cls += 'bg-white border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'

              return (
                <button key={i} onClick={() => jumpTo(i)} className={cls}>
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Legend */}
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

          <button
            onClick={handleFinish}
            className="mt-5 w-full text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 rounded-lg transition border border-red-200"
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionButton({ label, text, imageUrl, selected, confirmed, correct, onClick }) {
  let cls = 'flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition '
  if (confirmed && correct) cls += 'bg-green-50 border-green-500 text-green-800'
  else if (confirmed && selected && !correct) cls += 'bg-red-50 border-red-400 text-red-700'
  else if (selected) cls += 'border-indigo-500 bg-indigo-50 text-indigo-800'
  else cls += 'border-gray-200 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'

  return (
    <button onClick={onClick} disabled={confirmed} className={cls}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
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

function MatchingQuestion({ q, value, onChange, disabled }) {
  const rightShuffled = useMemo(() => shuffle(q.match_options || []), [q.id])
  const [activeLeft, setActiveLeft] = useState(null)
  const [pairs, setPairs] = useState(() => {
    if (!value) return {}
    const p = {}
    value.split(',').forEach(pair => {
      const [l, r] = pair.split('-')
      if (l && r) p[l] = r
    })
    return p
  })

  function buildAnswer(newPairs) {
    return q.options?.map(o => `${o.key}-${newPairs[o.key] || ''}`).filter(s => !s.endsWith('-')).join(',')
  }

  function handleLeftClick(key) {
    if (disabled) return
    setActiveLeft(activeLeft === key ? null : key)
  }

  function handleRightClick(key) {
    if (disabled || !activeLeft) return
    const newPairs = { ...pairs, [activeLeft]: key }
    setPairs(newPairs)
    setActiveLeft(null)
    const ans = buildAnswer(newPairs)
    if (ans) onChange(ans)
  }

  function clearPair(leftKey) {
    if (disabled) return
    const newPairs = { ...pairs }
    delete newPairs[leftKey]
    setPairs(newPairs)
    const ans = buildAnswer(newPairs)
    onChange(ans || null)
  }

  const usedRight = new Set(Object.values(pairs))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">Bấm cột trái → sau đó bấm cột phải để nối</p>
      <div className="flex gap-3">
        {/* Left column */}
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

        {/* Arrow */}
        <div className="flex flex-col justify-around text-gray-300 text-lg select-none">
          {q.options?.map((_, i) => <span key={i}>→</span>)}
        </div>

        {/* Right column */}
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

function OrderingQuestion({ q, value, onChange, disabled }) {
  const [items, setItems] = useState(() => {
    if (value) {
      const keyOrder = value.split(',')
      return keyOrder.map(k => q.options?.find(o => o.key === k)).filter(Boolean)
    }
    return shuffle(q.options || [])
  })

  function move(index, dir) {
    if (disabled) return
    const newItems = [...items]
    const target = index + dir
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]]
    setItems(newItems)
    onChange(newItems.map(o => o.key).join(','))
  }

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

function DragWordQuestion({ q, value, onChange, disabled }) {
  const segments = q.question.split('___')
  const blankCount = segments.length - 1
  const wordBank = useMemo(() => shuffle(q.options || []), [q.id])

  const [filled, setFilled] = useState(() => {
    if (value) return value.split(',').map(w => w.trim())
    return Array(blankCount).fill(null)
  })

  const usedWords = new Set(filled.filter(Boolean))

  function placeWord(word) {
    if (disabled) return
    const idx = filled.findIndex(f => !f)
    if (idx === -1) return
    const newFilled = [...filled]
    newFilled[idx] = word
    setFilled(newFilled)
    const ans = newFilled.filter(Boolean)
    if (ans.length > 0) onChange(newFilled.map(w => w || '').join(','))
  }

  function removeWord(idx) {
    if (disabled) return
    const newFilled = [...filled]
    newFilled[idx] = null
    setFilled(newFilled)
    const hasAny = newFilled.some(Boolean)
    onChange(hasAny ? newFilled.map(w => w || '').join(',') : null)
  }

  return (
    <div className="space-y-4">
      {/* Sentence with blanks */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-base leading-relaxed text-gray-800">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < blankCount && (
              <button
                onClick={() => removeWord(i)}
                disabled={disabled || !filled[i]}
                className={`inline-flex items-center mx-1 px-3 py-0.5 rounded-lg border-2 min-w-16 text-sm font-semibold transition ${
                  filled[i]
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                    : 'border-dashed border-gray-300 text-gray-300 cursor-default'
                }`}
              >
                {filled[i] || '___'}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Word bank */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Bấm từ để điền vào chỗ trống · Bấm chỗ trống để xóa</p>
        <div className="flex flex-wrap gap-2">
          {wordBank.map(opt => {
            const isUsed = usedWords.has(opt.text)
            return (
              <button
                key={opt.key}
                onClick={() => !isUsed && placeWord(opt.text)}
                disabled={disabled || isUsed}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                  isUsed
                    ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-500'
                }`}
              >
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QuizResult({ questions, answers, onRetry, examMode = false, showScore = true }) {
  let correct = 0
  questions.forEach((q, i) => {
    if (normalizeAnswer(q.type, answers[i], q.correct_answer)) correct++
  })
  const score = Math.round((correct / questions.length) * 10 * 10) / 10
  const percent = Math.round((correct / questions.length) * 100)

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
