
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
  products: {
    name: string;
    supplier_id: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

interface OrdersBySupplier {
  [supplierId: string]: {
    supplier_id: string;
    pickup_point_id: string;
    bookings: BookingData[];
    total_value: number;
  };
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

    // Get all active bookings for this drop (COD payment method)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        product_id,
        original_price,
        discount_percentage,
        payment_status,
        pickup_point_id,
        selected_size,
        selected_color,
        products (
          name,
          supplier_id
        ),
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('drop_id', dropId)
      .eq('status', 'active')
      .eq('payment_method', 'cod');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch bookings' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
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

    console.log(`📦 Found ${bookings.length} bookings to confirm`);

    // Calculate final prices and confirm bookings
    const finalDiscount = drop.current_discount || 0;
    const confirmResults = [];
    let totalOriginal = 0;
    let totalFinal = 0;
    let totalSavings = 0;

    for (const booking of bookings as BookingData[]) {
      try {
        // Calculate final price based on final discount
        const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
        const originalPrice = Number(booking.original_price);
        const savings = originalPrice - finalPrice;

        totalOriginal += originalPrice;
        totalFinal += finalPrice;
        totalSavings += savings;

        console.log(`💰 Booking ${booking.id}:`, {
          product: booking.products?.name || 'Unknown',
          user: booking.profiles?.full_name || 'Unknown',
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
            productName: booking.products?.name || 'Unknown',
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(`✅ Successfully confirmed booking ${booking.id}`);
          
          // Create notification for user
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: booking.user_id,
              title: `Drop Completato: ${drop.name}`,
              message: `Il drop è terminato con uno sconto del ${Math.floor(finalDiscount)}%!\n\n` +
                      `Prodotto: ${booking.products?.name || 'Unknown'}\n` +
                      `Prezzo originale: €${originalPrice.toFixed(2)}\n` +
                      `Prezzo finale: €${finalPrice.toFixed(2)}\n` +
                      `Risparmio: €${savings.toFixed(2)} (${Math.floor((savings / originalPrice) * 100)}%)\n\n` +
                      `Dovrai pagare €${finalPrice.toFixed(2)} in contanti al momento del ritiro.\n\n` +
                      `Ti notificheremo quando l'ordine sarà pronto per il ritiro!`,
              type: 'drop_completed',
              related_id: dropId,
              related_type: 'drop',
              read: false,
            });

          if (notifError) {
            console.error(`⚠️ Error creating notification for user ${booking.user_id}:`, notifError);
          } else {
            console.log(`📧 Notification sent to user ${booking.user_id}`);
          }
          
          confirmResults.push({
            bookingId: booking.id,
            productName: booking.products?.name || 'Unknown',
            userName: booking.profiles?.full_name || 'Unknown',
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
          productName: booking.products?.name || 'Unknown',
          success: false,
          error: error.message,
        });
      }
    }

    // Group bookings by supplier and pickup point to create orders
    console.log('\n📦 Creating orders...');
    const ordersBySupplier: OrdersBySupplier = {};
    
    for (const booking of bookings as BookingData[]) {
      const supplierId = booking.products?.supplier_id;
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

        // Create order items
        const orderItems = orderData.bookings.map(booking => {
          const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
          return {
            order_id: order.id,
            booking_id: booking.id,
            product_id: booking.product_id,
            product_name: booking.products?.name || 'Unknown',
            user_id: booking.user_id,
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
    console.log(`   📦 Orders Created: ${ordersCreated.length}\n`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Drop completion and order creation completed',
        dropId,
        dropName: drop.name,
        finalDiscount: finalDiscount.toFixed(1) + '%',
        summary: {
          totalBookings: bookings.length,
          confirmedCount: successCount,
          failedCount: failureCount,
          finalDiscount: finalDiscount.toFixed(1) + '%',
          totalAmount: totalFinal.toFixed(2),
          totalSavings: totalSavings.toFixed(2),
          ordersCreated: ordersCreated.length,
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
