import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. Manejo explícito de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta cabecera de autorización')

    const { user_name, product, amount, unit, car_registration, plate_photo_url, invoice_photo_url } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Guardar en tabla product_entry
    // Convertimos amount a número para asegurar consistencia en la BD
    const amountNum = Number(amount);

    const { error: insertError } = await supabaseAdmin
        .from('product_entry')
        .insert([{
            user_name,
            product,
            amount_entry: amountNum,
            measurement_unit: unit,
            car_registration,
            plate_photo_url,
            invoice_photo_url
        }])

    if (insertError) throw insertError

    // 3. Actualizar Inventario (SUMAR)
    const { data: inventoryItem, error: fetchError } = await supabaseAdmin
        .from('inventory')
        .select('id, product_amount')
        .eq('product', product)
        .single()

    if (fetchError) {
        // Si no existe, podrías optar por crearlo o lanzar error. Aquí lanzamos error.
        throw new Error("Producto no encontrado en inventario para actualizar")
    }

    // Operación numérica
    const currentVal = Number(inventoryItem.product_amount);
    const newVal = currentVal + amountNum;

    const { error: updateError } = await supabaseAdmin
        .from('inventory')
        .update({ product_amount: newVal })
        .eq('id', inventoryItem.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ message: 'Entrada registrada correctamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
