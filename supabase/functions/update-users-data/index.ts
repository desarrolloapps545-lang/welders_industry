import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejo de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Verificar Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error('No se proporcionó token de autorización')
    }

    // 3. Parsear Body
    const { target_id, name, email, role } = await req.json()
    if (!target_id) {
        throw new Error('ID de usuario objetivo requerido')
    }

    // 4. Clientes Supabase
    // Cliente usuario (para verificar quién llama)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // Cliente Admin (para ejecutar cambios)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '' // Asegúrate de haber configurado este secreto
    )

    // 5. Verificar usuario solicitante
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requester) throw new Error('Usuario no autenticado')

    // 6. Obtener roles y niveles
    const getRoleLevel = (r: string) => {
        if (r === 'Desarrollador') return 4;
        if (r === 'Administrador maestro') return 3;
        if (r === 'Administrador') return 2;
        return 1;
    }

    // Rol del solicitante
    const { data: requesterData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', requester.id)
        .single()
    
    const requesterRole = requesterData?.role || 'Operario'
    const requesterLevel = getRoleLevel(requesterRole)

    // Rol del objetivo
    const { data: targetData } = await supabaseAdmin
        .from('users')
        .select('role, email')
        .eq('id', target_id)
        .single()
    
    if (!targetData) throw new Error('Usuario objetivo no encontrado')
    const targetLevel = getRoleLevel(targetData.role)

    // 7. Validaciones de Jerarquía
    // No puedo editar a alguien de mi mismo nivel o superior
    if (requesterLevel <= targetLevel) {
        throw new Error('No tienes permisos para editar a este usuario (Jerarquía insuficiente)')
    }

    // Si intento asignar un rol, no puede ser igual o superior al mío
    if (role && getRoleLevel(role) >= requesterLevel) {
        throw new Error(`No tienes permisos para asignar el rol: ${role}`)
    }

    // 8. Actualizar Auth (si cambió el correo o el nombre)
    const authUpdates: any = {}
    if (email && email !== targetData.email) {
        authUpdates.email = email
        authUpdates.email_confirm = true
    }
    if (name) {
        authUpdates.user_metadata = { name: name }
    }

    if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            target_id, 
            authUpdates
        )
        if (authUpdateError) throw authUpdateError
    }

    // 9. Actualizar Tabla Users
    const updates: any = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (role) {
        updates.role = role
        updates.is_admin = ['Administrador', 'Administrador maestro', 'Desarrollador'].includes(role)
    }

    const { error: dbError } = await supabaseAdmin.from('users').update(updates).eq('id', target_id)
    if (dbError) throw dbError

    return new Response(JSON.stringify({ message: 'Usuario actualizado correctamente' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})