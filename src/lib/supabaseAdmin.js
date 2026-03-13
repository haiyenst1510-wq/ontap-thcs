import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

// Dùng service role key để tạo/xóa auth users (chỉ dùng nội bộ - giáo viên)
// Thêm VITE_SUPABASE_SERVICE_KEY vào file .env
export const supabaseAdmin = serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null
