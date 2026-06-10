import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — auth features will be unavailable');
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? 'http://localhost',
  serviceRoleKey ?? 'missing',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: { transport: ws },
  }
);
