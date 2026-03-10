import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS', // Permitir el método PUT para actualizar
}

serve(async (req) => {
  // 1. Manejo de CORS (Preflight) - Vital para evitar el error que ves
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Cliente Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Obtener datos
    const { id, name, email, role } = await req.json()

    if (!id) throw new Error('El ID del usuario es obligatorio.')

    // Actualizar Auth (Correo)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: email
    })
    if (authError) throw authError

    // Determinar is_admin
    const rolesAdmin = ['Administrador Maestro', 'Administrador', 'Desarrollador'];
    const isAdmin = rolesAdmin.includes(role);

    // Actualizar Tabla users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        name: name,
        email: email,
        role: role,
        is_admin: isAdmin
      })
      .eq('id', id)

    if (dbError) throw dbError

    return new Response(JSON.stringify({ message: 'Usuario actualizado exitosamente' }), {
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