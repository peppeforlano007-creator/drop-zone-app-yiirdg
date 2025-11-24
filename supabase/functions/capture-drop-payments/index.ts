
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
/* eslint-enable import/no-unresolved */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DropPaymentCaptureRequest {
  dropId: string;
}

interface BookingData {
  id: string;
  user_id: string;
  product_id: string;
  original_price: number;
  authorized_amount: number;
  discount_percentage: number;
  payment_status: string;
  payment_intent_id?: string;
  products: {
    name: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    let stripe: Stripe | null = null;
    
    if (stripeSecretKey) {
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
        httpClient: Stripe.createFetchHttpClient(),
      });
      console.log('✅ Stripe initialized successfully');
    } else {
      console.warn('⚠️ STRIPE_SECRET_KEY not found - running in simulation mode');
    }

    const { dropId } = await req.json() as DropPaymentCaptureRequest;

    if (!dropId) {
      return new Response(
        JSON.stringify({ error: 'dropId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Starting payment capture for drop:', dropId);

    // Get drop details
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .select(`
        id,
        name,
        current_discount,
        status,
        supplier_lists (
          min_discount,
          max_discount
        )
      `)
      .eq('id', dropId)
      .single();

    if (dropError || !drop) {
      console.error('❌ Error fetching drop:', dropError);
      return new Response(
        JSON.stringify({ error: 'Drop not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Drop "${drop.name}" - Final discount: ${drop.current_discount}%`);

    // Get all authorized bookings for this drop
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        product_id,
        original_price,
        authorized_amount,
        discount_percentage,
        payment_status,
        payment_intent_id,
        products (
          name
        )
      `)
      .eq('drop_id', dropId)
      .eq('payment_status', 'authorized');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('ℹ️ No authorized bookings found for drop:', dropId);
      return new Response(
        JSON.stringify({ 
          message: 'No authorized bookings to capture',
          capturedCount: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${bookings.length} bookings to capture`);

    // Calculate final prices and update bookings
    const finalDiscount = drop.current_discount;
    const captureResults = [];
    let totalAuthorized = 0;
    let totalCharged = 0;
    let totalSavings = 0;

    for (const booking of bookings as BookingData[]) {
      try {
        // Calcola il prezzo finale in base allo sconto finale raggiunto
        const finalPrice = Number(booking.original_price) * (1 - finalDiscount / 100);
        const authorizedAmount = Number(booking.authorized_amount);
        const savings = authorizedAmount - finalPrice;

        totalAuthorized += authorizedAmount;
        totalCharged += finalPrice;
        totalSavings += savings;

        console.log(`💳 Booking ${booking.id}:`, {
          product: booking.products.name,
          originalPrice: booking.original_price,
          authorizedAmount: authorizedAmount.toFixed(2),
          finalPrice: finalPrice.toFixed(2),
          finalDiscount: finalDiscount.toFixed(1),
          savings: savings.toFixed(2),
          savingsPercentage: ((savings / authorizedAmount) * 100).toFixed(1) + '%'
        });

        // Capture payment with Stripe if available and payment_intent_id exists
        let stripeCaptured = false;
        let stripeError = null;

        if (stripe && booking.payment_intent_id) {
          try {
            console.log(`🔄 Capturing Stripe payment intent: ${booking.payment_intent_id}`);
            
            const paymentIntent = await stripe.paymentIntents.capture(
              booking.payment_intent_id,
              {
                amount_to_capture: Math.round(finalPrice * 100), // Amount in cents
              }
            );
            
            console.log(`✅ Stripe payment captured successfully:`, {
              id: paymentIntent.id,
              amount: paymentIntent.amount_received / 100,
              status: paymentIntent.status,
            });
            
            stripeCaptured = true;
          } catch (error: any) {
            console.error(`❌ Stripe capture error for booking ${booking.id}:`, error.message);
            stripeError = error.message;
            
            // If Stripe capture fails, we still update the booking but mark it as failed
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                payment_status: 'failed',
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.id);

            if (updateError) {
              console.error(`❌ Error updating failed booking ${booking.id}:`, updateError);
            }

            captureResults.push({
              bookingId: booking.id,
              productName: booking.products.name,
              success: false,
              error: `Stripe capture failed: ${stripeError}`,
            });
            
            continue; // Skip to next booking
          }
        } else if (!booking.payment_intent_id) {
          console.warn(`⚠️ No payment_intent_id for booking ${booking.id} - simulating capture`);
        } else {
          console.warn(`⚠️ Stripe not initialized - simulating capture for booking ${booking.id}`);
        }
        
        // Update booking in database
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            final_price: finalPrice,
            discount_percentage: finalDiscount,
            payment_status: 'captured',
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`❌ Error updating booking ${booking.id}:`, updateError);
          captureResults.push({
            bookingId: booking.id,
            productName: booking.products.name,
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(`✅ Successfully captured payment for booking ${booking.id}`);
          captureResults.push({
            bookingId: booking.id,
            productName: booking.products.name,
            success: true,
            stripeCaptured,
            authorizedAmount: authorizedAmount.toFixed(2),
            finalPrice: finalPrice.toFixed(2),
            savings: savings.toFixed(2),
            savingsPercentage: ((savings / authorizedAmount) * 100).toFixed(1) + '%',
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing booking ${booking.id}:`, error);
        captureResults.push({
          bookingId: booking.id,
          productName: booking.products?.name || 'Unknown',
          success: false,
          error: error.message,
        });
      }
    }

    // Update drop status to completed
    const { error: dropUpdateError } = await supabase
      .from('drops')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dropId);

    if (dropUpdateError) {
      console.error('❌ Error updating drop status:', dropUpdateError);
    } else {
      console.log('✅ Drop status updated to completed');
    }

    const successCount = captureResults.filter(r => r.success).length;
    const failureCount = captureResults.filter(r => !r.success).length;
    const stripeCount = captureResults.filter(r => r.success && r.stripeCaptured).length;

    console.log(`\n📊 CAPTURE SUMMARY:`);
    console.log(`   ✅ Succeeded: ${successCount}`);
    console.log(`   💳 Stripe Captured: ${stripeCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   💰 Total Authorized: €${totalAuthorized.toFixed(2)}`);
    console.log(`   💳 Total Charged: €${totalCharged.toFixed(2)}`);
    console.log(`   🎉 Total Savings: €${totalSavings.toFixed(2)}`);
    console.log(`   📈 Average Savings: ${((totalSavings / totalAuthorized) * 100).toFixed(1)}%\n`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment capture completed',
        dropId,
        dropName: drop.name,
        finalDiscount: finalDiscount.toFixed(1) + '%',
        stripeEnabled: !!stripe,
        summary: {
          totalBookings: bookings.length,
          capturedCount: successCount,
          stripeCapturedCount: stripeCount,
          failedCount: failureCount,
          totalAuthorized: totalAuthorized.toFixed(2),
          totalCharged: totalCharged.toFixed(2),
          totalSavings: totalSavings.toFixed(2),
          averageSavingsPercentage: ((totalSavings / totalAuthorized) * 100).toFixed(1) + '%',
        },
        results: captureResults,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in capture-drop-payments:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
