/**
 * Parse text copied from Word into structured questions.
 *
 * Supported formats:
 *
 * [Trắc nghiệm] — options A/B/C/D, answer is single letter
 *   Câu 1: Thiết bị nào dùng để nhập dữ liệu?
 *   A. Màn hình   B. Bàn phím   C. Loa   D. Máy in
 *   Đáp án: B
 *
 * [Đúng/Sai] — no options, answer is "Đúng" or "Sai"
 *   Câu 2: Chuột là thiết bị xuất. Đúng hay sai?
 *   Đáp án: Sai
 *
 * [Điền từ] — no options, answer is a word/phrase
 *   Câu 3: Thủ đô của Việt Nam là ___
 *   Đáp án: Hà Nội
 *
 * [Sắp xếp thứ tự] — options A/B/C/D, answer is comma-separated keys "A,C,B,D"
 *   Câu 4: Sắp xếp theo thứ tự đúng
 *   A. Bật nguồn   B. Đăng nhập   C. BIOS khởi động
 *   Đáp án: A,C,B
 *
 * [Sắp xếp từ] — options A/B/C/D (mỗi option là 1 từ), answer là cả câu
 *   Câu 5: Sắp xếp thành câu hoàn chỉnh
 *   A. She   B. is   C. a   D. teacher
 *   Đáp án: She is a teacher
 *
 * [Kéo thả từ] — options A/B/C/D (ngân hàng từ), question có ___, answer là từ điền
 *   Câu 6: The ___ is the brain of the computer.
 *   A. CPU   B. RAM   C. ROM   D. GPU
 *   Đáp án: CPU
 *
 * [Nối đôi] — options A/B/C (cột trái) + dòng >1. >2. (cột phải), answer "A-2,B-1,C-3"
 *   Câu 7: Nối khái niệm với định nghĩa
 *   A. CPU   B. RAM   C. ROM
 *   >1. Bộ nhớ chỉ đọc   >2. Bộ xử lý trung tâm   >3. Bộ nhớ tạm thời
 *   Đáp án: A-2,B-3,C-1
 *
 * [Tự luận] — thêm [TL] vào đầu câu hỏi, Gợi ý: là đáp án mẫu, [File] = cho phép nộp file
 *   Câu 8: [TL] Hãy giải thích khái niệm thuật toán.
 *   Gợi ý: Thuật toán là tập hợp các bước hữu hạn...
 *   [File]
 */

export function parseQuestions(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const questions = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect start of a new question: "Câu 1:" or "1."
    const questionMatch = line.match(/^(?:Câu\s*)?(\d+)[.):]\s*(.+)$/i)
    if (questionMatch) {
      if (current) questions.push(finalizeQuestion(current))
      let questionText = questionMatch[2]
      let isEssay = false
      // Detect [TL] / [tự luận] / [essay] prefix
      if (/^\[(?:TL|tự luận|essay)\]\s*/i.test(questionText)) {
        questionText = questionText.replace(/^\[(?:TL|tự luận|essay)\]\s*/i, '')
        isEssay = true
      }
      current = {
        order: parseInt(questionMatch[1]),
        question: questionText,
        type: isEssay ? 'essay' : 'fill_blank',
        options: [],
        match_options: [],   // cột phải cho dạng nối đôi
        correct_answer: null,
        allow_file: false,
        image_url: null,
      }
      continue
    }

    if (!current) continue

    // Detect [File] standalone line → allow file upload for essay
    if (/^\[File\]$/i.test(line)) {
      current.allow_file = true
      continue
    }

    // Detect "Gợi ý:" line → rubric/sample answer for essay
    const hintMatch = line.match(/^Gợi ý[:\s]+(.+)$/i)
    if (hintMatch) {
      current.correct_answer = hintMatch[1].trim()
      continue
    }

    // Detect matching right-side items: ">1. text" or ">1) text"
    const matchRightMatch = line.match(/^>(\d+)[.)]\s*(.+)$/)
    if (matchRightMatch) {
      current.match_options.push({
        key: matchRightMatch[1],
        text: matchRightMatch[2],
      })
      continue
    }

    // Detect options A/B/C/D/E (hỗ trợ đến E cho word_order nhiều từ)
    const optionMatch = line.match(/^([A-E])[.)]\s*(.+)$/i)
    if (optionMatch) {
      current.options.push({ key: optionMatch[1].toUpperCase(), text: optionMatch[2] })
      current.type = 'multiple_choice'
      continue
    }

    // Detect answer line
    const answerMatch = line.match(/^(?:Đáp án|Trả lời|Answer)[:\s]+(.+)$/i)
    if (answerMatch) {
      current.correct_answer = answerMatch[1].trim()
      continue
    }

    // Detect true/false standalone answer
    const tfMatch = line.match(/^(?:Đúng|Sai|True|False)$/i)
    if (tfMatch && current.type !== 'multiple_choice') {
      current.type = 'true_false'
      current.correct_answer = tfMatch[0]
      continue
    }

    // Continuation of question text (only if no options yet)
    if (current.options.length === 0 && current.match_options.length === 0) {
      current.question += ' ' + line
    }
  }

  if (current) questions.push(finalizeQuestion(current))
  return questions
}

function finalizeQuestion(q) {
  const ans = (q.correct_answer || '').trim()

  // Essay: set options to carry allow_file flag
  if (q.type === 'essay') {
    q.options = [{ allow_file: q.allow_file || false }]
    return q
  }

  // Detect true/false from question text
  if (
    q.options.length === 0 &&
    /đúng hay sai|đúng\/sai|true or false/i.test(q.question)
  ) {
    q.type = 'true_false'
    q.options = [
      { key: 'Đúng', text: 'Đúng' },
      { key: 'Sai', text: 'Sai' },
    ]
    if (!ans) q.correct_answer = 'Đúng'
    return q
  }

  if (q.options.length === 0) {
    // Không có options → fill_blank
    q.type = 'fill_blank'
    return q
  }

  // Có options → phân biệt các dạng theo answer
  if (ans) {
    // Nối đôi: answer dạng "A-2,B-1,C-3" (có dấu -)
    if (/^[A-E]-\d+(,[A-E]-\d+)*$/.test(ans)) {
      q.type = 'matching'
      return q
    }

    // Sắp xếp thứ tự: answer dạng "A,C,B" (nhiều chữ cái in hoa, phân cách bằng dấu phẩy)
    if (/^[A-E](,[A-E])+$/.test(ans)) {
      q.type = 'ordering'
      return q
    }

    // Sắp xếp từ: answer là cả câu (có khoảng trắng)
    if (ans.includes(' ')) {
      q.type = 'word_order'
      return q
    }

    // Kéo thả từ: question có ___ và có options (ngân hàng từ)
    if (q.question.includes('___')) {
      q.type = 'drag_word'
      return q
    }
  } else {
    // Không có answer nhưng question có ___  và có options → drag_word
    if (q.question.includes('___')) {
      q.type = 'drag_word'
      return q
    }
  }

  // Mặc định: trắc nghiệm
  q.type = 'multiple_choice'
  return q
}
