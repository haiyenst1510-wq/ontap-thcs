# Luồng Hoạt Động — Ứng Dụng Ôn Tập Tin

## Tổng quan

Ứng dụng web hỗ trợ ôn tập môn Tin học cho học sinh tiểu học, gồm 2 vai trò: **Giáo viên** và **Học sinh**.

**Stack kỹ thuật:** React + Tailwind CSS v4, Vite, Supabase (auth + database), React Router v6, react-hot-toast

---

## 1. Xác thực (Authentication)

```
Truy cập "/" → RootRedirect
  ├─ Chưa đăng nhập → /login
  ├─ role = "teacher" → /teacher
  └─ role = "student" → /student
```

- Đăng nhập qua `supabase.auth.signInWithPassword`
- Profile người dùng lưu trong bảng `profiles` (id, full_name, role, grade, class_name)
- `AuthContext` cung cấp `{ user, profile, signOut }` cho toàn app
- `ProtectedRoute` kiểm tra role; redirect về `/login` nếu chưa đăng nhập

---

## 2. Luồng Giáo Viên

### 2.1 Tổng quan (`/teacher`)

- Hiển thị bảng xếp hạng học sinh theo **đề thi** (exam_sessions) và **luyện tập** (quiz_sessions)
- Dữ liệu lấy theo 2 bước: fetch sessions → fetch profiles theo user_id → ghép JS
- Hiện top học sinh theo điểm trung bình và điểm cao nhất

### 2.2 Quản lý Câu hỏi (`/teacher/questions`)

```
Danh sách câu hỏi
├─ Lọc: khối / chủ đề / mức độ / loại câu hỏi
├─ Tạo / Sửa câu hỏi (modal QuestionFormModal)
│   ├─ Loại: multiple_choice | true_false | fill_blank | matching | ordering | drag_word
│   ├─ Tải ảnh lên qua Cloudinary (unsigned upload)
│   └─ Đáp án đúng, các lựa chọn (nếu có)
├─ Import hàng loạt từ file JSON/CSV (QuestionImportModal)
└─ Xóa câu hỏi
```

Bảng DB: `questions` (id, question, type, difficulty, topic, grade, options[], correct_answer, image_url)

### 2.3 Quản lý Chủ đề (`/teacher/topics`)

- Tạo / Sửa / Xóa chủ đề
- Mỗi chủ đề có: tên, khối (grade hoặc "all")
- Bảng DB: `topics` (id, name, grade)

### 2.4 Quản lý Đề thi (`/teacher/exams`)

```
Danh sách đề thi
├─ Lọc: khối / chủ đề
├─ Tạo / Sửa đề thi (modal 2 bước)
│   ├─ Bước 1 — Thông tin:
│   │   ├─ Tiêu đề, khối
│   │   ├─ Phân lớp (chip multi-select, lưu class_names text[])
│   │   ├─ Thời gian làm (phút), số lần làm tối đa
│   │   └─ Bật/tắt: hiện đáp án, hiện điểm, kích hoạt đề
│   └─ Bước 2 — Chọn câu hỏi:
│       ├─ Lọc theo chủ đề / mức độ
│       ├─ Chọn ngẫu nhiên N câu
│       └─ Tick/bỏ tick từng câu
├─ Toggle kích hoạt đề thi (ToggleRight/ToggleLeft)
├─ Xem kết quả → điều hướng đến /teacher/exams/:id/results
└─ Xóa đề thi
```

Bảng DB: `exams` (id, title, grade, class_names[], time_limit, max_attempts, is_active, show_answer, show_score, question_ids[])

### 2.5 Kết quả Đề thi (`/teacher/exams/:id/results`)

```
Trang kết quả cho 1 đề thi cụ thể
├─ Lọc theo lớp
├─ Danh sách học sinh (sắp xếp theo điểm cao nhất)
│   └─ Click học sinh → xem chi tiết
│       ├─ Tabs các lần làm bài
│       └─ Từng câu hỏi: đáp án đúng/sai, câu trả lời của học sinh
```

- Dữ liệu: exam_sessions → join profiles (2 bước), questions

### 2.6 Thống kê theo Lớp (`/teacher/exam-stats`)

```
Ma trận: hàng = học sinh, cột = đề thi
├─ Lọc: khối / lớp
├─ Mỗi ô: điểm trung bình + số lần làm
└─ Click học sinh → StudentDetailModal
    └─ Xem từng đề thi: danh sách lần làm + chi tiết từng câu
```

### 2.7 Quản lý Bài học (`/teacher/lessons`)

```
Danh sách bài học
├─ Lọc: khối / chủ đề
├─ Tạo / Sửa bài học (modal 2 bước)
│   ├─ Bước 1 — Thông tin:
│   │   ├─ Tiêu đề (*), khối, chủ đề, mô tả
│   │   ├─ URL Video YouTube (tuỳ chọn)
│   │   ├─ Thứ tự hiển thị
│   │   └─ Toggle: có bài nộp thực hành
│   └─ Bước 2 — Câu hỏi:
│       ├─ Lọc theo chủ đề / mức độ
│       ├─ Chọn ngẫu nhiên N câu
│       └─ Tick/bỏ tick từng câu
├─ Toggle xuất bản / ẩn bài học
├─ Xem bài nộp → /teacher/lessons/:id/submissions
└─ Xóa bài học
```

Bảng DB: `lessons` (id, title, grade, topic, description, video_url, order, has_practice, is_published, question_ids[])

### 2.8 Bài nộp Thực hành (`/teacher/lessons/:id/submissions`)

```
Danh sách học sinh đã nộp bài
├─ Hiển thị: tên, lớp, thời gian nộp, trạng thái nhận xét
└─ Click → xem chi tiết bài nộp
    ├─ Nội dung text học sinh viết
    ├─ Ảnh minh chứng (nếu có)
    ├─ Ô nhập nhận xét của giáo viên
    └─ Lưu nhận xét → cập nhật lesson_submissions.teacher_comment
```

Bảng DB: `lesson_submissions` (id, user_id, lesson_id, text_content, file_url, submitted_at, teacher_comment, reviewed_at)

### 2.9 Quản lý Khối (`/teacher/grades`)

```
Danh sách các khối học (lấy từ bảng grades)
├─ Thêm khối mới (inline form)
└─ Xóa khối (bị chặn nếu còn lớp/học sinh thuộc khối đó)
```

Bảng DB: `grades` (value text UNIQUE)

Hook: `useGrades()` → trả về `{ grades: string[], loading, refetch }`

### 2.10 Quản lý Lớp (`/teacher/classes`)

```
Danh sách lớp học
├─ Lọc theo khối (load động từ grades table)
├─ Thêm lớp (tên + chọn khối)
├─ Sửa tên / khối lớp
├─ Xóa lớp
└─ Click "N HS" → /teacher/students?class=<tên_lớp>
```

Bảng DB: `classes` (id, name, grade)

### 2.11 Quản lý Học sinh (`/teacher/students`)

```
Danh sách học sinh
├─ Lọc: khối / lớp / tìm kiếm tên
└─ Xem thông tin: tên, lớp, khối
```

---

## 3. Luồng Học Sinh

### 3.1 Trang chủ (`/student`)

- Hiển thị bảng xếp hạng lớp (tên, số lần làm, điểm TB, điểm cao nhất)
- Lấy từ exam_sessions lọc theo class_name của học sinh đang đăng nhập

### 3.2 Học tập (`/student/learn`)

```
Danh sách bài học đã xuất bản (theo khối học sinh)
├─ Nhóm theo chủ đề
├─ Mỗi bài hiển thị:
│   ├─ Icon trạng thái: chưa học (xám) / đang học (cam) / hoàn thành (xanh)
│   ├─ Badge: Video / N câu hỏi / Thực hành
│   └─ Progress chips: Video ○/✓ | Bài tập x/y | Thực hành ○/✓
└─ Click → /student/learn/:id
```

Bảng DB: `lesson_progress` (user_id, lesson_id, video_watched, quiz_passed, quiz_correct, quiz_total, practice_submitted, completed)

### 3.3 Chi tiết Bài học (`/student/learn/:id`)

```
Thanh tiến độ: x/y bước hoàn thành
│
├─ [Nếu có Video]
│   ├─ Nhúng YouTube iframe
│   └─ Nút "Đánh dấu đã xem" → video_watched = true
│
├─ [Nếu có Câu hỏi]
│   ├─ Hiển thị trạng thái đã đạt (nếu rồi) + "Làm lại"
│   ├─ Nút "Bắt đầu làm bài" → hiển thị LessonQuiz
│   └─ LessonQuiz:
│       ├─ Hiển thị tất cả câu hỏi cùng lúc (worksheet style)
│       ├─ Hỗ trợ: multiple_choice, true_false, fill_blank, matching, ordering, drag_word
│       ├─ Nộp → chấm tự động → hiển thị đúng/sai từng câu
│       ├─ Đạt khi ≥ 2/3 câu đúng → quiz_passed = true
│       └─ Chưa đạt → "Làm lại"
│
└─ [Nếu có Thực hành]
    ├─ Đã nộp: hiển thị bài cũ + nhận xét giáo viên
    └─ Chưa nộp:
        ├─ Ô text mô tả
        ├─ Upload ảnh minh chứng (Cloudinary)
        └─ Nút "Nộp bài" → lưu lesson_submissions, practice_submitted = true
```

**Hoàn thành bài học** khi tất cả bước bắt buộc đều ✓:
`completed = (video_watched || !has_video) && (quiz_passed || !has_quiz) && (practice_submitted || !has_practice)`

### 3.4 Đề thi (`/student/exams`)

```
Danh sách đề thi đang kích hoạt
├─ Lọc: chỉ hiện đề dành cho lớp học sinh
│   (class_names IS NULL hoặc class_names chứa lớp của học sinh)
├─ Hiện số lần đã làm / tối đa cho phép
├─ Nút "Làm bài" → mở QuizSession
│   ├─ Đếm ngược thời gian
│   ├─ Trả lời từng câu
│   └─ Nộp → lưu exam_sessions, tính điểm
└─ Lịch sử các lần làm
```

Bảng DB: `exam_sessions` (id, user_id, exam_id, score, answers, submitted_at)

### 3.5 Luyện tập (`/student/practice`)

```
Cấu hình bài luyện:
├─ Chọn chủ đề: checkbox list (chọn nhiều, mỗi chủ đề 1 dòng)
├─ Chọn mức độ: Easy / Medium / Hard (button row)
└─ Chọn số câu

Bắt đầu → QuizSession (câu hỏi random từ ngân hàng)
└─ Kết quả lưu vào quiz_sessions
```

Bảng DB: `quiz_sessions` (id, user_id, score, topic, difficulty, submitted_at)

### 3.6 Kết quả (`/student/history`)

- Lịch sử tất cả bài đã làm (exam + luyện tập)
- Hiển thị: tên đề / chủ đề, điểm, thời gian

---

## 4. Cơ sở Dữ liệu (Supabase)

| Bảng | Mô tả |
|---|---|
| `profiles` | Thông tin người dùng (role, grade, class_name) |
| `grades` | Danh sách khối (value text UNIQUE) |
| `classes` | Danh sách lớp (name, grade) |
| `topics` | Chủ đề câu hỏi (name, grade) |
| `questions` | Ngân hàng câu hỏi |
| `exams` | Đề thi (có class_names text[]) |
| `exam_sessions` | Lịch sử làm đề thi |
| `quiz_sessions` | Lịch sử luyện tập |
| `lessons` | Bài học (video, câu hỏi, thực hành) |
| `lesson_progress` | Tiến độ học sinh mỗi bài (UNIQUE user+lesson) |
| `lesson_submissions` | Bài nộp thực hành |

**Lưu ý kỹ thuật:**
- `exam_sessions.user_id` không có FK trực tiếp đến `profiles` → phải fetch 2 bước + join JS
- `exams.class_names` là `text[]` → filter: `.or('class_names.is.null,class_names.cs.{"<tên_lớp>"}')`
- `lesson_progress` có constraint UNIQUE (user_id, lesson_id) → dùng `upsert` với `onConflict`

---

## 5. Hooks Dùng Chung

| Hook | Nguồn | Trả về |
|---|---|---|
| `useAuth()` | AuthContext | `{ user, profile, signOut }` |
| `useGrades()` | `grades` table | `{ grades: string[], loading, refetch }` |
| `useTopics()` | `topics` table | `{ topics: Topic[], loading }` |

---

## 6. Sơ đồ Điều hướng

```
/login
│
├─ /teacher                    Tổng quan
├─ /teacher/questions          Ngân hàng câu hỏi
├─ /teacher/topics             Chủ đề
├─ /teacher/exams              Đề thi
├─ /teacher/exams/:id/results  Kết quả chi tiết 1 đề
├─ /teacher/exam-stats         Thống kê ma trận lớp
├─ /teacher/lessons            Bài học
├─ /teacher/lessons/:id/submissions  Bài nộp thực hành
├─ /teacher/grades             Quản lý khối
├─ /teacher/classes            Quản lý lớp
└─ /teacher/students           Danh sách học sinh
│
├─ /student                    Trang chủ + bảng xếp hạng
├─ /student/learn              Danh sách bài học
├─ /student/learn/:id          Chi tiết bài học
├─ /student/exams              Đề thi
├─ /student/practice           Luyện tập
└─ /student/history            Kết quả
```

---

## 7. Tích hợp Bên Ngoài

- **Supabase Auth**: đăng nhập/đăng xuất, session
- **Supabase Storage / RLS**: bảo vệ dữ liệu theo role
- **Cloudinary**: upload ảnh câu hỏi và bài nộp thực hành (unsigned upload, dùng `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET`)
- **YouTube**: nhúng video bài giảng qua iframe embed (parse video ID từ URL youtu.be hoặc ?v=)
