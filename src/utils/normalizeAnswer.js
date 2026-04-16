// So sánh đáp án học sinh với đáp án đúng theo từng loại câu hỏi
export function normalizeAnswer(type, ans, correct) {
  if (!ans) return false
  if (type === 'word_order') {
    const studentSentence = ans.split(',').map(w => w.trim()).join(' ')
    return studentSentence.toLowerCase() === (correct || '').trim().toLowerCase()
  }
  if (type === 'matching') {
    const norm = s => s?.split(',').map(p => p.trim()).sort().join(',')
    return norm(ans) === norm(correct)
  }
  if (type === 'drag_word' || type === 'fill_blank') {
    const a = ans.split(',').map(w => w.trim().toLowerCase())
    const c = (correct || '').split(',').map(w => w.trim().toLowerCase())
    return a.length === c.length && a.every((w, i) => w === c[i])
  }
  return ans.toLowerCase() === (correct || '').toLowerCase()
}
