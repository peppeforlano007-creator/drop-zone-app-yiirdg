
export type LoyaltyLevel = 'Nuovo' | 'Fedele' | 'VIP' | 'Top';

export function getLoyaltyLevel(points: number): LoyaltyLevel {
  if (points >= 700) return 'Top';
  if (points >= 300) return 'VIP';
  if (points >= 100) return 'Fedele';
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

export function getNextLevelInfo(points: number): { nextLevel: string; pointsNeeded: number } | null {
  if (points < 100) return { nextLevel: 'Fedele', pointsNeeded: 100 - points };
  if (points < 300) return { nextLevel: 'VIP', pointsNeeded: 300 - points };
  if (points < 700) return { nextLevel: 'Top', pointsNeeded: 700 - points };
  return null;
}

export function getLoyaltyDiscount(level: LoyaltyLevel): number {
  switch (level) {
    case 'Top': return 10;
    case 'VIP': return 6;
    case 'Fedele': return 3;
    default: return 0;
  }
}
