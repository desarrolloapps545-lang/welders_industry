// e:\Welder_industry\supabase\functions\edit-delete-registers-imgs\index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!serviceRoleKey) throw new Error('Error de configuración: SERVICE_ROLE_KEY no definida en secretos.');

    // Cliente Admin para operaciones privilegiadas (Storage y DB)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    const { action, id, table, ...payload } = await req.json()

    console.log(`Procesando acción: ${action} para tabla: ${table}, ID: ${id}`);

    if (!id || !table) throw new Error('Faltan parámetros id o table')

    // Helper para obtener el bucket según la tabla
    const getBucketFromTable = (tbl: string) => tbl === 'product_entry' ? 'entries' : 'exits';
    const bucket = getBucketFromTable(table);

    // Helper para extraer los paths de archivos desde una cadena de URLs (separadas por coma)
    const getPathsFromUrlString = (urlString: string | null) => {
        if (!urlString) return [];
        // Dividir por coma y limpiar espacios
        const urls = urlString.split(',').map(u => u.trim()).filter(u => u.length > 0);
        
        return urls.map(url => {
            try {
                const urlObj = new URL(url);
                // Estructura típica: .../storage/v1/object/public/bucket/folder/file
                const pathParts = urlObj.pathname.split('/');
                const publicIndex = pathParts.indexOf('public');
                if (publicIndex === -1) return null;
                // El path es todo lo que sigue al nombre del bucket
                return pathParts.slice(publicIndex + 2).join('/');
            } catch (e) {
                console.warn("URL inválida o no parseable:", url);
                return null;
            }
        }).filter(p => p !== null) as string[];
    }

    if (action === 'delete') {
        const { plate_url, invoice_url } = payload;
        
        // 0. Actualizar Inventario antes de borrar
        // Recuperamos el registro para saber qué producto y cantidad ajustar
        const { data: recordToDelete, error: fetchError } = await supabaseAdmin
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error(`No se pudo recuperar el registro para ajustar el inventario: ${fetchError.message}`);
        }

        const product = recordToDelete.product;
        let adjustment = 0;

        if (table === 'product_entry') {
            // Borrar entrada => Restar del inventario
            adjustment = -Number(recordToDelete.amount_entry);
        } else if (table === 'product_out') {
            // Borrar salida => Sumar al inventario (devolver stock)
            adjustment = Number(recordToDelete.amount_out);
        }

        if (adjustment !== 0) {
            const { data: invItem } = await supabaseAdmin
                .from('inventory')
                .select('id, product_amount')
                .eq('product', product)
                .single();
            
            if (invItem) {
                await supabaseAdmin.from('inventory').update({ product_amount: Number(invItem.product_amount) + adjustment }).eq('id', invItem.id);
            }
        }

        // 1. Eliminar imágenes del bucket
        const pathsToDelete: string[] = [];
        pathsToDelete.push(...getPathsFromUrlString(plate_url));
        pathsToDelete.push(...getPathsFromUrlString(invoice_url));

        if (pathsToDelete.length > 0) {
            console.log("Eliminando imágenes:", pathsToDelete);
            const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(pathsToDelete);
            if (storageError) console.error("Error borrando imágenes:", storageError);
        }

        // 2. Eliminar registro de la tabla
        const { error: dbError } = await supabaseAdmin.from(table).delete().eq('id', id);
        if (dbError) throw dbError;

        return new Response(JSON.stringify({ message: 'Registro e imágenes eliminados correctamente' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    } 
    
    if (action === 'update') {
        const { updates, old_plate_url, old_invoice_url } = payload;
        
        // 1. Verificar si las imágenes cambiaron para borrar las viejas
        const pathsToDelete: string[] = [];
        
        // Lógica para Placas:
        // Si hay URLs viejas, verificamos cuáles de ellas NO están en la nueva lista de URLs.
        // Esto maneja tanto el reemplazo total como la eliminación parcial.
        if (old_plate_url) {
            const oldUrls = old_plate_url.split(',').map(u => u.trim());
            const newUrls = (updates.plate_photo_url || '').split(',').map(u => u.trim());
            
            // Identificar URLs viejas que ya no existen en la nueva actualización
            const urlsToRemove = oldUrls.filter(oldU => !newUrls.includes(oldU));
            pathsToDelete.push(...getPathsFromUrlString(urlsToRemove.join(',')));
        }
        
        // Lógica para Facturas:
        if (old_invoice_url) {
            const oldUrls = old_invoice_url.split(',').map(u => u.trim());
            const newUrls = (updates.invoice_photo_url || '').split(',').map(u => u.trim());
            
            const urlsToRemove = oldUrls.filter(oldU => !newUrls.includes(oldU));
            pathsToDelete.push(...getPathsFromUrlString(urlsToRemove.join(',')));
        }

        if (pathsToDelete.length > 0) {
            console.log("Eliminando imágenes antiguas:", pathsToDelete);
            const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(pathsToDelete);
            if (storageError) console.error("Error borrando imágenes antiguas:", storageError);
        }

        // 2. Actualizar registro en la tabla
        const { error: dbError } = await supabaseAdmin.from(table).update(updates).eq('id', id);
        if (dbError) throw dbError;

        return new Response(JSON.stringify({ message: 'Registro actualizado correctamente' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    throw new Error('Acción no válida')

  } catch (error) {
    console.error("Error en Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
