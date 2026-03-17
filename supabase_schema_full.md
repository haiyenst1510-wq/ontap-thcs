# Supabase Schema Đầy Đủ — THCS Learning Platform

> Chạy toàn bộ SQL bên dưới trong **Supabase → SQL Editor → New query**.
> Bao gồm tất cả bảng, RLS policies, trigger, và các fix lỗi đã thêm trong quá trình phát triển.

---

```sql
-- ============================================================
-- THCS Learning Platform — Full Schema (bao gồm tất cả fix)
-- Grades: 6, 7, 8, 9 | Roles: admin / teacher / student
-- ============================================================

-- Bật extension tạo UUID
create extension if not exists "pgcrypto";


-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'student'
                check (role in ('admin', 'teacher', 'student')),
  grade       text check (grade in ('6', '7', '8', '9')),
  email       text,
  avatar_url  text,
  class_name  text,
  username    text,
  is_active   boolean not null default true,
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- 2. GRADES TABLE
-- ============================================================
create table if not exists public.grades (
  id         serial primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

insert into public.grades (name) values ('6'), ('7'), ('8'), ('9')
  on conflict (name) do nothing;


-- ============================================================
-- 3. SUBJECTS TABLE
-- ============================================================
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default 'indigo',
  icon       text not null default 'BookOpen',
  created_at timestamptz not null default now()
);


-- ============================================================
-- 4. TEACHER_SUBJECTS TABLE
-- ============================================================
create table if not exists public.teacher_subjects (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_id)
);


-- ============================================================
-- 5. TOPICS TABLE
-- ============================================================
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  grade      text not null check (grade in ('6', '7', '8', '9')),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 6. QUESTIONS TABLE
-- (cột "question" thay vì "content", thêm word_order, audio_url, image_url, match_options, created_by)
-- ============================================================
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  question       text not null,
  type           text not null check (type in (
                   'multiple_choice', 'true_false', 'fill_blank',
                   'drag_word', 'matching', 'ordering', 'word_order'
                 )),
  options        jsonb,
  match_options  jsonb,
  correct_answer text,
  explanation    text,
  image_url      text,
  audio_url      text,
  topic          text,
  grade          text not null check (grade in ('6', '7', '8', '9')),
  subject_id     uuid not null references public.subjects(id) on delete cascade,
  difficulty     text not null default 'medium'
                   check (difficulty in ('easy', 'medium', 'hard')),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);


-- ============================================================
-- 7. LESSONS TABLE
-- (question_ids thay vì questions jsonb, thêm has_practice)
-- ============================================================
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  topic        text,
  grade        text not null check (grade in ('6', '7', '8', '9')),
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  video_url    text,
  question_ids uuid[] not null default '{}',
  has_practice boolean not null default false,
  is_published boolean not null default false,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);


-- ============================================================
-- 8. EXAMS TABLE
-- (question_ids thay vì questions jsonb, time_limit nullable,
--  thêm max_attempts, is_active, show_answer, show_score)
-- ============================================================
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  grade        text not null check (grade in ('6', '7', '8', '9')),
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  topic        text,
  question_ids uuid[] not null default '{}',
  time_limit   integer,          -- phút, NULL = không giới hạn
  max_attempts integer default 0, -- 0 = không giới hạn
  is_active    boolean not null default false,
  show_answer  boolean not null default true,
  show_score   boolean not null default true,
  created_at   timestamptz not null default now()
);


-- ============================================================
-- 9. QUIZ_SESSIONS TABLE
-- (exam_id nullable cho practice mode, thêm correct, question_ids, attempt_number)
-- ============================================================
create table if not exists public.quiz_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  exam_id        uuid references public.exams(id) on delete cascade,
  score          numeric,
  correct        integer,
  total          integer,
  answers        jsonb,
  question_ids   uuid[],          -- dùng cho practice mode (không có exam_id)
  mode           text check (mode in ('practice', 'exam')),
  attempt_number integer default 1,
  created_at     timestamptz not null default now()
);


-- ============================================================
-- 10. LESSON_PROGRESS TABLE
-- (thêm quiz_passed, practice_submitted, completed, updated_at)
-- ============================================================
create table if not exists public.lesson_progress (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  lesson_id          uuid not null references public.lessons(id) on delete cascade,
  video_watched      boolean not null default false,
  quiz_passed        boolean not null default false,
  practice_submitted boolean not null default false,
  score              numeric,
  completed          boolean not null default false,
  updated_at         timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, lesson_id)
);


-- ============================================================
-- 11. LESSON_SUBMISSIONS TABLE
-- (học sinh nộp bài thực hành)
-- ============================================================
create table if not exists public.lesson_submissions (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid references public.lessons(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  content    text,
  image_url  text,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 12. CLASSES TABLE
-- ============================================================
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  grade      text check (grade in ('6', '7', '8', '9')),
  created_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_topics_grade             on public.topics(grade);
create index if not exists idx_topics_subject_id        on public.topics(subject_id);
create index if not exists idx_lessons_grade            on public.lessons(grade);
create index if not exists idx_lessons_subject_id       on public.lessons(subject_id);
create index if not exists idx_questions_grade          on public.questions(grade);
create index if not exists idx_questions_subject        on public.questions(subject_id);
create index if not exists idx_exams_grade              on public.exams(grade);
create index if not exists idx_exams_subject_id         on public.exams(subject_id);
create index if not exists idx_quiz_sessions_user       on public.quiz_sessions(user_id);
create index if not exists idx_quiz_sessions_exam       on public.quiz_sessions(exam_id);
create index if not exists idx_lesson_progress_user     on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson   on public.lesson_progress(lesson_id);
create index if not exists idx_teacher_subjects_teacher on public.teacher_subjects(teacher_id);
create index if not exists idx_teacher_subjects_subject on public.teacher_subjects(subject_id);


-- ============================================================
-- TRIGGER: tự động tạo profile khi đăng ký tài khoản mới
-- is_approved = false → phải chờ admin duyệt mới đăng nhập được
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, grade, email, is_approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    nullif(new.raw_user_meta_data->>'grade', ''),
    new.email,
    false   -- mặc định chưa được duyệt, admin phải duyệt thủ công
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role      = coalesce(excluded.role, profiles.role),
    grade     = excluded.grade,
    email     = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY — bật RLS cho tất cả bảng
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.grades            enable row level security;
alter table public.subjects          enable row level security;
alter table public.teacher_subjects  enable row level security;
alter table public.topics            enable row level security;
alter table public.lessons           enable row level security;
alter table public.questions         enable row level security;
alter table public.exams             enable row level security;
alter table public.quiz_sessions     enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.classes           enable row level security;


-- ---- Helper functions ----
create or replace function public.is_admin()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'teacher')
  );
$$;


-- ============================================================
-- POLICIES: profiles
-- ============================================================
drop policy if exists "profiles: users can read own profile"   on public.profiles;
drop policy if exists "profiles: admin can read all profiles"  on public.profiles;
drop policy if exists "profiles: users can update own profile" on public.profiles;
drop policy if exists "profiles: admin can update all profiles" on public.profiles;
drop policy if exists "profiles: admin can delete profiles"    on public.profiles;

create policy "profiles: users can read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_teacher());

create policy "profiles: users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin can update all profiles"
  on public.profiles for update
  using (public.is_admin());

create policy "profiles: admin can delete profiles"
  on public.profiles for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: grades
-- ============================================================
drop policy if exists "grades: anyone authenticated can read" on public.grades;
drop policy if exists "grades: admin can manage"              on public.grades;

create policy "grades: anyone authenticated can read"
  on public.grades for select
  using (auth.role() = 'authenticated');

create policy "grades: admin can manage"
  on public.grades for all
  using (public.is_admin());


-- ============================================================
-- POLICIES: subjects
-- ============================================================
drop policy if exists "subjects: anyone authenticated can read" on public.subjects;
drop policy if exists "subjects: admin can manage"              on public.subjects;

create policy "subjects: anyone authenticated can read"
  on public.subjects for select
  using (auth.role() = 'authenticated');

create policy "subjects: admin can manage"
  on public.subjects for all
  using (public.is_admin());


-- ============================================================
-- POLICIES: teacher_subjects
-- ============================================================
drop policy if exists "teacher_subjects: authenticated can read" on public.teacher_subjects;
drop policy if exists "teacher_subjects: admin can manage"       on public.teacher_subjects;
drop policy if exists "teacher_subjects: teacher can insert own" on public.teacher_subjects;

create policy "teacher_subjects: authenticated can read"
  on public.teacher_subjects for select
  using (auth.role() = 'authenticated');

create policy "teacher_subjects: teacher can insert own"
  on public.teacher_subjects for insert
  with check (auth.uid() = teacher_id);

create policy "teacher_subjects: admin can manage"
  on public.teacher_subjects for all
  using (public.is_admin());


-- ============================================================
-- POLICIES: topics
-- ============================================================
drop policy if exists "topics: authenticated can read"        on public.topics;
drop policy if exists "topics: teacher or admin can insert"   on public.topics;
drop policy if exists "topics: teacher or admin can update"   on public.topics;
drop policy if exists "topics: admin can delete"              on public.topics;

create policy "topics: authenticated can read"
  on public.topics for select
  using (auth.role() = 'authenticated');

create policy "topics: teacher or admin can insert"
  on public.topics for insert
  with check (public.is_teacher());

create policy "topics: teacher or admin can update"
  on public.topics for update
  using (public.is_teacher());

create policy "topics: admin can delete"
  on public.topics for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: lessons
-- ============================================================
drop policy if exists "lessons: students see published"        on public.lessons;
drop policy if exists "lessons: teacher or admin can insert"   on public.lessons;
drop policy if exists "lessons: teacher or admin can update"   on public.lessons;
drop policy if exists "lessons: admin can delete"              on public.lessons;

create policy "lessons: students see published"
  on public.lessons for select
  using (is_published = true or public.is_teacher());

create policy "lessons: teacher or admin can insert"
  on public.lessons for insert
  with check (public.is_teacher());

create policy "lessons: teacher or admin can update"
  on public.lessons for update
  using (public.is_teacher());

create policy "lessons: admin can delete"
  on public.lessons for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: questions
-- ============================================================
drop policy if exists "questions: teacher or admin can read all" on public.questions;
drop policy if exists "questions: students can read"             on public.questions;
drop policy if exists "questions: teacher or admin can insert"   on public.questions;
drop policy if exists "questions: teacher or admin can update"   on public.questions;
drop policy if exists "questions: admin can delete"              on public.questions;

create policy "questions: authenticated can read"
  on public.questions for select
  using (auth.role() = 'authenticated');

create policy "questions: teacher or admin can insert"
  on public.questions for insert
  with check (public.is_teacher());

create policy "questions: teacher or admin can update"
  on public.questions for update
  using (public.is_teacher());

create policy "questions: teacher or admin can delete"
  on public.questions for delete
  using (public.is_teacher());


-- ============================================================
-- POLICIES: exams
-- ============================================================
drop policy if exists "exams: students see published"        on public.exams;
drop policy if exists "exams: teacher or admin can insert"   on public.exams;
drop policy if exists "exams: teacher or admin can update"   on public.exams;
drop policy if exists "exams: admin can delete"              on public.exams;

create policy "exams: students see active"
  on public.exams for select
  using (is_active = true or public.is_teacher());

create policy "exams: teacher or admin can insert"
  on public.exams for insert
  with check (public.is_teacher());

create policy "exams: teacher or admin can update"
  on public.exams for update
  using (public.is_teacher());

create policy "exams: teacher or admin can delete"
  on public.exams for delete
  using (public.is_teacher());


-- ============================================================
-- POLICIES: quiz_sessions
-- ============================================================
drop policy if exists "quiz_sessions: users can read own"   on public.quiz_sessions;
drop policy if exists "quiz_sessions: users can insert own" on public.quiz_sessions;
drop policy if exists "quiz_sessions: users can update own" on public.quiz_sessions;
drop policy if exists "quiz_sessions: admin can delete"     on public.quiz_sessions;

create policy "quiz_sessions: users can read own"
  on public.quiz_sessions for select
  using (auth.uid() = user_id or public.is_teacher());

create policy "quiz_sessions: users can insert own"
  on public.quiz_sessions for insert
  with check (auth.uid() = user_id);

create policy "quiz_sessions: users can update own"
  on public.quiz_sessions for update
  using (auth.uid() = user_id);

create policy "quiz_sessions: admin can delete"
  on public.quiz_sessions for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: lesson_progress
-- ============================================================
drop policy if exists "lesson_progress: users can read own"   on public.lesson_progress;
drop policy if exists "lesson_progress: users can insert own" on public.lesson_progress;
drop policy if exists "lesson_progress: users can update own" on public.lesson_progress;
drop policy if exists "lesson_progress: admin can delete"     on public.lesson_progress;

create policy "lesson_progress: users can read own"
  on public.lesson_progress for select
  using (auth.uid() = user_id or public.is_teacher());

create policy "lesson_progress: users can insert own"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "lesson_progress: users can update own"
  on public.lesson_progress for update
  using (auth.uid() = user_id);

create policy "lesson_progress: admin can delete"
  on public.lesson_progress for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: lesson_submissions
-- ============================================================
create policy "lesson_submissions: student can insert own"
  on public.lesson_submissions for insert
  with check (auth.uid() = student_id);

create policy "lesson_submissions: student can read own"
  on public.lesson_submissions for select
  using (auth.uid() = student_id or public.is_teacher());

create policy "lesson_submissions: teacher can update"
  on public.lesson_submissions for update
  using (public.is_teacher());

create policy "lesson_submissions: admin can delete"
  on public.lesson_submissions for delete
  using (public.is_admin());


-- ============================================================
-- POLICIES: classes
-- ============================================================
create policy "classes: authenticated can read"
  on public.classes for select
  using (auth.role() = 'authenticated');

create policy "classes: teacher or admin can manage"
  on public.classes for all
  using (public.is_teacher());


-- ============================================================
-- TẠO TÀI KHOẢN ADMIN ĐẦU TIÊN
-- Thay email và password trước khi chạy
-- ============================================================
-- Cách 1: Dùng Supabase Dashboard → Authentication → Users → Add user
-- Cách 2: Sau khi tạo user, chạy lệnh sau để set role = admin và duyệt:
--
-- UPDATE public.profiles
-- SET role = 'admin', is_approved = true
-- WHERE email = 'your-admin@email.com';
```

---

## Hướng Dẫn Chạy Trên Supabase Mới

1. Vào **Supabase → SQL Editor → New query**
2. Copy toàn bộ SQL trong khung trên, paste vào, bấm **Run**
3. Sau khi chạy xong, tạo tài khoản admin:
   - Vào **Authentication → Users → Add user**
   - Nhập email + password của admin
4. Chạy thêm lệnh này để set admin:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', is_approved = true
   WHERE email = 'email-admin-cua-ban@gmail.com';
   ```

---

## Các Fix Đã Được Tích Hợp Vào Schema Này

| Vấn đề | Fix |
|--------|-----|
| `image_url` column not found | Thêm `image_url text` vào bảng `questions` |
| `audio_url` column not found | Thêm `audio_url text` vào bảng `questions` |
| `word_order` type không hợp lệ | Thêm `'word_order'` vào CHECK constraint của `questions.type` |
| `has_practice` column not found | Thêm `has_practice boolean` vào bảng `lessons` |
| `question_ids` column not found (lessons) | Thay `questions jsonb` → `question_ids uuid[]` trong `lessons` |
| `question_ids` column not found (exams) | Thay `questions jsonb` → `question_ids uuid[]` trong `exams` |
| `has_practice` column not found (lessons) | Thêm `has_practice boolean` |
| `lesson_submissions` table not found | Tạo bảng `lesson_submissions` |
| Tạo kì thi không giới hạn thời gian thất bại | `time_limit integer` nullable (bỏ NOT NULL) |
| Tài khoản mới đăng nhập được ngay | Trigger set `is_approved = false` mặc định |
| Hết giờ vẫn làm tiếp được | Fix trong code: `!timeLeft` → `timeLeft === null` |
