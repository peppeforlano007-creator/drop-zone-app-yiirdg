
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Check for drops that have expired and didn't reach minimum value
 * This should be called periodically (e.g., every hour) or when viewing drop management
 */
export async function checkUnderfundedDrops(): Promise<{
  success: boolean;
  underfundedCount: number;
  error?: string;
}> {
  try {
    console.log('Checking for underfunded drops...');
    
    const { error } = await supabase.rpc('check_underfunded_drops');
    
    if (error) {
      console.error('Error checking underfunded drops:', error);
      return {
        success: false,
        underfundedCount: 0,
        error: error.message,
      };
    }

    // Get count of underfunded drops that haven't been notified yet
    const { data: underfundedDrops, error: countError } = await supabase
      .from('drops')
      .select('id')
      .eq('status', 'underfunded')
      .is('underfunded_notified_at', null);

    if (countError) {
      console.error('Error counting underfunded drops:', countError);
      return {
        success: true,
        underfundedCount: 0,
      };
    }

    console.log(`Found ${underfundedDrops?.length || 0} underfunded drops needing notification`);

    return {
      success: true,
      underfundedCount: underfundedDrops?.length || 0,
    };
  } catch (error) {
    console.error('Error in checkUnderfundedDrops:', error);
    return {
      success: false,
      underfundedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process an underfunded drop by releasing funds and notifying users
 */
export async function processUnderfundedDrop(dropId: string): Promise<{
  success: boolean;
  refundedBookings: number;
  error?: string;
}> {
  try {
    console.log('Processing underfunded drop:', dropId);

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        refundedBookings: 0,
        error: 'No active session',
      };
    }

    // Call the edge function to handle the underfunded drop
    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/handle-underfunded-drops`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ dropId }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Error processing underfunded drop:', result);
      return {
        success: false,
        refundedBookings: 0,
        error: result.error || 'Failed to process underfunded drop',
      };
    }

    console.log('Underfunded drop processed successfully:', result);

    return {
      success: true,
      refundedBookings: result.refundedBookings || 0,
    };
  } catch (error) {
    console.error('Error in processUnderfundedDrop:', error);
    return {
      success: false,
      refundedBookings: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get statistics about underfunded drops
 */
export async function getUnderfundedDropStats(): Promise<{
  total: number;
  notified: number;
  pending: number;
  totalRefundedAmount: number;
}> {
  try {
    const { data: drops, error } = await supabase
      .from('drops')
      .select(`
        id,
        current_value,
        underfunded_notified_at
      `)
      .eq('status', 'underfunded');

    if (error) {
      console.error('Error getting underfunded drop stats:', error);
      return {
        total: 0,
        notified: 0,
        pending: 0,
        totalRefundedAmount: 0,
      };
    }

    const total = drops?.length || 0;
    const notified = drops?.filter(d => d.underfunded_notified_at !== null).length || 0;
    const pending = total - notified;
    const totalRefundedAmount = drops?.reduce((sum, d) => sum + (d.current_value || 0), 0) || 0;

    return {
      total,
      notified,
      pending,
      totalRefundedAmount,
    };
  } catch (error) {
    console.error('Error in getUnderfundedDropStats:', error);
    return {
      total: 0,
      notified: 0,
      pending: 0,
      totalRefundedAmount: 0,
    };
  }
}
