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

    // 1. Check if an entry has already been made today. This prevents any double clock-ins.
    const { data: todayAttendance, error: todayAttendanceError } = await supabaseAdmin
      .from('attendance')
      .select('created_at')
      .eq('user_name', user_name)
      .eq('date', date)
      .limit(1);
    if (todayAttendanceError) throw todayAttendanceError;

    if (todayAttendance.length > 0) {
      return new Response(JSON.stringify({ error: "Ya has registrado tu entrada el día de hoy." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // 2. If no entry today, check for a missed clock-out from the previous day specifically.
    // This addresses the case where the check was too broad and causing incorrect errors.
    // Explicitly treat the incoming date string as UTC to avoid timezone shifts.
    const todayUTC = new Date(`${date}T00:00:00.000Z`);
    // Use timestamp arithmetic for robustness.
    const yesterdayTimestamp = todayUTC.getTime() - 86400000; // 24 * 60 * 60 * 1000
    const yesterday = new Date(yesterdayTimestamp);
    const yesterdayString = yesterday.toISOString().slice(0, 10);

    const { data: pendingExit, error: pendingExitError } = await supabaseAdmin
      .from('exit')
      .select('created_at')
      .eq('user_name', user_name)
      .is('marked', null) // Check for null to find pending exits, as requested.
      .eq('date', yesterdayString) // Check specifically for a pending exit from yesterday, as requested.
      .limit(1);
    if (pendingExitError) throw pendingExitError;

    if (pendingExit.length > 0) {
      return new Response(JSON.stringify({ error: "Salida no marcada el dia de ayer. Por favor contactar con administrador" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // --- END VALIDATION ---

    // If no location is provided, it's a verification-only call.
    // If we passed the validation above, it means the user is clear to clock in.
    if (!location) {
      return new Response(JSON.stringify({ message: 'Verification successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // --- INSERTION LOGIC ---

    const attendancePayload = {
      user_name,
      date,
      day,
      hour,
      location,
      marked: true,
      created_at: `${date} ${hour}`,
      marked_admin: marked_admin || null,
    };

    // Step 1: Insert the clock-in record into the 'attendance' table.
    const { data: attendanceData, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .insert([attendancePayload])
      .select()
      .single();

    if (attendanceError) {
      console.error("Supabase attendance insert error:", JSON.stringify(attendanceError));
      throw attendanceError;
    }

    // Step 2: Create the corresponding pending clock-out record in the 'exit' table.
    const { error: exitError } = await supabaseAdmin
      .from('exit')
      .insert([{ user_name, date, created_at: attendanceData.created_at, marked: null }]);

    if (exitError) {
      console.error("Supabase exit insert error (rollback attempt):", JSON.stringify(exitError));
      // Attempt to rollback by deleting the attendance record to avoid an inconsistent state.
      await supabaseAdmin
        .from('attendance')
        .delete()
        .eq('created_at', attendanceData.created_at);
      throw new Error('No se pudo crear el registro de salida pendiente. El registro de entrada ha sido revertido.');
    }

    return new Response(JSON.stringify({ message: 'Attendance registered successfully', data: attendanceData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Function execution error:", JSON.stringify(error)); // Log the detailed function error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
