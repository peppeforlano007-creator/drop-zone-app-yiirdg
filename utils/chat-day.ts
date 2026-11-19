// Day separator label for chat lists ("Oggi", "Ieri", "lunedì 17 novembre", "3 ottobre 2025").
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function isSameChatDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function formatChatDay(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}
