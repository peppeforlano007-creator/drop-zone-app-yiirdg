import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';

// Only a short-lived, single-use job issued by the trusted SQL management plane
// can authorize this operation. Public callers cannot choose email or point.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let token: unknown;
  try { ({ token } = await req.json()); } catch { return new Response(null, { status: 400 }); }
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return new Response(null, { status: 403 });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: jobs, error: claimError } = await admin.rpc('claim_pickup_access_activation', { p_token_hash: hash });
  if (claimError || !jobs?.length) return new Response(null, { status: 403 });
  const job = jobs[0];
  let invitedUserId: string | null = null;
  try {
    const { data: point, error: pointError } = await admin.from('pickup_points')
      .select('id, name, email, status').eq('id', job.pickup_point_id).single();
    if (pointError || !point || point.status !== 'active' || point.email?.trim().toLowerCase() !== job.email.toLowerCase()) {
      throw new Error('Pickup point/email mismatch or inactive pickup point');
    }
    const { data: operators, error: operatorError } = await admin.from('profiles').select('user_id')
      .eq('pickup_point_id', point.id).eq('role', 'pickup_point');
    if (operatorError || operators?.length) throw new Error('Existing operator or failed operator check; review required');
    const { data: existing, error: existingError } = await admin.from('profiles').select('user_id').ilike('email', job.email);
    if (existingError || existing?.length) throw new Error('Existing email profile or failed email check; no existing account modified');
    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(job.email, {
      data: { full_name: point.name, role: 'pickup_point', pickup_point_id: point.id },
    });
    if (inviteError || !invitation.user) throw new Error(inviteError?.message || 'Invitation failed');
    invitedUserId = invitation.user.id;
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('role, pickup_point_id').eq('user_id', invitedUserId).single();
    if (profileError || profile?.role !== 'pickup_point' || profile?.pickup_point_id !== point.id) {
      throw new Error('Invitation accepted but profile link requires review');
    }
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(invitedUserId);
    if (accountError || account.user?.app_metadata?.role !== 'pickup_point' || account.user?.app_metadata?.pickup_point_id !== point.id) {
      throw new Error('Invitation accepted but role claims require review');
    }
    const { error: finishError } = await admin.from('pickup_access_activation_jobs').update({
      status: 'succeeded', finished_at: new Date().toISOString(),
      result: { user_id: invitedUserId, invitation_accepted: true, profile_link_verified: true },
    }).eq('id', job.id);
    if (finishError) throw new Error('Account created; activation job status requires review');
    return Response.json({ success: true });
  } catch (error) {
    // No automatic retries, credential logs, or deletion of partially created users.
    await admin.from('pickup_access_activation_jobs').update({
      status: 'failed', finished_at: new Date().toISOString(),
      result: { message: error instanceof Error ? error.message : 'Activation failed', user_id: invitedUserId },
    }).eq('id', job.id);
    return Response.json({ success: false }, { status: 409 });
  }
});
