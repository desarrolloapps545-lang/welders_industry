import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers de CORS para permitir la comunicación desde el navegador
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS', // Permitir POST y DELETE
}

serve(async (req) => {
  // Manejar la solicitud pre-vuelo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear un cliente de Supabase con permisos de administrador (service_role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // --- LÓGICA DE CREACIÓN DE USUARIO (Método POST) ---
    if (req.method === 'POST') {
      const { name, email, password, role } = await req.json()

      // 1. Crear el usuario en el sistema de autenticación de Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Marcar el correo como verificado automáticamente
      })

      if (authError) throw authError
      if (!user) throw new Error('La creación del usuario en el autenticador falló.')

      // 2. Determinar si el rol es de administrador
      const rolesAdmin = ['Administrador Maestro', 'Administrador', 'Desarrollador'];
      const isAdmin = rolesAdmin.includes(role);

      // 3. Insertar el perfil del usuario en la tabla 'users'
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,       // El UID del usuario recién creado
          name: name,
          email: email,
          role: role,
          is_admin: isAdmin,
          // La columna 'created_at' se llenará automáticamente si tiene un valor por defecto (DEFAULT now())
        })

      if (insertError) {
        // Si la inserción del perfil falla, borramos el usuario del autenticador para no dejar registros huérfanos
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        throw insertError
      }

      return new Response(JSON.stringify({ message: 'Usuario creado exitosamente', user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- LÓGICA DE ELIMINACIÓN DE USUARIO (Método DELETE) ---
    else if (req.method === 'DELETE') {
      const { user_id } = await req.json()
      if (!user_id) throw new Error('El ID del usuario es requerido para la eliminación.')

      // Esta función elimina al usuario del autenticador.
      // Si la columna 'id' de tu tabla 'users' tiene una clave foránea a 'auth.users'
      // con "ON DELETE CASCADE", el perfil se borrará automáticamente.
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ message: 'Usuario eliminado exitosamente' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- Manejar otros métodos HTTP ---
    else {
      return new Response('Método no permitido', { status: 405 })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})