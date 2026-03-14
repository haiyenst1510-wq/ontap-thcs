-- ============================================================
-- THCS Learning Platform - Supabase Schema
-- Grades: 6, 7, 8, 9
-- Roles: admin / teacher / student
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  grade       text check (grade in ('6', '7', '8', '9')),
  avatar_url  text,
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
-- 6. LESSONS TABLE
-- ============================================================
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  topic        text,
  grade        text not null check (grade in ('6', '7', '8', '9')),
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  video_url    text,
  questions    jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 7. QUESTIONS TABLE
-- ============================================================
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  content        text not null,
  type           text not null check (type in (
                   'multiple_choice', 'true_false', 'fill_blank',
                   'drag_word', 'matching', 'ordering'
                 )),
  options        jsonb,
  correct_answer text,
  explanation    text,
  topic          text,
  grade          text not null check (grade in ('6', '7', '8', '9')),
  subject_id     uuid not null references public.subjects(id) on delete cascade,
  difficulty     text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- 8. EXAMS TABLE
-- ============================================================
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  grade        text not null check (grade in ('6', '7', '8', '9')),
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  topic        text,
  questions    jsonb not null default '[]'::jsonb,
  duration     integer not null default 30,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 9. QUIZ_SESSIONS TABLE
-- ============================================================
create table if not exists public.quiz_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  exam_id    uuid not null references public.exams(id) on delete cascade,
  score      numeric,
  total      integer,
  answers    jsonb,
  mode       text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. LESSON_PROGRESS TABLE
-- ============================================================
create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  video_watched   boolean not null default false,
  quiz_completed  boolean not null default false,
  score           numeric,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_topics_grade        on public.topics(grade);
create index if not exists idx_topics_subject_id   on public.topics(subject_id);
create index if not exists idx_lessons_grade       on public.lessons(grade);
create index if not exists idx_lessons_subject_id  on public.lessons(subject_id);
create index if not exists idx_questions_grade     on public.questions(grade);
create index if not exists idx_questions_subject   on public.questions(subject_id);
create index if not exists idx_exams_grade         on public.exams(grade);
create index if not exists idx_exams_subject_id    on public.exams(subject_id);
create index if not exists idx_quiz_sessions_user  on public.quiz_sessions(user_id);
create index if not exists idx_quiz_sessions_exam  on public.quiz_sessions(exam_id);
create index if not exists idx_lesson_progress_user    on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson  on public.lesson_progress(lesson_id);
create index if not exists idx_teacher_subjects_teacher on public.teacher_subjects(teacher_id);
create index if not exists idx_teacher_subjects_subject on public.teacher_subjects(subject_id);

-- ============================================================
-- TRIGGER: auto-create profile on new auth user
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, grade)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    nullif(new.raw_user_meta_data->>'grade', '')
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
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles       enable row level security;
alter table public.grades         enable row level security;
alter table public.subjects       enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.topics         enable row level security;
alter table public.lessons        enable row level security;
alter table public.questions      enable row level security;
alter table public.exams          enable row level security;
alter table public.quiz_sessions  enable row level security;
alter table public.lesson_progress enable row level security;

-- ---- Helper: is current user admin? ----
create or replace function public.is_admin()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- Helper: is current user teacher? ----
create or replace function public.is_teacher()
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'teacher')
  );
$$;

-- =====================
-- profiles policies
-- =====================
create policy "profiles: users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admin can read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin can update all profiles"
  on public.profiles for update
  using (public.is_admin());

create policy "profiles: admin can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- =====================
-- grades policies
-- =====================
create policy "grades: anyone authenticated can read"
  on public.grades for select
  using (auth.role() = 'authenticated');

create policy "grades: admin can manage"
  on public.grades for all
  using (public.is_admin());

-- =====================
-- subjects policies
-- =====================
create policy "subjects: anyone authenticated can read"
  on public.subjects for select
  using (auth.role() = 'authenticated');

create policy "subjects: admin can manage"
  on public.subjects for all
  using (public.is_admin());

-- =====================
-- teacher_subjects policies
-- =====================
create policy "teacher_subjects: authenticated can read"
  on public.teacher_subjects for select
  using (auth.role() = 'authenticated');

create policy "teacher_subjects: admin can manage"
  on public.teacher_subjects for all
  using (public.is_admin());

-- =====================
-- topics policies
-- =====================
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

-- =====================
-- lessons policies
-- =====================
create policy "lessons: students see published"
  on public.lessons for select
  using (
    is_published = true
    or public.is_teacher()
  );

create policy "lessons: teacher or admin can insert"
  on public.lessons for insert
  with check (public.is_teacher());

create policy "lessons: teacher or admin can update"
  on public.lessons for update
  using (public.is_teacher());

create policy "lessons: admin can delete"
  on public.lessons for delete
  using (public.is_admin());

-- =====================
-- questions policies
-- =====================
create policy "questions: teacher or admin can read all"
  on public.questions for select
  using (public.is_teacher());

create policy "questions: students can read"
  on public.questions for select
  using (auth.role() = 'authenticated');

create policy "questions: teacher or admin can insert"
  on public.questions for insert
  with check (public.is_teacher());

create policy "questions: teacher or admin can update"
  on public.questions for update
  using (public.is_teacher());

create policy "questions: admin can delete"
  on public.questions for delete
  using (public.is_admin());

-- =====================
-- exams policies
-- =====================
create policy "exams: students see published"
  on public.exams for select
  using (
    is_published = true
    or public.is_teacher()
  );

create policy "exams: teacher or admin can insert"
  on public.exams for insert
  with check (public.is_teacher());

create policy "exams: teacher or admin can update"
  on public.exams for update
  using (public.is_teacher());

create policy "exams: admin can delete"
  on public.exams for delete
  using (public.is_admin());

-- =====================
-- quiz_sessions policies
-- =====================
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

-- =====================
-- lesson_progress policies
-- =====================
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
