import { describe, expect, test } from 'bun:test';
import { canBookAtPickup, pickupExportStatus } from './pickup-rules';

describe('pickup destination rules', () => {
  test('missing profile never books even if a drop has a pickup', () => {
    expect(canBookAtPickup(null, 'surano')).toBe(false);
    expect(canBookAtPickup(undefined, 'surano')).toBe(false);
  });
  test('only matching nonempty points can book', () => {
    expect(canBookAtPickup('surano', 'surano')).toBe(true);
    expect(canBookAtPickup('maglie', 'surano')).toBe(false);
    expect(canBookAtPickup('surano', null)).toBe(false);
    expect(canBookAtPickup('', '')).toBe(false);
  });
  test('export does not use current profile preference to validate destination', () => {
    expect(pickupExportStatus('surano', 'surano')).toBe('OK');
    expect(pickupExportStatus('maglie', 'surano')).toContain('diverso');
    expect(pickupExportStatus(null, 'surano')).toContain('mancante');
    expect(pickupExportStatus('surano', null)).toContain('mancante');
  });
});
