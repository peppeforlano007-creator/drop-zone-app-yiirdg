/** Read-only sandbox connectivity check. No customer, payment or booking writes.
 * Never return/log the Stripe response, secret, account details or balances.
 */
export type Readiness = {
  ok: boolean;
  code: 'STRIPE_TEST_CONNECTED' | 'TEST_KEY_MISSING' | 'TEST_KEY_REQUIRED' |
    'STRIPE_AUTH_REJECTED' | 'STRIPE_READ_FAILED' | 'STRIPE_TEST_MODE_UNVERIFIED';
  payment_flow_verified: false;
};
const result = (ok: boolean, code: Readiness['code']): Readiness => ({
  ok, code, payment_flow_verified: false,
});

export async function checkStripeTestConnection(
  key: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Readiness> {
  if (!key) return result(false, 'TEST_KEY_MISSING');
  // Refuse live, publishable, malformed, or accidentally whitespace-padded keys
  // BEFORE making any request. Never inspect the preexisting subscription key.
  if (!/^sk_test_[A-Za-z0-9]+$/.test(key)) return result(false, 'TEST_KEY_REQUIRED');
  try {
    const response = await fetcher('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2024-06-20' },
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403) return result(false, 'STRIPE_AUTH_REJECTED');
    if (!response.ok) return result(false, 'STRIPE_READ_FAILED');
    const body = await response.json();
    if (body?.object !== 'balance' || body?.livemode !== false) {
      return result(false, 'STRIPE_TEST_MODE_UNVERIFIED');
    }
    return result(true, 'STRIPE_TEST_CONNECTED');
  } catch {
    // In particular, never return fetch exceptions that might contain headers.
    return result(false, 'STRIPE_READ_FAILED');
  }
}

export function createReadinessHandler<T extends { ok: boolean } = Readiness>(deps: {
  claim: (hash: string) => Promise<boolean>;
  check: () => Promise<T>;
}): (request: Request) => Promise<Response> {
  const reply = (body: unknown, status: number) => Response.json(body, {
    status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
  return async request => {
    if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    // Fixed small management payload. No CORS and no client-selectable operation.
    const size = request.headers.get('content-length');
    if (size && (!/^\d+$/.test(size) || Number(size) > 256)) return reply({ error: 'INVALID_REQUEST' }, 400);
    try {
      // Bound chunked bodies too; don't let an unauthenticated call allocate an
      // arbitrarily large JSON body before verifying its single-use capability.
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: 'FORBIDDEN' }, 403);
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 256) {
            await reader.cancel();
            return reply({ error: 'INVALID_REQUEST' }, 400);
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const body = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      const { token } = JSON.parse(new TextDecoder().decode(body));
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return reply({ error: 'FORBIDDEN' }, 403);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (!await deps.claim(hash)) return reply({ error: 'FORBIDDEN' }, 403);
      const outcome = await deps.check();
      return reply(outcome, outcome.ok ? 200 : 503);
    } catch {
      return reply({ error: 'CHECK_UNAVAILABLE' }, 503);
    }
  };
}
