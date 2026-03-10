import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-client.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { user_name, date, day, hour, location, marked_admin } = await req.json();

    // --- SERVER-SIDE VALIDATION ---

    // 1. Primary Check: Is there a pending clock-out for this user?
    // This is the only condition that allows clocking out.
    const { data: pendingExit, error: findError } = await supabaseAdmin
      .from('exit')
      .select('created_at')
      .eq('user_name', user_name)
      .eq('date', date) // Check for a pending exit for TODAY.
      .is('marked', null) // Check for null to find pending exits.
      .limit(1);
    if (findError) throw findError;

    if (pendingExit.length === 0) {
      // If no pending record exists, it means the user never clocked in.
      return new Response(JSON.stringify({ error: "Entrada no marcada el dia de hoy por favor marcar entrada" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // 2. Safeguard Check: Has the user already clocked out today?
    // This prevents double clock-outs if data becomes inconsistent.
    const { data: todayExit, error: todayExitError } = await supabaseAdmin
      .from('exit')
      .select('created_at')
      .eq('user_name', user_name)
      .eq('date', date)
      .eq('marked', true)
      .limit(1);
    if (todayExitError) throw todayExitError;

    if (todayExit.length > 0) {
      return new Response(JSON.stringify({ error: "Ya has registrado tu salida el día de hoy." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // --- END VALIDATION ---

    // If no location is provided, it's a verification-only call.
    // If we passed validation, it means there is a pending exit to be marked.
    if (!location) {
      return new Response(JSON.stringify({ message: 'Verification successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // --- UPDATE LOGIC ---

    const updatePayload = {
      marked: true,
      date,
      day,
      hour,
      location,
      created_at: `${date} ${hour}`, // As requested, update the timestamp
      marked_admin: marked_admin || null,
    };

    // Update the pending exit record with the clock-out details.
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('exit')
      .update(updatePayload)
      .eq('user_name', user_name)
      .eq('date', date) // Ensure we update the pending record for TODAY.
      .is('marked', null) // Target the specific pending record by checking for null.
      .select()

    if (updateError) {
      throw updateError
    }

    return new Response(JSON.stringify({ message: 'Exit registered successfully', data: updatedData }), {
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
