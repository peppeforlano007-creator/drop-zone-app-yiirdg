import { describe, expect, test } from 'bun:test';
import { fetchChatPage, mergeChatMessages } from './chat-pagination';

const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const fixture = (n, time = '2026-10-19T12:00:00.123456+00:00') => ({
  id: id(n), group_id: 'andria', sender_id: 'sender', content: `Messaggio ${n}`,
  message_type: n === 50 ? 'drop' : 'text', drop_id: null, product_id: null, created_at: time,
});

function database(rows, cap = 50) {
  const calls = [];
  return { calls, from(table) {
    let group, cursor;
    const orders = [];
    let limit;
    const query = {
      select() { return this; },
      eq(_, value) { group = value; return this; },
      order(column, options) { orders.push([column, options.ascending]); return this; },
      limit(value) { limit = value; return this; },
      or(filter) {
        const match = filter.match(/^created_at\.lt\.(.*),and\(created_at\.eq\.(.*),id\.lt\.(.*)\)$/);
        if (!match || match[1] !== match[2]) throw new Error('Malformed cursor');
        cursor = { created_at: match[1], id: match[3] };
        return this;
      },
      then(resolve) {
        calls.push({ table, group, orders, limit, cursor });
        const result = mergeChatMessages([], rows.filter(row => row.group_id === group))
          .filter(row => !cursor || row.created_at < cursor.created_at || (row.created_at === cursor.created_at && row.id < cursor.id))
          .slice(0, Math.min(limit, cap));
        return Promise.resolve({ data: result, error: null }).then(resolve);
      },
    };
    return query;
  } };
}

describe('chat history pagination', () => {
  test('opens with the latest 50, not the oldest 50', async () => {
    const client = database(Array.from({ length: 135 }, (_, n) => fixture(n + 1)));
    const page = await fetchChatPage(client, 'andria');
    expect(page).toHaveLength(50);
    expect(page[0].id).toBe(id(135));
    expect(page[49].id).toBe(id(86));
    expect(client.calls[0].orders).toEqual([['created_at', false], ['id', false]]);
  });
  test('loads all 135 with timestamp ties, with no gaps or duplicates', async () => {
    const rows = Array.from({ length: 135 }, (_, n) => fixture(n + 1));
    rows.push({ ...fixture(999), group_id: 'another-group' });
    const client = database(rows);
    let cursor;
    let result = [];
    for (let i = 0; i < 5; i++) {
      const page = await fetchChatPage(client, 'andria', cursor);
      if (!page.length) break;
      result = mergeChatMessages(result, page);
      cursor = page[page.length - 1];
    }
    expect(result).toHaveLength(135);
    expect(new Set(result.map(row => row.id)).size).toBe(135);
    expect(result[134].id).toBe(id(1));
    expect(client.calls).toHaveLength(4);
  });
  test('continues until an empty page even if the server cap is smaller than 50', async () => {
    const client = database(Array.from({ length: 135 }, (_, n) => fixture(n + 1)), 20);
    let cursor;
    let total = 0;
    while (true) {
      const page = await fetchChatPage(client, 'andria', cursor);
      if (!page.length) break;
      total += page.length;
      cursor = page[page.length - 1];
    }
    expect(total).toBe(135);
  });
  test('retains realtime inserts when the initial page finishes late', () => {
    const live = fixture(136, '2026-10-19T12:00:01.000001+00:00');
    const loaded = [fixture(135), fixture(134)];
    const result = mergeChatMessages([live], loaded);
    expect(result[0]).toEqual(live);
    expect(result).toHaveLength(3);
  });
  test('deduplicates out-of-order realtime and history results', () => {
    const first = fixture(1), second = fixture(2), third = fixture(3);
    const result = mergeChatMessages([second, first], [third, second]);
    expect(result.map(row => row.id)).toEqual([third.id, second.id, first.id]);
  });
  test('propagates query errors rather than declaring history empty', async () => {
    const client = { from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      then(resolve) { return Promise.resolve({ data: null, error: new Error('offline') }).then(resolve); },
    }) };
    await expect(fetchChatPage(client, 'andria')).rejects.toThrow('offline');
  });
});
