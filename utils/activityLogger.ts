
/**
 * Activity Logger
 * 
 * Logs user activities to the activity_logs table
 */

import { supabase } from '@/app/integrations/supabase/client';

export interface ActivityLogData {
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the database
 */
export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No user logged in');
      return;
    }

    // Get user profile for name and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('user_id', user.id)
      .single();

    // Insert activity log
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        action: data.action,
        description: data.description,
        user_id: user.id,
        user_name: profile?.full_name || user.email || 'Unknown',
        user_role: profile?.role || 'unknown',
        metadata: data.metadata,
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Exception logging activity:', error);
  }
}

/**
 * Log drop-related activities
 */
export const logDropActivity = {
  created: (dropName: string, dropId: string) =>
    logActivity({
      action: 'drop_created',
      description: `Nuovo drop creato: "${dropName}"`,
      metadata: { drop_id: dropId },
    }),
  
  approved: (dropName: string, dropId: string) =>
    logActivity({
      action: 'drop_approved',
      description: `Drop approvato: "${dropName}"`,
      metadata: { drop_id: dropId },
    }),
  
  activated: (dropName: string, dropId: string) =>
    logActivity({
      action: 'drop_activated',
      description: `Drop attivato: "${dropName}"`,
      metadata: { drop_id: dropId },
    }),
  
  deactivated: (dropName: string, dropId: string) =>
    logActivity({
      action: 'drop_deactivated',
      description: `Drop disattivato: "${dropName}"`,
      metadata: { drop_id: dropId },
    }),
  
  completed: (dropName: string, dropId: string) =>
    logActivity({
      action: 'drop_completed',
      description: `Drop completato: "${dropName}"`,
      metadata: { drop_id: dropId },
    }),
};

/**
 * Log booking-related activities
 */
export const logBookingActivity = {
  created: (productName: string, bookingId: string) =>
    logActivity({
      action: 'booking_created',
      description: `Nuova prenotazione per prodotto "${productName}"`,
      metadata: { booking_id: bookingId },
    }),
  
  confirmed: (productName: string, bookingId: string) =>
    logActivity({
      action: 'booking_confirmed',
      description: `Prenotazione confermata per "${productName}"`,
      metadata: { booking_id: bookingId },
    }),
  
  cancelled: (productName: string, bookingId: string) =>
    logActivity({
      action: 'booking_cancelled',
      description: `Prenotazione annullata per "${productName}"`,
      metadata: { booking_id: bookingId },
    }),
};

/**
 * Log user-related activities
 */
export const logUserActivity = {
  registered: (userName: string, userId: string, role: string) =>
    logActivity({
      action: 'user_registered',
      description: `Nuovo utente registrato: "${userName}" (${role})`,
      metadata: { user_id: userId, role },
    }),
  
  updated: (userName: string, userId: string) =>
    logActivity({
      action: 'user_updated',
      description: `Dati utente aggiornati: "${userName}"`,
      metadata: { user_id: userId },
    }),
  
  deleted: (userName: string, userId: string) =>
    logActivity({
      action: 'user_deleted',
      description: `Utente eliminato: "${userName}"`,
      metadata: { user_id: userId },
    }),
};

/**
 * Log product-related activities
 */
export const logProductActivity = {
  added: (productName: string, productId: string) =>
    logActivity({
      action: 'product_added',
      description: `Nuovo prodotto aggiunto: "${productName}"`,
      metadata: { product_id: productId },
    }),
  
  updated: (productName: string, productId: string) =>
    logActivity({
      action: 'product_updated',
      description: `Prodotto aggiornato: "${productName}"`,
      metadata: { product_id: productId },
    }),
  
  deleted: (productName: string, productId: string) =>
    logActivity({
      action: 'product_deleted',
      description: `Prodotto eliminato: "${productName}"`,
      metadata: { product_id: productId },
    }),
};

/**
 * Log supplier-related activities
 */
export const logSupplierActivity = {
  created: (supplierName: string, supplierId: string) =>
    logActivity({
      action: 'supplier_created',
      description: `Nuovo fornitore creato: "${supplierName}"`,
      metadata: { supplier_id: supplierId },
    }),
  
  listCreated: (listName: string, listId: string) =>
    logActivity({
      action: 'supplier_list_created',
      description: `Nuova lista fornitore creata: "${listName}"`,
      metadata: { list_id: listId },
    }),
  
  listDeleted: (listName: string, listId: string) =>
    logActivity({
      action: 'supplier_list_deleted',
      description: `Lista fornitore eliminata: "${listName}"`,
      metadata: { list_id: listId },
    }),
};

/**
 * Log pickup point-related activities
 */
export const logPickupPointActivity = {
  created: (pointName: string, pointId: string) =>
    logActivity({
      action: 'pickup_point_created',
      description: `Nuovo punto di ritiro creato: "${pointName}"`,
      metadata: { pickup_point_id: pointId },
    }),
  
  updated: (pointName: string, pointId: string) =>
    logActivity({
      action: 'pickup_point_updated',
      description: `Punto di ritiro aggiornato: "${pointName}"`,
      metadata: { pickup_point_id: pointId },
    }),
  
  approved: (pointName: string, pointId: string) =>
    logActivity({
      action: 'pickup_point_approved',
      description: `Punto di ritiro approvato: "${pointName}"`,
      metadata: { pickup_point_id: pointId },
    }),
};
