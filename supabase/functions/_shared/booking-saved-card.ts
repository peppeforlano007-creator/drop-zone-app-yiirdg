/** Dormant, test-mode-only saved card support. Server-side only: the Stripe
 * secret never leaves the function. A card is saved ONLY when the customer
 * ticked the consent box for this exact booking attempt. */
export const SAVED_CARD_CONSENT_VERSION = 'saved-card-v1';
const customerId = /^cus_[A-Za-z0-9]+$/;
const pmId = /^pm_[A-Za-z0-9]+$/;
const fail = (code: string): never => { throw new Error(code); };

export class StripeTestCustomerGateway {
  constructor(private key: string | undefined, private fetcher: typeof fetch = fetch) {
    if (!key || !/^sk_(test|live)_[A-Za-z0-9]+$/.test(key)) fail('TEST_KEY_REQUIRED');
  }
  private get live(): boolean { return this.key?.startsWith('sk_live_') === true; }
  private async request(path: string, method: 'GET' | 'POST', body?: URLSearchParams, idempotency?: string): Promise<any> {
    let response: Response;
    try {
      response = await this.fetcher(`https://api.stripe.com/v1/${path}`, {
        method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000),
        headers: { Authorization: `Bearer ${this.key}`, 'Stripe-Version': '2024-06-20',
          ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotency! } : {}) },
        ...(body ? { body: body.toString() } : {}),
      });
    } catch { return fail('STRIPE_UNAVAILABLE'); }
    if (!response.ok) return fail('STRIPE_REQUEST_REJECTED');
    try { return await response.json(); } catch { return fail('STRIPE_RESPONSE_UNVERIFIED'); }
  }
  /** One Stripe customer per user: the idempotency key is derived from the user. */
  async createCustomer(userId: string): Promise<string> {
    const c = await this.request('customers', 'POST', new URLSearchParams({
      description: this.key?.startsWith('sk_live_') ? 'RDN Street Stock Market - carta salvata' : 'RDN TEST ONLY - saved card', 'metadata[user_id]': userId,
    }), `rdn_saved_card_customer_v1:${userId}`);
    if (c?.object !== 'customer' || c.livemode !== this.live || !customerId.test(c.id) || c.metadata?.user_id !== userId) fail('STRIPE_IDENTITY_MISMATCH');
    return c.id;
  }
  /** Lets the PaymentSheet show the saved card. Save/remove are disabled in
   * the sheet: consent and removal happen only through our own screens. */
  async customerSession(customer: string): Promise<string | null> {
    if (!customerId.test(customer)) return null;
    try {
      const s = await this.request('customer_sessions', 'POST', new URLSearchParams({
        customer, 'components[mobile_payment_element][enabled]': 'true',
        'components[mobile_payment_element][features][payment_method_save]': 'disabled',
        'components[mobile_payment_element][features][payment_method_remove]': 'disabled',
        'components[mobile_payment_element][features][payment_method_redisplay]': 'enabled',
        'components[mobile_payment_element][features][payment_method_allow_redisplay_filters][0]': 'always',
        'components[mobile_payment_element][features][payment_method_allow_redisplay_filters][1]': 'limited',
        'components[mobile_payment_element][features][payment_method_allow_redisplay_filters][2]': 'unspecified',
      }), `rdn_saved_card_session_v1:${customer}:${crypto.randomUUID()}`);
      return typeof s?.client_secret === 'string' && s.livemode === this.live ? s.client_secret : null;
    } catch { return null; } // Fall back to the normal card form.
  }
  async cards(customer: string): Promise<{ id: string; brand: string; last4: string }[]> {
    if (!customerId.test(customer)) return fail('CUSTOMER_INVALID');
    const list = await this.request(`customers/${customer}/payment_methods?type=card&limit=10`, 'GET');
    if (!list || !Array.isArray(list.data)) return fail('STRIPE_RESPONSE_UNVERIFIED');
    return list.data.filter((p: any) => p?.livemode === this.live && pmId.test(p.id) && p.card)
      .map((p: any) => ({ id: p.id, brand: String(p.card.brand ?? 'card').slice(0, 20), last4: String(p.card.last4 ?? '').slice(0, 4) }));
  }
  async detachAll(customer: string): Promise<void> {
    for (const card of await this.cards(customer)) {
      await this.request(`payment_methods/${card.id}/detach`, 'POST', new URLSearchParams(), `rdn_saved_card_detach_v1:${card.id}`);
    }
  }
}
