import type { SupabaseClient } from '@supabase/supabase-js';

export interface CategorizedProduct { id: string; category: string | null }
export interface FeedCategory { key: string; label: string; count: number }

// Empty key is the real "uncategorized" group; null means all products.
export function categoryKey(category: string | null | undefined): string {
  return (category ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT');
}

export function feedCategories(products: CategorizedProduct[]): FeedCategory[] {
  const groups = new Map<string, FeedCategory>();
  for (const product of products) {
    const key = categoryKey(product.category);
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, {
      key,
      label: key ? key.charAt(0).toLocaleUpperCase('it-IT') + key.slice(1) : 'Senza categoria',
      count: 1,
    });
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.key) return 1;
    if (!b.key) return -1;
    return a.label.localeCompare(b.label, 'it');
  });
}

export function filterFeed<T extends CategorizedProduct>(products: T[], key: string | null): T[] {
  return key === null ? products : products.filter(product => categoryKey(product.category) === key);
}

export function feedPosition(products: { id: string }[], id: string | null, fallback: number): number {
  const found = id ? products.findIndex(product => product.id === id) : -1;
  return found >= 0 ? found : Math.max(0, Math.min(fallback, products.length - 1));
}

export function feedCounter(index: number, total: number): string {
  const position = total ? Math.min(Math.max(index + 1, 1), total) : 0;
  return `${position} di ${total}${total > 0 && position === total ? ' · Fine lista' : ''}`;
}

// Read every page, even when the server's row cap is smaller than our batch size.
// Stable secondary ordering and de-duplication handle equal creation timestamps.
// Throw rather than presenting a partial catalogue as its real total.
export async function loadDropFeedProducts<T extends { id: string }>(
  client: SupabaseClient,
  supplierListId: string,
  showAll: boolean,
): Promise<T[]> {
  const products = new Map<string, T>();
  let offset = 0;
  while (true) {
    let query = client.from('products').select('*')
      .eq('supplier_list_id', supplierListId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 499);
    if (!showAll) query = query.gt('stock', 0);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as T[];
    if (!page.length) break;
    const previousSize = products.size;
    page.forEach(product => products.set(product.id, product));
    if (products.size === previousSize) throw new Error('Il caricamento del catalogo non avanza');
    offset += page.length;
  }
  return [...products.values()];
}
