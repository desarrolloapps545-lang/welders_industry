// E:\Welder_industry\supabase\functions\create-user-admin\index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS para las peticiones desde el navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Helper para niveles
  const getRoleLevel = (role: string) => {
    if (role === 'Desarrollador') return 4;
    if (role === 'Administrador maestro') return 3;
    if (role === 'Administrador') return 2;
    return 1; // Operario
  }

  try {
    // Crear cliente de Supabase con permisos de Super Admin (Service Role)
    // Esto es necesario para crear usuarios sin cerrar la sesión actual
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar quién hace la petición (Auth Header)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: requester } } = await supabaseClient.auth.getUser()
    if (!requester) throw new Error('Usuario no autenticado')

    // Obtener rol del solicitante
    const { data: requesterData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', requester.id)
        .single()
    
    const requesterRole = requesterData?.role || 'Operario';

    const { email, password, name, role } = await req.json()

    // Validar Jerarquía
    if (getRoleLevel(requesterRole) <= getRoleLevel(role)) {
        throw new Error(`No tienes permisos para crear un usuario con rol: ${role}`)
    }


    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmar automáticamente
      user_metadata: { name: name }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 2. Insertar datos en la tabla pública 'users'
    // Asumimos que has agregado las columnas 'name' y 'email' a tu tabla users
    const { error: dbError } = await supabaseAdmin
        .from('users')
        .upsert([
          { 
            id: userId, 
            role: role, 
            is_admin: ['Administrador', 'Administrador maestro', 'Desarrollador'].includes(role),
            name: name,
            email: email
          }
        ])

    if (dbError) {
        // Si falla la DB, borramos el usuario de Auth para no dejar basura
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw dbError
    }

    return new Response(
      JSON.stringify({ message: 'Usuario creado exitosamente', user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
