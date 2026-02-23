// e:\welders_industry\supabase\functions\delete-user-admin\index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Helper for role hierarchy
  const getRoleLevel = (role: string) => {
    if (role === 'Desarrollador') return 4;
    if (role === 'Administrador maestro') return 3;
    if (role === 'Administrador') return 2;
    return 1; // Operario
  }

  try {
    // 1. Create Supabase admin client to perform privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verify the identity and role of the user making the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No se proporcionó token de autorización')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requester) throw new Error('Solicitante no autenticado')

    // Get requester's role from the public.users table
    const { data: requesterData, error: reqDataError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', requester.id)
        .single()
    
    if (reqDataError) throw new Error('Error obteniendo rol del solicitante')

    const requesterRole = requesterData?.role || 'Operario';

    // 3. Get the ID of the user to be deleted from the request body
    const { target_id } = await req.json()
    if (!target_id) {
      throw new Error('El ID del usuario a eliminar es requerido')
    }

    // Prevent a user from deleting themselves
    if (requester.id === target_id) {
        throw new Error('No puedes eliminar tu propio usuario desde esta interfaz.')
    }

    // 4. Check hierarchy: requester must have a higher role than the target
    const { data: targetData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', target_id)
        .single()

    if (!targetData) {
        console.warn(`Usuario con id ${target_id} no encontrado en la tabla 'users'. No se puede verificar la jerarquía.`);
    } else {
        const requesterLevel = getRoleLevel(requesterRole);
        const targetLevel = getRoleLevel(targetData.role);

        if (requesterLevel <= targetLevel) {
            throw new Error('No tienes permisos para eliminar a un usuario de rango igual o superior.')
        }
    }

    // 5. Delete from public.users FIRST to avoid FK constraint issues if CASCADE is missing
    const { error: deletePublicError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', target_id)
    
    if (deletePublicError) {
        console.error("Error eliminando de public.users:", deletePublicError)
        throw new Error(`Error al eliminar datos del usuario: ${deletePublicError.message}`)
    }

    // 6. Delete the user using the admin client.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_id)

    if (deleteError) {
        throw deleteError
    }

    return new Response(
      JSON.stringify({ message: 'Usuario eliminado exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Error en delete-user-admin:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})