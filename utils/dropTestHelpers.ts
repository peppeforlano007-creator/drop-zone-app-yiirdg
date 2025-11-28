
/**
 * Drop Creation and Management Test Helpers
 * 
 * Tests for drop functionality including creation, activation, and completion
 */

import { supabase } from '@/app/integrations/supabase/client';
import { TestResult } from './testHelpers';

/**
 * Test drop creation trigger
 */
export async function testDropCreationTrigger(
  supplierListId: string,
  pickupPointId: string
): Promise<TestResult> {
  console.log('🧪 Testing drop creation trigger...');
  const startTime = Date.now();

  try {
    // Get supplier list details
    const { data: supplierList, error: listError } = await supabase
      .from('supplier_lists')
      .select('min_reservation_value, min_discount, max_discount, max_reservation_value')
      .eq('id', supplierListId)
      .single();

    if (listError) {
      return {
        success: false,
        message: `Failed to fetch supplier list: ${listError.message}`,
        details: listError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Check if drop should be created
    const { data: interests, error: interestsError } = await supabase
      .from('user_interests')
      .select('product_id, products(original_price)')
      .eq('supplier_list_id', supplierListId)
      .eq('pickup_point_id', pickupPointId);

    if (interestsError) {
      return {
        success: false,
        message: `Failed to fetch interests: ${interestsError.message}`,
        details: interestsError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    const totalValue = interests?.reduce((sum, interest: any) => {
      return sum + (interest.products?.original_price || 0);
    }, 0) || 0;

    const shouldCreateDrop = totalValue >= supplierList.min_reservation_value;

    // Check if drop exists
    const { data: existingDrop, error: dropError } = await supabase
      .from('drops')
      .select('id, status')
      .eq('supplier_list_id', supplierListId)
      .eq('pickup_point_id', pickupPointId)
      .in('status', ['pending_approval', 'approved', 'active'])
      .maybeSingle();

    if (dropError && dropError.code !== 'PGRST116') {
      return {
        success: false,
        message: `Failed to check existing drop: ${dropError.message}`,
        details: dropError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: shouldCreateDrop
        ? existingDrop
          ? 'Drop already exists (correct)'
          : 'Drop should be created'
        : 'Drop should not be created (threshold not met)',
      details: {
        totalValue,
        minReservationValue: supplierList.min_reservation_value,
        shouldCreateDrop,
        dropExists: !!existingDrop,
        interestsCount: interests?.length || 0,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Drop creation trigger test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test drop discount calculation
 */
export async function testDropDiscountCalculation(dropId?: string): Promise<TestResult> {
  console.log('🧪 Testing drop discount calculation...');
  const startTime = Date.now();

  try {
    // If no dropId provided, get the first active drop
    let targetDropId = dropId;
    
    if (!targetDropId) {
      const { data: drops, error: dropsError } = await supabase
        .from('drops')
        .select('id')
        .in('status', ['active', 'completed'])
        .limit(1);

      if (dropsError) {
        return {
          success: false,
          message: `Failed to fetch drops: ${dropsError.message}`,
          details: dropsError,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      if (!drops || drops.length === 0) {
        return {
          success: false,
          message: 'No active or completed drops found to test',
          details: { hint: 'Create a drop first or provide a dropId' },
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      targetDropId = drops[0].id;
    }

    // Get drop details
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select(`
        *,
        supplier_lists (
          min_discount,
          max_discount,
          min_reservation_value,
          max_reservation_value
        )
      `)
      .eq('id', targetDropId)
      .single();

    if (dropError) {
      return {
        success: false,
        message: `Failed to fetch drop: ${dropError.message}`,
        details: dropError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    const supplierList = drop.supplier_lists;
    const currentValue = drop.current_value || 0;

    // Calculate expected discount
    const valueRange = supplierList.max_reservation_value - supplierList.min_reservation_value;
    const discountRange = supplierList.max_discount - supplierList.min_discount;
    const valueProgress = Math.min(
      Math.max(currentValue - supplierList.min_reservation_value, 0),
      valueRange
    );
    const progressPercentage = valueProgress / valueRange;
    const expectedDiscount = supplierList.min_discount + (discountRange * progressPercentage);

    const actualDiscount = drop.current_discount;
    const discountDifference = Math.abs(expectedDiscount - actualDiscount);
    const isCorrect = discountDifference < 0.01; // Allow for small floating point differences

    return {
      success: isCorrect,
      message: isCorrect
        ? 'Discount calculation is correct'
        : 'Discount calculation mismatch',
      details: {
        dropId: targetDropId,
        dropName: drop.name,
        currentValue,
        expectedDiscount: expectedDiscount.toFixed(2),
        actualDiscount: actualDiscount.toFixed(2),
        difference: discountDifference.toFixed(2),
        minDiscount: supplierList.min_discount,
        maxDiscount: supplierList.max_discount,
        minValue: supplierList.min_reservation_value,
        maxValue: supplierList.max_reservation_value,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Discount calculation test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test drop status transitions
 */
export async function testDropStatusTransitions(dropId?: string): Promise<TestResult> {
  console.log('🧪 Testing drop status transitions...');
  const startTime = Date.now();

  try {
    // If no dropId provided, get the first drop
    let targetDropId = dropId;
    
    if (!targetDropId) {
      const { data: drops, error: dropsError } = await supabase
        .from('drops')
        .select('id, status, name')
        .limit(1);

      if (dropsError) {
        return {
          success: false,
          message: `Failed to fetch drops: ${dropsError.message}`,
          details: dropsError,
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      if (!drops || drops.length === 0) {
        return {
          success: false,
          message: 'No drops found to test',
          details: { hint: 'Create a drop first or provide a dropId' },
          timestamp: new Date(),
          duration: Date.now() - startTime,
        };
      }

      targetDropId = drops[0].id;
    }

    // Get drop details
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('id, status, name, start_time, end_time')
      .eq('id', targetDropId)
      .single();

    if (dropError) {
      return {
        success: false,
        message: `Failed to fetch drop: ${dropError.message}`,
        details: dropError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Define valid state transitions
    const validTransitions: Record<string, string[]> = {
      pending_approval: ['approved', 'cancelled'],
      approved: ['active', 'cancelled'],
      active: ['inactive', 'completed', 'expired'],
      inactive: ['active'],
      completed: [],
      expired: [],
      cancelled: [],
      underfunded: [],
    };

    const currentStatus = drop.status;
    const allowedTransitions = validTransitions[currentStatus] || [];

    return {
      success: true,
      message: `Drop status transition test completed for drop "${drop.name}"`,
      details: {
        dropId: targetDropId,
        dropName: drop.name,
        currentStatus,
        allowedTransitions,
        transitionRules: {
          'pending_approval → approved': 'Admin approves the drop',
          'pending_approval → cancelled': 'Admin cancels the drop',
          'approved → active': 'Drop timer starts',
          'approved → cancelled': 'Admin cancels before activation',
          'active → inactive': 'Admin manually deactivates',
          'active → completed': 'Drop timer ends successfully',
          'active → expired': 'Drop timer ends without meeting minimum',
          'inactive → active': 'Admin reactivates the drop',
          'completed/expired/cancelled': 'Terminal states - no transitions',
        },
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Status transition test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test drop timer functionality
 */
export async function testDropTimer(dropId: string): Promise<TestResult> {
  console.log('🧪 Testing drop timer...');
  const startTime = Date.now();

  try {
    const { data: drop, error } = await supabase
      .from('drops')
      .select('start_time, end_time, status')
      .eq('id', dropId)
      .single();

    if (error) {
      return {
        success: false,
        message: `Failed to fetch drop: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    const now = new Date();
    const startTime_drop = new Date(drop.start_time);
    const endTime = new Date(drop.end_time);

    const hasStarted = now >= startTime_drop;
    const hasEnded = now >= endTime;
    const duration = endTime.getTime() - startTime_drop.getTime();
    const expectedDuration = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

    const isDurationCorrect = Math.abs(duration - expectedDuration) < 60000; // Allow 1 minute difference

    return {
      success: isDurationCorrect,
      message: isDurationCorrect
        ? 'Drop timer is configured correctly'
        : 'Drop timer duration is incorrect',
      details: {
        startTime: startTime_drop.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${(duration / (24 * 60 * 60 * 1000)).toFixed(2)} days`,
        expectedDuration: '5 days',
        hasStarted,
        hasEnded,
        status: drop.status,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Drop timer test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test drop completion and order creation
 */
export async function testDropCompletion(dropId: string): Promise<TestResult> {
  console.log('🧪 Testing drop completion...');
  const startTime = Date.now();

  try {
    // Get drop details
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select('*')
      .eq('id', dropId)
      .single();

    if (dropError) {
      return {
        success: false,
        message: `Failed to fetch drop: ${dropError.message}`,
        details: dropError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Get bookings for this drop
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('drop_id', dropId)
      .eq('payment_status', 'authorized');

    if (bookingsError) {
      return {
        success: false,
        message: `Failed to fetch bookings: ${bookingsError.message}`,
        details: bookingsError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('drop_id', dropId)
      .maybeSingle();

    if (orderError && orderError.code !== 'PGRST116') {
      return {
        success: false,
        message: `Failed to check order: ${orderError.message}`,
        details: orderError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    const shouldHaveOrder = drop.status === 'completed' && (bookings?.length || 0) > 0;
    const hasOrder = !!order;

    return {
      success: shouldHaveOrder === hasOrder,
      message: shouldHaveOrder
        ? hasOrder
          ? 'Order created correctly'
          : 'Order should exist but does not'
        : hasOrder
        ? 'Order exists but should not'
        : 'No order (correct)',
      details: {
        dropStatus: drop.status,
        bookingsCount: bookings?.length || 0,
        hasOrder,
        shouldHaveOrder,
        orderId: order?.id,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Drop completion test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}
