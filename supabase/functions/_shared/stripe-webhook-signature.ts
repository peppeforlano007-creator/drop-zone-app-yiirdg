// Verifies a Stripe webhook signature (v1 HMAC-SHA256 over "<t>.<raw body>").
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function verifyStripeSignature(raw: string, header: string | null, secret: string, nowSeconds: number, toleranceSeconds = 300): Promise<boolean> {
  if (!header || !/^whsec_\S{10,200}$/.test(secret) || header.length > 1000) return false;
  let t = ''; const sigs: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') t = v ?? ''; else if (k === 'v1' && v) sigs.push(v);
  }
  if (!/^\d{1,12}$/.test(t) || sigs.length === 0 || Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  return sigs.some((s) => equal(s, expected));
}
