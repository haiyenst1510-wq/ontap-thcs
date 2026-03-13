-- ============================================================
-- MIGRATION: Thêm bảng classes + cột class_name vào profiles
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Thêm cột class_name và username vào profiles
alter table profiles add column if not exists class_name text;
alter table profiles add column if not exists username text;

-- 2. Tạo bảng classes
create table if not exists classes (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  grade text not null check (grade in ('3', '4', '5')),
  created_at timestamptz default now()
);

-- 3. RLS cho bảng classes
alter table classes enable row level security;

create policy "classes: authenticated read" on classes
  for select to authenticated using (true);

create policy "classes: teacher insert" on classes
  for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));

create policy "classes: teacher update" on classes
  for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));

create policy "classes: teacher delete" on classes
  for delete to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'teacher'));

-- 4. Cho phép giáo viên đọc tất cả profiles (hiện tại chỉ đọc của chính mình)
drop policy if exists "profiles: own read" on profiles;

create policy "profiles: read" on profiles
  for select to authenticated
  using (
    auth.uid() = id
    OR exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

-- 5. Cập nhật trigger handle_new_user để thêm class_name + username
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role, grade, class_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Người dùng'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'grade',
    new.raw_user_meta_data->>'class_name',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Sau khi chạy xong, thêm vào file .env:
-- VITE_SUPABASE_SERVICE_KEY=your_service_role_key
-- (lấy từ Supabase Dashboard > Settings > API > service_role)
-- ============================================================
