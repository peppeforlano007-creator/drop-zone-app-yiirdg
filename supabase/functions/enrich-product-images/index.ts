import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildAmazonImageUrl(asin: string): string {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin.trim()}.jpg`
}

async function fetchImageFromEan(ean: string): Promise<string | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`)
    if (!response.ok) return null
    const data = await response.json()
    if (data.status === 1 && data.product?.image_url) {
      return data.product.image_url
    }
    return null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { list_id } = await req.json()

    if (!list_id) {
      return new Response(
        JSON.stringify({ error: 'list_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all products in the list that have no image or empty image
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, asin, ean, image_url')
      .eq('supplier_list_id', list_id)
      .or('image_url.is.null,image_url.eq.')

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nessun prodotto da arricchire', updated: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updated = 0
    let skipped = 0

    for (const product of products) {
      let imageUrl: string | null = null

      // Priority 1: ASIN → Amazon image URL
      if (product.asin) {
        imageUrl = buildAmazonImageUrl(product.asin)
      }
      // Priority 2: EAN → Open Food Facts
      else if (product.ean) {
        imageUrl = await fetchImageFromEan(product.ean)
      }

      if (imageUrl) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', product.id)

        if (!updateError) {
          updated++
        }
      } else {
        skipped++
      }
    }

    return new Response(
      JSON.stringify({
        message: `Arricchimento completato`,
        updated,
        skipped,
        total: products.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
