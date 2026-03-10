import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS', // Permitir PUT para la actualización
}

serve(async (req) => {
  // Manejar la solicitud pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con permisos de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, password } = await req.json()

    if (!user_id || !password) {
      throw new Error('El ID del usuario y la nueva contraseña son obligatorios.')
    }

    // Actualizar la contraseña del usuario usando la API de administrador
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: password,
    })

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Contraseña actualizada exitosamente' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})