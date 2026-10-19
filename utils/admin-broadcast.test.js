import { beforeEach, describe, expect, mock, test } from 'bun:test';

const storage = new Map();
mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  },
}));
const { loadBroadcastRecipients, sendInAppBroadcast } = await import('./admin-broadcast');
const payload = { title: 'Titolo', message: 'Messaggio', type: 'general', role: 'consumer' };
beforeEach(() => storage.clear());

describe('broadcast recipient paging', () => {
  test('reaches every recipient even with a server cap lower than 1000', async () => {
    const rows = Array.from({ length: 3450 }, (_, i) => ({ user_id: String(i).padStart(6, '0'), push_token: null }));
    let requests = 0;
    const client = { from: () => {
      let cursor = '';
      return {
        select() { return this; }, order() { return this; }, limit() { return this; },
        eq() { return this; }, gt(_, value) { cursor = value; return this; },
        then(resolve) { requests++; return Promise.resolve({ data: rows.filter(r => r.user_id > cursor).slice(0, 500), error: null }).then(resolve); },
      };
    } };
    const result = await loadBroadcastRecipients(client, payload);
    expect(result).toHaveLength(3450);
    expect(new Set(result.map(r => r.user_id)).size).toBe(3450);
    expect(requests).toBe(8);
  });
  test('does not report a truncated result as success after a page error', async () => {
    const client = { from: () => ({
      select() { return this; }, order() { return this; }, limit() { return this; }, eq() { return this; },
      then(resolve) { return Promise.resolve({ data: null, error: new Error('offline') }).then(resolve); },
    }) };
    await expect(loadBroadcastRecipients(client, payload)).rejects.toThrow('offline');
  });
});

describe('in-app broadcast retries', () => {
  const auth = { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) };
  test('retains the same request key after an ambiguous network failure', async () => {
    const keys = [];
    const client = { auth, rpc: async (_, args) => {
      keys.push(args.p_request_key);
      return keys.length === 1 ? { error: new Error('timeout') }
        : { data: { recipients: 3224, batches: 4, reused: true }, error: null };
    } };
    await expect(sendInAppBroadcast(client, payload)).rejects.toThrow('timeout');
    const result = await sendInAppBroadcast(client, payload);
    expect(result.recipients).toBe(3224);
    expect(keys[1]).toBe(keys[0]);
    expect(storage.size).toBe(0);
  });
  test('rejects signed-out sends before any RPC', async () => {
    const client = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } };
    await expect(sendInAppBroadcast(client, payload)).rejects.toThrow('Accedi');
    expect(storage.size).toBe(0);
  });
  test('does not acknowledge an unverified response or discard its retry key', async () => {
    const client = { auth, rpc: async () => ({ data: {}, error: null }) };
    await expect(sendInAppBroadcast(client, payload)).rejects.toThrow('non verificabile');
    expect(storage.size).toBe(1);
  });
});
