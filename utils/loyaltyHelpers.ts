
export type LoyaltyLevel = 'Nuovo' | 'Fedele' | 'VIP' | 'Top';

export function getLoyaltyLevel(pointsTotal: number): LoyaltyLevel {
  if (pointsTotal >= 700) return 'Top';
  if (pointsTotal >= 300) return 'VIP';
  if (pointsTotal >= 100) return 'Fedele';
  return 'Nuovo';
}

export function getLoyaltyLevelColor(level: LoyaltyLevel): string {
  switch (level) {
    case 'Top': return '#FFD700';
    case 'VIP': return '#9C27B0';
    case 'Fedele': return '#2196F3';
    default: return '#9E9E9E';
  }
}

export function getNextLevelInfo(pointsTotal: number): { nextLevel: string; pointsNeeded: number } | null {
  if (pointsTotal < 100) return { nextLevel: 'Fedele', pointsNeeded: 100 - pointsTotal };
  if (pointsTotal < 300) return { nextLevel: 'VIP', pointsNeeded: 300 - pointsTotal };
  if (pointsTotal < 700) return { nextLevel: 'Top', pointsNeeded: 700 - pointsTotal };
  return null;
}
