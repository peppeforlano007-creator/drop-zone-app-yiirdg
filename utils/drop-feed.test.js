import { describe, expect, test } from 'bun:test';
import { categoryKey, feedCategories, feedCounter, feedPosition, filterFeed, loadDropFeedProducts } from './drop-feed';

const products = [
  { id: 'a', category: '  ARREDAMENTO  ' },
  { id: 'b', category: 'arredamento' },
  { id: 'c', category: 'Casa   e cucina' },
  { id: 'd', category: null },
  { id: 'e', category: '   ' },
];

function database(rows, cap = 500, failAt = -1) {
  const calls = [];
  return { calls, from(table) {
    let start, end, list, inStock = false;
    const order = [];
    return {
      select() { return this; },
      eq(_, value) { list = value; return this; },
      order(field, options) { order.push([field, options.ascending]); return this; },
      range(a, b) { start = a; end = b; return this; },
      gt(field, value) { expect([field, value]).toEqual(['stock', 0]); inStock = true; return this; },
      then(resolve) {
        calls.push({ table, start, end, list, order, inStock });
        const data = rows.filter(row => row.supplier_list_id === list && (!inStock || row.stock > 0))
          .slice(start, start + Math.min(cap, end - start + 1));
        return Promise.resolve(start >= failAt && failAt >= 0
          ? { data: null, error: new Error('offline') } : { data, error: null }).then(resolve);
      },
    };
  } };
}

describe('drop feed navigation', () => {
  test('groups categories without changing imported values; missing category is separate', () => {
    expect(feedCategories(products)).toEqual([
      { key: 'arredamento', label: 'Arredamento', count: 2 },
      { key: 'casa e cucina', label: 'Casa e cucina', count: 1 },
      { key: '', label: 'Senza categoria', count: 2 },
    ]);
    expect(products[0].category).toBe('  ARREDAMENTO  ');
    expect(categoryKey(' CASA \n E cucina ')).toBe('casa e cucina');
  });
  test('all includes every product and filters preserve product identity and order', () => {
    expect(filterFeed(products, null)).toBe(products);
    expect(filterFeed(products, 'arredamento')).toEqual([products[0], products[1]]);
    expect(filterFeed(products, '')).toEqual([products[3], products[4]]);
    expect(filterFeed(products, 'missing')).toEqual([]);
  });
  test('counter uses the filtered total, including last/empty/shrunk lists', () => {
    expect(feedCounter(11, 240)).toBe('12 di 240');
    expect(feedCounter(2, 85)).toBe('3 di 85');
    expect(feedCounter(239, 240)).toBe('240 di 240 · Fine lista');
    expect(feedCounter(2, 1)).toBe('1 di 1 · Fine lista');
    expect(feedCounter(0, 0)).toBe('0 di 0');
  });
  test('restores saved product by id even after earlier articles disappear', () => {
    expect(feedPosition(products, 'd', 3)).toBe(3);
    expect(feedPosition(products.slice(1), 'd', 3)).toBe(2);
    expect(feedPosition(products.slice(0, 2), 'd', 3)).toBe(1);
    expect(feedPosition([], 'd', 3)).toBe(0);
    expect(feedPosition(products, null, -1)).toBe(0);
  });
});

describe('complete catalogue loading', () => {
  const rows = Array.from({ length: 1240 }, (_, index) => ({
    id: String(index), supplier_list_id: 'list', stock: index % 2,
  }));
  test('loads beyond 1000 and continues under a smaller server cap', async () => {
    const client = database(rows, 200);
    const result = await loadDropFeedProducts(client, 'list', true);
    expect(result).toHaveLength(1240);
    expect(new Set(result.map(row => row.id)).size).toBe(1240);
    expect(client.calls).toHaveLength(8);
    expect(client.calls[0].order).toEqual([['created_at', false], ['id', false]]);
    expect(client.calls.at(-1).start).toBe(1240);
  });
  test('retains existing stock and supplier-list visibility rules', async () => {
    const client = database([...rows, { id: 'other', supplier_list_id: 'other', stock: 10 }]);
    const result = await loadDropFeedProducts(client, 'list', false);
    expect(result).toHaveLength(620);
    expect(result.every(row => row.stock > 0 && row.supplier_list_id === 'list')).toBe(true);
  });
  test('does not present partially loaded data as a complete total after failure', async () => {
    await expect(loadDropFeedProducts(database(rows, 500, 500), 'list', true)).rejects.toThrow('offline');
  });
  test('empty catalogue ends cleanly', async () => {
    expect(await loadDropFeedProducts(database([]), 'list', true)).toEqual([]);
  });
});
