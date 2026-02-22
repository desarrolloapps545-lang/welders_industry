// E:\Welder_industry\supabase\functions\update-admin-data\index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { name, email } = await req.json()

    // Cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Actualizar Auth (si cambió el correo o el nombre)
    const authAttributes: any = {}
    if (email && email !== user.email) {
        authAttributes.email = email
        authAttributes.email_confirm = true
    }
    if (name) {
        authAttributes.user_metadata = { name: name }
    }

    if (Object.keys(authAttributes).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, authAttributes)
        if (authError) throw authError
    }

    // 2. Actualizar Tabla Users
    const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({ name: name, email: email })
        .eq('id', user.id)
    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ message: 'Datos actualizados correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
