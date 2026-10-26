import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.112.0';
import type { CardAttempt, CardStore } from './booking-card-flow.ts';

export function bookingAdmin(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export class SupabaseCardStore implements CardStore {
  constructor(readonly db: SupabaseClient) {}
  async call(name: string, args: Record<string, unknown>): Promise<CardAttempt> {
    const { data, error } = await this.db.rpc(name, args);
    // Never expose DB messages, customer information or parameters to a caller.
    if (error || !data || typeof data.id !== 'string') throw new Error('CARD_DATABASE_RETRY_REQUIRED');
    return data as CardAttempt;
  }
  async get(id: string): Promise<CardAttempt> {
    const { data, error } = await this.db.from('booking_card_attempts').select('*').eq('id', id).single();
    if (error || !data) throw new Error('ATTEMPT_NOT_FOUND');
    return data as CardAttempt;
  }
  attach(id: string, intent: string) { return this.call('attach_test_card_intent', { p_attempt_id: id, p_intent_id: intent }); }
  finalize(a: CardAttempt, captureBefore: number) {
    return this.call('finalize_test_card_booking', { p_attempt_id: a.id, p_intent_id: a.intent_id,
      p_amount_cents: a.authorized_cents, p_capture_before: new Date(captureBefore*1000).toISOString() });
  }
  prepare(id: string) { return this.call('prepare_test_card_settlement', { p_attempt_id: id }); }
  release(id: string, reason: string) { return this.call('request_test_card_release', { p_attempt_id: id, p_reason: reason }); }
  record(a: CardAttempt, result: 'captured' | 'released', received: number) {
    return this.call('record_test_card_result', { p_attempt_id: a.id, p_intent_id: a.intent_id, p_result: result, p_received: received });
  }
  async note(id: string, code: string | null, review = false): Promise<void> {
    const { error } = await this.db.rpc('note_test_card_check', { p_attempt_id: id, p_code: code, p_review: review });
    if (error) throw new Error('CARD_DATABASE_RETRY_REQUIRED');
  }
}
export async function smallJson(req: Request, max: number): Promise<Record<string, unknown>> {
  if (Number(req.headers.get('content-length') ?? 0) > max) throw new Error('BODY_TOO_LARGE');
  const reader = req.body?.getReader();
  if (!reader) throw new Error('BODY_INVALID');
  const chunks: Uint8Array[] = []; let count = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      count += value.byteLength; if (count > max) throw new Error('BODY_TOO_LARGE'); chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(count); let i = 0;
  for (const chunk of chunks) { bytes.set(chunk, i); i += chunk.byteLength; }
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('BODY_INVALID');
  return obj;
}
export function cardJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
