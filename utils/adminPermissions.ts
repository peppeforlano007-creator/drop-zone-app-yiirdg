// Sezioni del pannello admin che possono essere consentite a un admin limitato.
// profiles.admin_permissions NULL = admin completo; array = sezioni consentite.

export interface AdminSection {
  key: string;
  label: string;
  /** Schermate (nomi dei file in app/admin) che appartengono a questa sezione. */
  screens: string[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: 'manage-drops', label: 'Gestisci Drop', screens: ['manage-drops', 'create-drop', 'complete-drop', 'drop-analytics', 'drop-suggestions', 'force-interests'] },
  { key: 'bookings', label: 'Gestisci Prenotazioni', screens: ['bookings'] },
  { key: 'chat', label: 'Chat', screens: ['chat', 'chat-group'] },
  { key: 'returns', label: 'Visualizza Resi', screens: ['returns'] },
  { key: 'card-refunds', label: 'Rimborsi carta', screens: ['card-refunds'] },
  { key: 'export-orders', label: 'Esporta Ordini', screens: ['export-orders'] },
  { key: 'users', label: 'Utenti', screens: ['users', 'user-details', 'edit-user', 'create-user', 'activity-log'] },
  { key: 'loyalty-program', label: 'Programma Fedeltà', screens: ['loyalty-program'] },
  { key: 'products', label: 'Prodotti', screens: ['products', 'add-product', 'edit-product'] },
  { key: 'pickup-points', label: 'Punti di Ritiro', screens: ['pickup-points', 'create-pickup-point', 'edit-pickup-point'] },
  { key: 'suppliers', label: 'Fornitori', screens: ['suppliers', 'create-supplier', 'supplier-details', 'create-list', 'edit-list', 'list-details'] },
  { key: 'manage-notifications', label: 'Gestisci Notifiche', screens: ['manage-notifications'] },
  { key: 'notifications', label: 'Invia Notifiche', screens: ['notifications'] },
  { key: 'analytics', label: 'Analytics', screens: ['analytics', 'reports'] },
  { key: 'testing', label: 'Testing', screens: ['testing'] },
  { key: 'settings', label: 'Impostazioni', screens: ['settings', 'legal-documents', 'subscriptions'] },
  { key: 'data-requests', label: 'Richieste GDPR', screens: ['data-requests'] },
];

export function isFullAdmin(permissions: string[] | null | undefined): boolean {
  return permissions == null;
}

/** Sezione a cui appartiene una schermata admin (null = sempre accessibile, es. dashboard). */
export function sectionForScreen(screen: string): string | null {
  return ADMIN_SECTIONS.find(s => s.screens.includes(screen))?.key ?? null;
}

export function canAccessSection(permissions: string[] | null | undefined, sectionKey: string | null): boolean {
  if (sectionKey == null || isFullAdmin(permissions)) return true;
  return permissions!.includes(sectionKey);
}

/** Route della dashboard ('/admin/xxx') → consentita? */
export function canAccessRoute(permissions: string[] | null | undefined, route: string): boolean {
  const screen = route.replace(/^\/admin\//, '').split(/[/?]/)[0];
  return canAccessSection(permissions, sectionForScreen(screen));
}
