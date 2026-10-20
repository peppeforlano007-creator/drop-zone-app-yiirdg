import { describe, expect, test } from 'bun:test';
import { mergeStockProduct, StockRemovalQueue } from './stock-updates';

function setup() {
  let next = 0;
  const jobs = new Map();
  const queue = new StockRemovalQueue({
    set(fn) { const id = ++next; jobs.set(id, fn); return id; },
    clear(id) { jobs.delete(id); },
  });
  return { queue, jobs, expire() { for (const fn of [...jobs.values()]) fn(); } };
}

describe('remaining inventory refresh', () => {
  test('repeated sold-out updates schedule only one removal', () => {
    const t = setup(); let count = 0;
    t.queue.schedule('p', () => count++);
    t.queue.schedule('p', () => count++);
    expect(t.jobs.size).toBe(1);
    t.expire(); expect(count).toBe(1);
  });
  test('restock cancels the pending removal', () => {
    const t = setup(); let removed = false;
    t.queue.schedule('p', () => { removed = true; });
    t.queue.cancel('p'); t.expire();
    expect(removed).toBe(false);
    expect(t.jobs.size).toBe(0);
  });
  test('restock invalidates an animation already running, even after a new sell-out', () => {
    const t = setup(); let oldGuard;
    t.queue.schedule('p', guard => { oldGuard = guard; }); t.expire();
    expect(oldGuard()).toBe(true);
    t.queue.cancel('p'); t.queue.schedule('p', () => {});
    expect(oldGuard()).toBe(false);
  });
  test('changing drop/unmounting invalidates all delayed completions', () => {
    const t = setup(); let guard;
    t.queue.schedule('p', current => { guard = current; }); t.expire();
    t.queue.schedule('q', () => {}); t.queue.clear();
    expect(guard()).toBe(false); expect(t.jobs.size).toBe(0);
  });
  test('raw realtime rows do not erase variant data; enriched refresh replaces it', () => {
    const current = { id: 'p', stock: 5, hasVariants: true, variants: [{ id: 'm', stock: 5 }] };
    const raw = mergeStockProduct(current, { id: 'p', stock: 4 });
    expect(raw.stock).toBe(4); expect(raw.variants).toBe(current.variants);
    expect(raw.hasVariants).toBe(true);
    const enriched = mergeStockProduct(raw, { id: 'p', stock: 0, hasVariants: true, variants: [{ id: 'm', stock: 0 }] });
    expect(enriched.variants[0].stock).toBe(0);
    expect(mergeStockProduct(enriched, { id: 'p', variants: [], hasVariants: false }).variants).toEqual([]);
  });
});
