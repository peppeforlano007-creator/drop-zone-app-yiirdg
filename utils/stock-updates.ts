// One removal per product, with a validity guard that also covers an animation
// already in progress. A restock/cancellation invalidates its delayed completion.
export class StockRemovalQueue {
  private jobs = new Map<string, { timer: ReturnType<typeof setTimeout> }>();
  constructor(private clock = {
    set: (fn: () => void, delay: number) => setTimeout(fn, delay),
    clear: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  }) {}

  schedule(id: string, expire: (isCurrent: () => boolean) => void): void {
    if (this.jobs.has(id)) return;
    const job = { timer: undefined as unknown as ReturnType<typeof setTimeout> };
    job.timer = this.clock.set(() => expire(() => this.jobs.get(id) === job), 3000);
    this.jobs.set(id, job);
  }
  cancel(id: string): void {
    const job = this.jobs.get(id);
    this.jobs.delete(id);
    if (job) this.clock.clear(job.timer);
  }
  clear(): void { for (const id of this.jobs.keys()) this.cancel(id); }
}

export function mergeStockProduct<T extends { id: string; variants?: unknown[]; hasVariants?: boolean }>(
  current: T | undefined, incoming: T,
): T {
  return {
    ...current, ...incoming,
    variants: incoming.variants ?? current?.variants,
    hasVariants: incoming.hasVariants ?? current?.hasVariants,
  };
}
