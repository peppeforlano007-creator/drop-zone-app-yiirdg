import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../activation-site/activate.js', import.meta.url), 'utf8');
const base = 'https://sippdylyuzejudmzbwdn.supabase.co';
function page(responses) {
  const elements = Object.fromEntries(['activation','status','save','resend','invitation','password','confirm'].map(id => [id, {
    value: '', disabled: false, hidden: false, dataset: {}, textContent: '', handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; }, reset() {},
  }]));
  const calls = [];
  vm.runInNewContext(source, {
    URL, URLSearchParams, document: { querySelector: selector => elements[selector.slice(1)] }, setTimeout() {},
    fetch: async (url, options) => {
      calls.push({ url, body: options.body ? JSON.parse(options.body) : undefined });
      const response = responses.shift(); assert.ok(response, 'unexpected network call');
      return { ok: response.status < 400, status: response.status, json: async () => response.data || {} };
    },
  });
  elements.invitation.value = base + '/auth/v1/verify?type=recovery&token=' + 'a'.repeat(64);
  elements.password.value = elements.confirm.value = 'MockOnlyTest2026!';
  return { elements, calls, submit: () => elements.activation.handlers.submit({ preventDefault() {} }), resend: () => elements.resend.handlers.click() };
}
const validSession = { status: 200, data: { access_token: 'mock-session-not-real', user: { email: 'trani@streetstock.it', app_metadata: { role: 'pickup_point', pickup_point_id: 'fe5ce2ea-8707-4ec6-8bc7-e2556df05992' } } } };
{
  const p = page([validSession, { status: 200 }, { status: 204 }]); await p.submit();
  assert.equal(p.calls[0].body.type, 'recovery'); assert.equal(p.elements.activation.hidden, true);
}
{
  const p = page([validSession, { status: 200 }, { status: 204 }]);
  p.elements.invitation.value = p.elements.invitation.value.replace('recovery', 'invite'); await p.submit();
  assert.equal(p.calls[0].body.type, 'invite');
}
{
  const p = page([{ status: 403, data: { code: 'otp_expired' } }]); await p.submit();
  assert.match(p.elements.status.textContent, /nuova email di recupero/); assert.equal(p.calls.length, 1);
}
{
  const p = page([validSession, { status: 422, data: { code: 'same_password' } }, { status: 200 }, { status: 204 }]);
  await p.submit(); assert.match(p.elements.status.textContent, /diversa da quella attuale/);
  p.elements.password.value = p.elements.confirm.value = 'OtherMockOnly2026!'; await p.submit();
  assert.equal(p.calls.filter(c => c.url.endsWith('/verify')).length, 1); assert.equal(p.elements.activation.hidden, true);
}
{
  const p = page([validSession, { status: 401 }]); await p.submit();
  assert.equal(p.elements.invitation.disabled, false); assert.match(p.elements.status.textContent, /sessione.*scaduta/);
}
{
  const p = page([{ status: 200 }]); await p.resend();
  assert.equal(p.calls[0].body.email, 'trani@streetstock.it'); assert.ok(p.calls[0].url.endsWith('/recover'));
}
{
  const p = page([]); p.elements.invitation.value = 'https://example.com/invalid'; await p.submit();
  assert.equal(p.calls.length, 0);
}
{
  const p = page([{ status: 200, data: validSession.data.user }, { status: 200 }, { status: 204 }]);
  p.elements.invitation.value = 'http://localhost:3000/#access_token=mock.mock.mock&type=recovery';
  await p.submit();
  assert.equal(p.calls[0].url, base + '/auth/v1/user');
  assert.equal(p.calls.filter(c => c.url.endsWith('/verify')).length, 0);
  assert.equal(p.elements.activation.hidden, true);
}
{
  const p = page([{ status: 401 }]);
  p.elements.invitation.value = 'https://example.com/#access_token=mock.mock.mock&type=recovery';
  await p.submit(); assert.equal(p.calls.length, 1);
  assert.match(p.elements.status.textContent, /sessione.*scaduta/);
}
{
  const p = page([{ status: 200, data: { ...validSession.data.user, email: 'other@example.com' } }]);
  p.elements.invitation.value = 'https://example.com/#access_token=mock.mock.mock&type=recovery';
  await p.submit(); assert.equal(p.calls.length, 1);
  assert.match(p.elements.status.textContent, /non corrisponde/);
}
{
  const p = page([]); p.elements.invitation.value = 'https://example.com/#error=access_denied&error_code=otp_expired';
  await p.submit(); assert.equal(p.calls.length, 0); assert.match(p.elements.status.textContent, /non una sessione valida/);
}
console.log('11 recovery tests passed; all auth requests mocked, no real users or emails touched.');
