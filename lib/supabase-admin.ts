import 'server-only' // impede import acidental no browser
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← nunca vai pro browser
  { auth: { autoRefreshToken: false, persistSession: false } }
)