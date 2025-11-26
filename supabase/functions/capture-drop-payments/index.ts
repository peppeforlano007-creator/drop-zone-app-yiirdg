
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
/* eslint-enable import/no-unresolved */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DropCompletionRequest {
  dropId: string;
}

interface BookingData {
  id: string;
  user_id: string;
  product_id: string;
  original_price: number;
  discount_percentage: number;
  payment_status: string;
  pickup_point_id: string;
  selected_size?: string;
  selected_color?: string;
  product_name: string;
  supplier_id: string;
  user_full_name: string;
  user_email: string;
}

interface OrdersBySupplier {
  [supplierId: string]: {
    supplier_id: string;
    pickup_point_id: string;
    bookings: BookingData[];
    total_value: number;
  };
}

interface UserNotificationData {
  userId: string;
  userName: string;
  bookings: Array<{
    productName: string;
    originalPrice: number;
    finalPrice: number;
    savings: number;
  }>;
  totalOriginal: number;
  totalFinal: number;
  totalSavings: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎯 Starting drop completion process...');

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server configuration error: Missing environment variables' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let dropId: string;
    try {
      const body = await req.json() as DropCompletionRequest;
      dropId = body.dropId;
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request body' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dropId) {
      console.error('❌ dropId is required');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'dropId is required' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📥 Processing drop:', dropId);

    // Get drop details
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select(`
        id,
        name,
        current_discount,
        status,
        pickup_point_id,
        supplier_lists (
          min_discount,
          max_discount,
          supplier_id
        )
      `)
      .eq('id', dropId)
      .single();

    if (dropError || !drop) {
      console.error('❌ Error fetching drop:', dropError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Drop not found' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Drop "${drop.name}" - Final discount: ${drop.current_discount}%`);

    // Get all active bookings for this drop using simple query
    const { data: rawBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('drop_id', dropId)
      .eq('status', 'active')
      .eq('payment_method', 'cod');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch bookings: ' + bookingsError.message 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch related data for each booking
    const enrichedBookings = [];
    for (const booking of rawBookings || []) {
      // Get product info
      const { data: product } = await supabase
        .from('products')
        .select('name, supplier_id')
        .eq('id', booking.product_id)
        .single();

      // Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', booking.user_id)
        .single();

      enrichedBookings.push({
        ...booking,
        product_name: product?.name || 'Unknown',
        supplier_id: product?.supplier_id || null,
        user_full_name: profile?.full_name || 'Unknown',
        user_email: profile?.email || 'Unknown',
      });
    }

    if (!enrichedBookings || enrichedBookings.length === 0) {
      console.log('ℹ️ No active bookings found for drop:', dropId);
      
      // Still update drop status to completed
      await supabase
        .from('drops')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', dropId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No active bookings to confirm',
          dropId,
          dropName: drop.name,
          summary: {
            totalBookings: 0,
            confirmedCount: 0,
            failedCount: 0,
            finalDiscount: '0',
            totalAmount: '0',
            totalSavings: '0',
            ordersCreated: 0
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${enrichedBookings.length} bookings to confirm`);

    // Calculate final prices and confirm bookings
    const finalDiscount = drop.current_discount || 0;
    const confirmResults = [];
    let totalOriginal = 0;
    let totalFinal = 0;
    let totalSavings = 0;

    // Group bookings by user for notifications
    const userNotifications: Map<string, UserNotificationData> = new Map();

    for (const booking of enrichedBookings as BookingData[]) {
      try {
        // Calculate final price based on final discount
        const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
        const originalPrice = Number(booking.original_price);
        const savings = originalPrice - finalPrice;

        totalOriginal += originalPrice;
        totalFinal += finalPrice;
        totalSavings += savings;

        console.log(`💰 Booking ${booking.id}:`, {
          product: booking.product_name,
          user: booking.user_full_name,
          originalPrice: originalPrice.toFixed(2),
          finalPrice: finalPrice.toFixed(2),
          finalDiscount: finalDiscount.toFixed(1),
          savings: savings.toFixed(2),
          savingsPercentage: ((savings / originalPrice) * 100).toFixed(1) + '%'
        });
        
        // Update booking in database
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            final_price: finalPrice,
            discount_percentage: finalDiscount,
            payment_status: 'pending',
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`❌ Error updating booking ${booking.id}:`, updateError);
          confirmResults.push({
            bookingId: booking.id,
            productName: booking.product_name,
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(`✅ Successfully confirmed booking ${booking.id}`);
          
          // Aggregate booking data by user for notifications
          if (!userNotifications.has(booking.user_id)) {
            userNotifications.set(booking.user_id, {
              userId: booking.user_id,
              userName: booking.user_full_name,
              bookings: [],
              totalOriginal: 0,
              totalFinal: 0,
              totalSavings: 0,
            });
          }
          
          const userData = userNotifications.get(booking.user_id)!;
          userData.bookings.push({
            productName: booking.product_name,
            originalPrice: originalPrice,
            finalPrice: finalPrice,
            savings: savings,
          });
          userData.totalOriginal += originalPrice;
          userData.totalFinal += finalPrice;
          userData.totalSavings += savings;
          
          confirmResults.push({
            bookingId: booking.id,
            productName: booking.product_name,
            userName: booking.user_full_name,
            success: true,
            originalPrice: originalPrice.toFixed(2),
            finalPrice: finalPrice.toFixed(2),
            savings: savings.toFixed(2),
            savingsPercentage: ((savings / originalPrice) * 100).toFixed(1) + '%',
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing booking ${booking.id}:`, error);
        confirmResults.push({
          bookingId: booking.id,
          productName: booking.product_name,
          success: false,
          error: error.message,
        });
      }
    }

    // Send ONE notification per user with aggregated data
    console.log(`\n📧 Sending notifications to ${userNotifications.size} users...`);
    for (const [userId, userData] of userNotifications) {
      try {
        // Build notification message with all products
        let message = `Il drop è terminato con uno sconto del ${Math.floor(finalDiscount)}%!\n\n`;
        message += `Hai prenotato ${userData.bookings.length} prodotto${userData.bookings.length > 1 ? 'i' : ''}:\n\n`;
        
        // List all products (limit to first 5 to avoid too long messages)
        const displayBookings = userData.bookings.slice(0, 5);
        for (const booking of displayBookings) {
          message += `• ${booking.productName}\n`;
          message += `  Prezzo originale: €${booking.originalPrice.toFixed(2)}\n`;
          message += `  Prezzo finale: €${booking.finalPrice.toFixed(2)}\n`;
          message += `  Risparmio: €${booking.savings.toFixed(2)}\n\n`;
        }
        
        if (userData.bookings.length > 5) {
          message += `... e altri ${userData.bookings.length - 5} prodotti\n\n`;
        }
        
        message += `TOTALE:\n`;
        message += `Prezzo originale: €${userData.totalOriginal.toFixed(2)}\n`;
        message += `Prezzo finale: €${userData.totalFinal.toFixed(2)}\n`;
        message += `Risparmio totale: €${userData.totalSavings.toFixed(2)} (${Math.floor((userData.totalSavings / userData.totalOriginal) * 100)}%)\n\n`;
        message += `Dovrai pagare €${userData.totalFinal.toFixed(2)} in contanti al momento del ritiro.\n\n`;
        message += `Ti notificheremo quando l'ordine sarà pronto per il ritiro!`;

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: `Drop Completato: ${drop.name}`,
            message: message,
            type: 'drop_completed',
            related_id: dropId,
            related_type: 'drop',
            read: false,
          });

        if (notifError) {
          console.error(`⚠️ Error creating notification for user ${userId}:`, notifError);
        } else {
          console.log(`📧 Notification sent to user ${userId} (${userData.userName}) for ${userData.bookings.length} bookings`);
        }
      } catch (error: any) {
        console.error(`❌ Error sending notification to user ${userId}:`, error);
      }
    }

    // Group bookings by supplier and pickup point to create orders
    console.log('\n📦 Creating orders...');
    const ordersBySupplier: OrdersBySupplier = {};
    
    for (const booking of enrichedBookings as BookingData[]) {
      const supplierId = booking.supplier_id;
      if (!supplierId) {
        console.warn(`⚠️ Booking ${booking.id} has no supplier_id, skipping order creation`);
        continue;
      }

      const pickupPointId = booking.pickup_point_id;
      const key = `${supplierId}_${pickupPointId}`;
      
      if (!ordersBySupplier[key]) {
        ordersBySupplier[key] = {
          supplier_id: supplierId,
          pickup_point_id: pickupPointId,
          bookings: [],
          total_value: 0,
        };
      }
      
      // Only add successfully confirmed bookings
      const confirmResult = confirmResults.find(r => r.bookingId === booking.id);
      if (confirmResult?.success) {
        ordersBySupplier[key].bookings.push(booking);
        const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
        ordersBySupplier[key].total_value += finalPrice;
      }
    }

    const ordersCreated = [];
    for (const [key, orderData] of Object.entries(ordersBySupplier)) {
      try {
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const commissionAmount = orderData.total_value * 0.05; // 5% commission

        console.log(`📝 Creating order ${orderNumber} for supplier ${orderData.supplier_id}`);

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            drop_id: dropId,
            supplier_id: orderData.supplier_id,
            pickup_point_id: orderData.pickup_point_id,
            status: 'confirmed',
            total_value: orderData.total_value,
            commission_amount: commissionAmount,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (orderError) {
          console.error(`❌ Error creating order:`, orderError);
          continue;
        }

        console.log(`✅ Order created: ${order.id}`);

        // Create order items with user_id
        const orderItems = orderData.bookings.map(booking => {
          const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
          return {
            order_id: order.id,
            booking_id: booking.id,
            product_id: booking.product_id,
            product_name: booking.product_name,
            user_id: booking.user_id, // Make sure user_id is included
            original_price: booking.original_price,
            final_price: finalPrice,
            discount_percentage: finalDiscount,
            selected_size: booking.selected_size,
            selected_color: booking.selected_color,
            pickup_status: 'pending',
            created_at: new Date().toISOString(),
          };
        });

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error(`❌ Error creating order items:`, itemsError);
        } else {
          console.log(`✅ Created ${orderItems.length} order items`);
        }

        ordersCreated.push({
          orderId: order.id,
          orderNumber: orderNumber,
          supplierId: orderData.supplier_id,
          pickupPointId: orderData.pickup_point_id,
          totalValue: orderData.total_value.toFixed(2),
          itemsCount: orderItems.length,
        });
      } catch (error: any) {
        console.error(`❌ Error creating order for supplier ${orderData.supplier_id}:`, error);
      }
    }

    // Update drop status to completed
    const { error: dropUpdateError } = await supabase
      .from('drops')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dropId);

    if (dropUpdateError) {
      console.error('❌ Error updating drop status:', dropUpdateError);
    } else {
      console.log('✅ Drop status updated to completed');
    }

    const successCount = confirmResults.filter(r => r.success).length;
    const failureCount = confirmResults.filter(r => !r.success).length;

    console.log(`\n📊 COMPLETION SUMMARY:`);
    console.log(`   ✅ Confirmed: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   💰 Total Original: €${totalOriginal.toFixed(2)}`);
    console.log(`   💳 Total Final (COD): €${totalFinal.toFixed(2)}`);
    console.log(`   🎉 Total Savings: €${totalSavings.toFixed(2)}`);
    console.log(`   📈 Average Savings: ${totalOriginal > 0 ? ((totalSavings / totalOriginal) * 100).toFixed(1) : '0'}%`);
    console.log(`   📦 Orders Created: ${ordersCreated.length}`);
    console.log(`   📧 Notifications Sent: ${userNotifications.size}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drop completion and order creation completed',
        dropId,
        dropName: drop.name,
        finalDiscount: finalDiscount.toFixed(1) + '%',
        summary: {
          totalBookings: enrichedBookings.length,
          confirmedCount: successCount,
          failedCount: failureCount,
          finalDiscount: finalDiscount.toFixed(1) + '%',
          totalAmount: totalFinal.toFixed(2),
          totalSavings: totalSavings.toFixed(2),
          ordersCreated: ordersCreated.length,
          notificationsSent: userNotifications.size,
        },
        results: confirmResults,
        orders: ordersCreated,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error in complete-drop:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'An unexpected error occurred',
        details: error?.toString() || 'No additional details available'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
