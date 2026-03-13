-- ============================================
-- SCHEMA: Ứng dụng Ôn Tập Tin Học Tiểu Học
-- ============================================

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('teacher', 'student')),
  grade text check (grade in ('3', '4', '5')), -- only for students
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role, grade)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Người dùng'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'grade'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. Questions
create table questions (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  type text not null check (type in ('multiple_choice', 'true_false', 'fill_blank')),
  options jsonb default '[]',       -- [{key: "A", text: "..."}, ...]
  correct_answer text not null,
  image_url text,
  grade text not null check (grade in ('3', '4', '5')),
  topic text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- 3. Quiz sessions (lịch sử làm bài)
create table quiz_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  mode text not null check (mode in ('practice', 'exam')),
  total integer not null,
  correct integer not null,
  score numeric(4,1) not null,
  answers jsonb default '{}',         -- {question_index: answer}
  question_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table profiles enable row level security;
alter table questions enable row level security;
alter table quiz_sessions enable row level security;

-- Profiles: users can read/update their own
create policy "profiles: own read" on profiles for select using (auth.uid() = id);
create policy "profiles: own update" on profiles for update using (auth.uid() = id);

-- Questions: teachers can insert/update/delete; all authenticated can read
create policy "questions: authenticated read" on questions for select to authenticated using (true);
create policy "questions: teacher insert" on questions for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));
create policy "questions: teacher update" on questions for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));
create policy "questions: teacher delete" on questions for delete to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));

-- Quiz sessions: users can read/insert their own
create policy "sessions: own read" on quiz_sessions for select using (auth.uid() = user_id);
create policy "sessions: own insert" on quiz_sessions for insert with check (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
create index on questions (grade, topic, difficulty);
create index on quiz_sessions (user_id, created_at desc);
