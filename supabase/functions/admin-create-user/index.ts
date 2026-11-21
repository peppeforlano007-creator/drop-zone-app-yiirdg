/* eslint-disable import/no-unresolved */
// Creates an account from Admin → Utenti → Crea Nuovo Utente.
// Body (same as the published clients send): { email, password, full_name, phone?, role, pickup_point_id?, admin_permissions? }
// Always answers 200 with { success, user?, error? } for expected failures, so every client
// version shows the real reason instead of "non-2xx status code".
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLES = ['consumer', 'supplier', 'pickup_point', 'admin'] as const;
type Role = (typeof ROLES)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const fail = (error: string) => json({ success: false, error });

// Italian mobile numbers as stored in auth (digits, with 39 prefix): 3201234567 → 393201234567
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('3')) digits = `39${digits}`;
  return digits;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already') && m.includes('email')) return 'Esiste già un account con questa email.';
  if (m.includes('already') && m.includes('phone')) return 'Esiste già un account con questo numero di telefono.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Esiste già un account con questi dati.';
  if (m.includes('password')) return `Password non valida: ${message}`;
  if (m.includes('email')) return `Email non valida: ${message}`;
  return message;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Caller must be an admin.
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !caller) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, admin_permissions')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return json({ success: false, error: 'Solo un amministratore può creare utenti.' }, 403);
    }
    const callerIsFullAdmin = callerProfile.admin_permissions == null;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return fail('Richiesta non valida.');
    }

    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const fullName = String(body?.full_name ?? body?.fullName ?? '').trim();
    const role = String(body?.role ?? 'consumer') as Role;
    const phone = normalizePhone(body?.phone);
    const pickupPointId: string | null = role === 'consumer' ? (body?.pickup_point_id ?? null) : null;
    const rawPermissions = body?.admin_permissions;
    const adminPermissions: string[] | null =
      role === 'admin' && Array.isArray(rawPermissions) && rawPermissions.length > 0
        ? rawPermissions.map((s: unknown) => String(s))
        : null;

    if (!email || !email.includes('@')) return fail('Inserisci un indirizzo email valido.');
    if (password.length < 6) return fail('La password deve essere di almeno 6 caratteri.');
    if (!fullName) return fail('Inserisci il nome completo.');
    if (!ROLES.includes(role)) return fail('Ruolo non valido.');
    if (role === 'admin' && !callerIsFullAdmin) return fail('Solo un admin completo può creare altri amministratori.');
    if (role === 'consumer' && !pickupPointId) return fail('Seleziona un punto di ritiro per il consumatore.');

    // Clear messages for duplicates before touching auth.
    const { data: sameEmail } = await admin.from('profiles').select('user_id').ilike('email', email).limit(1);
    if (sameEmail && sameEmail.length > 0) return fail('Esiste già un account con questa email.');

    // Consumers sign in with their phone, so it goes on the auth account; other roles sign in by email
    // and keep the phone only on the profile (their number may already belong to a customer account).
    const authPhone = role === 'consumer' ? phone : null;
    if (authPhone) {
      const { data: samePhone } = await admin
        .from('profiles')
        .select('user_id')
        .in('phone', [authPhone, `+${authPhone}`, authPhone.replace(/^39/, '')])
        .limit(1);
      if (samePhone && samePhone.length > 0) return fail('Esiste già un account con questo numero di telefono.');
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...(authPhone ? { phone: authPhone, phone_confirm: true } : {}),
      user_metadata: {
        full_name: fullName,
        phone,
        role,
        ...(pickupPointId ? { pickup_point_id: pickupPointId } : {}),
      },
      app_metadata: { role, pickup_point_id: pickupPointId },
    });

    if (createError || !created?.user) {
      console.error('[admin-create-user] createUser failed:', createError);
      return fail(translateAuthError(createError?.message ?? "Impossibile creare l'account."));
    }

    const newId = created.user.id;

    // The auth trigger normally creates the profile; make sure it exists with the right data.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          user_id: newId,
          email,
          full_name: fullName,
          phone,
          role,
          pickup_point_id: pickupPointId,
          admin_permissions: adminPermissions,
        },
        { onConflict: 'user_id' },
      )
      .select('user_id, email, full_name, phone, role, pickup_point_id, admin_permissions')
      .single();

    if (profileError || !profile || profile.role !== role) {
      console.error('[admin-create-user] profile save failed:', profileError, profile);
      await admin.auth.admin.deleteUser(newId);
      return fail(`Impossibile salvare il profilo: ${profileError?.message ?? 'ruolo non applicato'}`);
    }

    return json({
      success: true,
      user: { id: newId, user_id: newId, ...profile },
    });
  } catch (e) {
    console.error('[admin-create-user] exception:', e);
    return fail(e instanceof Error ? e.message : 'Errore imprevisto.');
  }
});
