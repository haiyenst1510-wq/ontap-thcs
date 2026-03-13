-- Chạy script này trong Supabase SQL Editor
-- Tạo tài khoản giáo viên đầu tiên

select create_user(
  '{"email": "giaovien@school.com", "password": "123456", "email_confirm": true,
    "user_metadata": {"full_name": "Giáo Viên", "role": "teacher"}}'::jsonb
);
