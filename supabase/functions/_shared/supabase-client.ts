import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } } // Recommended for server-side clients
  )
}