// E:\Welder_industry\supabase\functions\update-user-password-admin\index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS
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
    // 1. Verificar el usuario que hace la petición (debe estar autenticado)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No se proporcionó token de autorización')
    }

    // Cliente para verificar el usuario actual
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuario no autenticado o token inválido')
    }

    // 2. Obtener la nueva contraseña del cuerpo de la petición
    const { password, target_id } = await req.json()
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres')
    }

    // 3. Usar el cliente Admin para actualizar la contraseña (garantiza permisos)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    let userIdToUpdate = user.id;

    // Si se envía un target_id, verificamos permisos para actualizar a OTRO usuario
    if (target_id && target_id !== user.id) {
        // Obtener roles
        const { data: requesterData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
        const { data: targetData } = await supabaseAdmin.from('users').select('role').eq('id', target_id).single();

        const requesterLevel = getRoleLevel(requesterData?.role || 'Operario');
        const targetLevel = getRoleLevel(targetData?.role || 'Operario');

        if (requesterLevel <= targetLevel) {
            throw new Error('No tienes permisos para cambiar la contraseña de este usuario');
        }
        
        userIdToUpdate = target_id;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userIdToUpdate,
      { password: password }
    )

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: 'Contraseña actualizada exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
