-- ============================================================
-- EDUQUIZMASTER — Supabase Schema (cập nhật đầy đủ)
-- Chạy trong: Supabase Dashboard → SQL Editor
-- Lệnh có IF NOT EXISTS / OR REPLACE → an toàn chạy lại nhiều lần
-- ============================================================

-- ============================================================
-- 1. GRADES — Danh sách khối lớp
-- ============================================================
create table if not exists public.grades (
  id         serial primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

insert into public.grades (name) values ('6'), ('7'), ('8'), ('9')
  on conflict (name) do nothing;

-- ============================================================
-- 2. PROFILES — Thông tin người dùng
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'student'
                check (role in ('admin', 'teacher', 'student')),
  grade       text,
  class_name  text,
  username    text,
  avatar_url  text,
  is_approved boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. SUBJECTS — Danh sách môn học
-- ============================================================
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default 'indigo',
  icon       text not null default 'BookOpen',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. TEACHER_SUBJECTS — Giáo viên được phân công môn nào
-- ============================================================
create table if not exists public.teacher_subjects (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_id)
);

-- ============================================================
-- 5. TOPICS — Chủ đề theo môn và khối lớp
-- ============================================================
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  grade      text not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. QUESTIONS — Ngân hàng câu hỏi
-- ============================================================
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  question       text not null,
  type           text not null check (type in (
                   'multiple_choice',
                   'true_false',
                   'fill_blank',
                   'matching',
                   'ordering',
                   'drag_word',
                   'word_order'
                 )),
  options        jsonb default '[]',
  -- [{key:"A", text:"...", image_url:"..."}]
  match_options  jsonb default '[]',
  -- cột phải cho dạng nối đôi: [{key:"1", text:"..."}]
  correct_answer text,
  -- multiple_choice: "B"
  -- true_false:      "Đúng" | "Sai"
  -- fill_blank:      "Hà Nội" | "Hà Nội,Việt Nam"
  -- matching:        "A-2,B-3,C-1"
  -- ordering:        "A,B,C,D"
  -- drag_word:       "CPU" | "CPU,RAM"
  -- word_order:      "She is a teacher"
  image_url      text,
  audio_url      text,
  grade          text not null,
  subject_id     uuid references public.subjects(id) on delete set null,
  topic          text,
  difficulty     text not null default 'easy'
                   check (difficulty in ('easy', 'medium', 'hard')),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- 7. EXAMS — Đề thi
-- ============================================================
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  grade        text not null,
  subject_id   uuid references public.subjects(id) on delete set null,
  time_limit   integer default 30,
  max_attempts integer default 1,
  is_active         boolean not null default false,
  show_answer       boolean not null default true,
  show_score        boolean not null default true,
  shuffle_questions boolean not null default false,
  shuffle_options   boolean not null default false,
  question_ids      uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 8. QUIZ_SESSIONS — Kết quả mỗi lần làm bài
-- ============================================================
create table if not exists public.quiz_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  exam_id        uuid references public.exams(id) on delete set null,
  mode           text check (mode in ('exam', 'practice')),
  total          integer not null,
  correct        integer not null,
  score          numeric(4,1) not null,
  answers        jsonb default '{}',
  question_ids   uuid[] default '{}',
  attempt_number integer default 1,
  submitted_at   timestamptz default now(),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- 9. LESSONS — Bài học lý thuyết
-- ============================================================
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  topic        text,
  grade        text not null,
  subject_id   uuid references public.subjects(id) on delete set null,
  video_url    text,
  question_ids uuid[] not null default '{}',
  has_practice boolean not null default false,
  is_published boolean not null default false,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 10. LESSON_PROGRESS — Tiến trình học của học sinh
-- ============================================================
create table if not exists public.lesson_progress (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  lesson_id          uuid not null references public.lessons(id) on delete cascade,
  video_watched      boolean not null default false,
  quiz_passed        boolean not null default false,
  practice_submitted boolean not null default false,
  completed          boolean not null default false,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- INDEX — Tăng tốc truy vấn
-- ============================================================
create index if not exists idx_topics_grade             on public.topics(grade);
create index if not exists idx_topics_subject_id        on public.topics(subject_id);
create index if not exists idx_questions_grade          on public.questions(grade);
create index if not exists idx_questions_subject_id     on public.questions(subject_id);
create index if not exists idx_questions_topic          on public.questions(topic);
create index if not exists idx_exams_grade              on public.exams(grade);
create index if not exists idx_exams_subject_id         on public.exams(subject_id);
create index if not exists idx_exams_is_active          on public.exams(is_active);
create index if not exists idx_quiz_sessions_user_id    on public.quiz_sessions(user_id);
create index if not exists idx_quiz_sessions_exam_id    on public.quiz_sessions(exam_id);
create index if not exists idx_lessons_grade            on public.lessons(grade);
create index if not exists idx_lessons_subject_id       on public.lessons(subject_id);
create index if not exists idx_lesson_progress_user     on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson   on public.lesson_progress(lesson_id);
create index if not exists idx_teacher_subjects_teacher on public.teacher_subjects(teacher_id);
create index if not exists idx_teacher_subjects_subject on public.teacher_subjects(subject_id);

-- ============================================================
-- TRIGGER — Tự tạo profile khi user đăng ký
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, role, grade, class_name
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    nullif(new.raw_user_meta_data->>'grade', ''),
    nullif(new.raw_user_meta_data->>'class_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY — Bật bảo mật theo dòng
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.grades            enable row level security;
alter table public.subjects          enable row level security;
alter table public.teacher_subjects  enable row level security;
alter table public.topics            enable row level security;
alter table public.questions         enable row level security;
alter table public.exams             enable row level security;
alter table public.quiz_sessions     enable row level security;
alter table public.lessons           enable row level security;
alter table public.lesson_progress   enable row level security;

-- ---- Hàm helper ----
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'teacher')
  );
$$;

-- ---- Policies: profiles ----
drop policy if exists "profiles: read own"         on public.profiles;
drop policy if exists "profiles: admin read all"   on public.profiles;
drop policy if exists "profiles: teacher read"     on public.profiles;
drop policy if exists "profiles: update own"       on public.profiles;
drop policy if exists "profiles: admin update all" on public.profiles;
drop policy if exists "profiles: admin delete"     on public.profiles;

create policy "profiles: read own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin read all"
  on public.profiles for select using (public.is_admin());
create policy "profiles: teacher read"
  on public.profiles for select using (public.is_teacher());
create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin update all"
  on public.profiles for update using (public.is_admin());
create policy "profiles: admin delete"
  on public.profiles for delete using (public.is_admin());

-- ---- Policies: grades & subjects ----
create policy "grades: authenticated read"
  on public.grades for select using (auth.role() = 'authenticated');
create policy "grades: admin manage"
  on public.grades for all using (public.is_admin());

create policy "subjects: authenticated read"
  on public.subjects for select using (auth.role() = 'authenticated');
create policy "subjects: admin manage"
  on public.subjects for all using (public.is_admin());

-- ---- Policies: teacher_subjects & topics ----
create policy "teacher_subjects: authenticated read"
  on public.teacher_subjects for select using (auth.role() = 'authenticated');
create policy "teacher_subjects: admin manage"
  on public.teacher_subjects for all using (public.is_admin());

create policy "topics: authenticated read"
  on public.topics for select using (auth.role() = 'authenticated');
create policy "topics: teacher insert"
  on public.topics for insert with check (public.is_teacher());
create policy "topics: teacher update"
  on public.topics for update using (public.is_teacher());
create policy "topics: admin delete"
  on public.topics for delete using (public.is_admin());

-- ---- Policies: questions ----
create policy "questions: authenticated read"
  on public.questions for select using (auth.role() = 'authenticated');
create policy "questions: teacher insert"
  on public.questions for insert with check (public.is_teacher());
create policy "questions: teacher update"
  on public.questions for update using (public.is_teacher());
create policy "questions: teacher delete"
  on public.questions for delete using (public.is_teacher());

-- ---- Policies: exams ----
create policy "exams: student see active"
  on public.exams for select
  using (is_active = true or public.is_teacher());
create policy "exams: teacher insert"
  on public.exams for insert with check (public.is_teacher());
create policy "exams: teacher update"
  on public.exams for update using (public.is_teacher());
create policy "exams: teacher delete"
  on public.exams for delete using (public.is_teacher());

-- ---- Policies: quiz_sessions ----
create policy "quiz_sessions: read own or teacher"
  on public.quiz_sessions for select
  using (auth.uid() = user_id or public.is_teacher());
create policy "quiz_sessions: student insert own"
  on public.quiz_sessions for insert with check (auth.uid() = user_id);
create policy "quiz_sessions: admin delete"
  on public.quiz_sessions for delete using (public.is_admin());

-- ---- Policies: lessons ----
create policy "lessons: student see published"
  on public.lessons for select
  using (is_published = true or public.is_teacher());
create policy "lessons: teacher insert"
  on public.lessons for insert with check (public.is_teacher());
create policy "lessons: teacher update"
  on public.lessons for update using (public.is_teacher());
create policy "lessons: teacher delete"
  on public.lessons for delete using (public.is_teacher());

-- ---- Policies: lesson_progress ----
create policy "lesson_progress: read own or teacher"
  on public.lesson_progress for select
  using (auth.uid() = user_id or public.is_teacher());
create policy "lesson_progress: student insert own"
  on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "lesson_progress: student update own"
  on public.lesson_progress for update using (auth.uid() = user_id);
