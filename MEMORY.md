# Dự án: Ôn Tập Tin Học Tiểu Học

## Mục tiêu
Web app giúp học sinh tiểu học khối 3,4,5 ôn tập Tin học cuối kỳ/chủ đề.
2 role: **giáo viên** (quản lý nội dung) và **học sinh** (luyện tập).

## Stack
- React + Tailwind v4 (Vite) — plugin `@tailwindcss/vite`, KHÔNG dùng tailwind.config.js
- Supabase (auth + DB + RLS)
- Cloudinary (lưu ảnh, unsigned upload preset tên `ontapcuoiki`)
- Deploy: Vercel (chưa deploy)

## Cấu trúc thư mục
```
src/
  lib/            supabase.js, cloudinary.js
  context/        AuthContext.jsx (user, profile, signIn, signOut)
  hooks/          useTopics.js
  utils/          questionParser.js (regex parse text từ Word)
  components/
    ui/            Layout.jsx (sidebar), ProtectedRoute.jsx
    teacher/       QuestionImportModal.jsx, QuestionCard.jsx
    student/       QuizSession.jsx
  pages/
    LoginPage.jsx
    teacher/       TeacherDashboard, QuestionsPage, TopicsPage, ExamsPage (placeholder)
    student/       StudentDashboard, PracticePage, HistoryPage
```

## Database Supabase
File gốc: `supabase_schema.sql`
| Bảng | Columns chính |
|------|---------------|
| `profiles` | id, full_name, role(teacher/student), grade(3/4/5) |
| `questions` | id, question, type, options(jsonb), correct_answer, image_url, grade, topic, difficulty |
| `quiz_sessions` | id, user_id, mode, total, correct, score, answers(jsonb), question_ids |
| `topics` | id, name, grade(3/4/5/all) |

**Lưu ý tạo user:** Trigger `on_auth_user_created` tự tạo profile. Nếu lỗi:
drop trigger → tạo user trong Dashboard → insert profile thủ công → recreate trigger.

## Dạng câu hỏi
- `multiple_choice`: A/B/C/D
- `true_false`: Đúng/Sai
- `fill_blank`: điền từ

## Chức năng đã hoàn thành
### Giáo viên
- Đăng nhập, sidebar điều hướng
- **Câu hỏi** (`/teacher/questions`): paste text → auto parse → preview/chỉnh sửa → upload ảnh Cloudinary → lưu Supabase
- **Chủ đề** (`/teacher/topics`): thêm/sửa inline/xóa, gắn khối cụ thể hoặc all
- **Đề thi** (`/teacher/exams`): placeholder chưa làm

### Học sinh
- Đăng nhập, sidebar điều hướng
- **Luyện tập** (`/student/practice`): chọn chủ đề + mức độ + số câu → làm bài
- **Quiz session**: câu hỏi + đáp án, xác nhận, feedback đúng/sai, panel số câu bên phải (nhảy câu, màu trạng thái), nút Nộp bài
- **Kết quả**: điểm, số câu đúng, review từng câu
- **Lịch sử** (`/student/history`): danh sách các lần làm bài

## Việc cần làm tiếp (theo thứ tự ưu tiên)
1. **Trang Đề thi** (`/teacher/exams`): GV tạo đề (chọn câu hỏi/chủ đề, số câu, thời gian) → học sinh vào thi với đồng hồ đếm ngược
2. **Dashboard thống kê GV**: hiển thị tổng câu hỏi, số đề thi, số học sinh thay vì dấu "—"
3. **Quản lý học sinh**: GV xem danh sách + kết quả học sinh
4. **Deploy Vercel**: thêm env vars

## V2 (chưa làm)
- Kéo thả từ vào chỗ trống (dnd-kit)
- Ghép đôi
- Upload .docx (mammoth.js)

## Lưu ý kỹ thuật
- Topics load từ DB qua `useTopics` hook — KHÔNG hardcode trong component
- `questionParser.js` dùng regex, nhận pattern `Câu N:` hoặc `N.`, tìm `Đáp án:`
- RLS: teacher mới được insert/update/delete questions và topics
- `quiz_sessions` RLS: user chỉ đọc/ghi bài của chính mình
