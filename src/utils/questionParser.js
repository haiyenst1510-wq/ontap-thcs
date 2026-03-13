/**
 * Parse text copied from Word into structured questions.
 * Supports: multiple choice (A/B/C/D), true/false, fill-in-the-blank
 */

export function parseQuestions(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const questions = []
  let current = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect start of a new question
    const questionMatch = line.match(/^(?:Câu\s*)?(\d+)[.):]\s*(.+)$/i)
    if (questionMatch) {
      if (current) questions.push(finalizeQuestion(current))
      current = {
        order: parseInt(questionMatch[1]),
        question: questionMatch[2],
        type: 'fill_blank',
        options: [],
        correct_answer: null,
        image_url: null,
      }
      continue
    }

    if (!current) continue

    // Detect options A/B/C/D
    const optionMatch = line.match(/^([A-D])[.)]\s*(.+)$/i)
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

    // Detect true/false question
    const tfMatch = line.match(/^(?:Đúng|Sai|True|False)$/i)
    if (tfMatch && current.type !== 'multiple_choice') {
      current.type = 'true_false'
      current.correct_answer = tfMatch[0]
      continue
    }

    // Continuation of question text
    if (current.options.length === 0) {
      current.question += ' ' + line
    }
  }

  if (current) questions.push(finalizeQuestion(current))
  return questions
}

function finalizeQuestion(q) {
  // Auto-detect true/false from question text if no options
  if (q.options.length === 0 && q.type !== 'fill_blank') {
    q.type = 'fill_blank'
  }

  // Detect true/false from question ending
  if (
    q.options.length === 0 &&
    /đúng hay sai|đúng\/sai|true or false/i.test(q.question)
  ) {
    q.type = 'true_false'
    q.options = [
      { key: 'Đúng', text: 'Đúng' },
      { key: 'Sai', text: 'Sai' },
    ]
  }

  return q
}
