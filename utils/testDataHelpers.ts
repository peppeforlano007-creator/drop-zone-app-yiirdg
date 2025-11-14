
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Test Data Helpers
 * 
 * Functions to create comprehensive test data for development and testing
 */

export interface TestDataResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Create multiple test supplier users
 */
export async function createTestSuppliers(): Promise<TestDataResult> {
  try {
    const suppliers = [
      {
        email: 'fornitore.moda@example.com',
        password: 'TestSupplier123!',
        full_name: 'Fornitore Moda Italia',
        phone: '+39 02 1234567',
      },
      {
        email: 'fornitore.tech@example.com',
        password: 'TestSupplier123!',
        full_name: 'Fornitore Tech Store',
        phone: '+39 06 7654321',
      },
      {
        email: 'fornitore.sport@example.com',
        password: 'TestSupplier123!',
        full_name: 'Fornitore Sport & Outdoor',
        phone: '+39 011 9876543',
      },
    ];

    const createdSuppliers = [];

    for (const supplier of suppliers) {
      // Check if supplier already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', supplier.email)
        .single();

      if (existingProfile) {
        console.log(`Fornitore ${supplier.email} già esistente`);
        createdSuppliers.push(existingProfile);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: supplier.email,
        password: supplier.password,
        options: {
          data: {
            full_name: supplier.full_name,
            role: 'supplier',
            phone: supplier.phone,
          },
        },
      });

      if (authError) {
        console.error(`Errore creazione fornitore ${supplier.email}:`, authError);
        continue;
      }

      if (authData.user) {
        createdSuppliers.push({ user_id: authData.user.id, email: supplier.email });
      }
    }

    return {
      success: true,
      message: `${createdSuppliers.length} fornitori creati/trovati`,
      data: createdSuppliers,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella creazione dei fornitori',
      error,
    };
  }
}

/**
 * Create test supplier lists with products
 */
export async function createTestSupplierLists(): Promise<TestDataResult> {
  try {
    // Get supplier profiles
    const { data: suppliers } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .eq('role', 'supplier');

    if (!suppliers || suppliers.length === 0) {
      return {
        success: false,
        message: 'Nessun fornitore trovato. Crea prima i fornitori.',
      };
    }

    const lists = [
      // Lista 1 - Abbigliamento Moda
      {
        supplier_id: suppliers[0]?.user_id,
        name: 'Collezione Primavera/Estate 2024',
        min_discount: 30,
        max_discount: 70,
        min_reservation_value: 3000,
        max_reservation_value: 20000,
        products: [
          {
            name: 'Giacca in Pelle Premium',
            description: 'Giacca in pelle di alta qualità, perfetta per l\'inverno. Realizzata in vera pelle italiana con fodera interna.',
            image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
              'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800',
            ],
            original_price: 299.99,
            available_sizes: ['S', 'M', 'L', 'XL'],
            available_colors: ['Nero', 'Marrone'],
            condition: 'new',
            category: 'Abbigliamento',
            stock: 10,
          },
          {
            name: 'Jeans Slim Fit Premium',
            description: 'Jeans moderni con vestibilità slim, tessuto elasticizzato per il massimo comfort.',
            image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
              'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800',
            ],
            original_price: 89.99,
            available_sizes: ['28', '30', '32', '34', '36'],
            available_colors: ['Blu', 'Nero', 'Grigio'],
            condition: 'new',
            category: 'Abbigliamento',
            stock: 25,
          },
          {
            name: 'Camicia Elegante',
            description: 'Camicia elegante in cotone 100%, perfetta per occasioni formali.',
            image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
            ],
            original_price: 59.99,
            available_sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            available_colors: ['Bianco', 'Azzurro', 'Rosa'],
            condition: 'new',
            category: 'Abbigliamento',
            stock: 30,
          },
          {
            name: 'Vestito Elegante',
            description: 'Vestito elegante per occasioni speciali, tessuto di alta qualità.',
            image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
            ],
            original_price: 149.99,
            available_sizes: ['XS', 'S', 'M', 'L'],
            available_colors: ['Nero', 'Rosso', 'Blu'],
            condition: 'new',
            category: 'Abbigliamento',
            stock: 15,
          },
        ],
      },
      // Lista 2 - Calzature e Accessori
      {
        supplier_id: suppliers[0]?.user_id,
        name: 'Calzature & Accessori Premium',
        min_discount: 25,
        max_discount: 65,
        min_reservation_value: 4000,
        max_reservation_value: 25000,
        products: [
          {
            name: 'Sneakers Sportive Premium',
            description: 'Scarpe sportive comode e alla moda, suola ammortizzata per il massimo comfort.',
            image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
              'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
            ],
            original_price: 129.99,
            available_sizes: ['39', '40', '41', '42', '43', '44'],
            available_colors: ['Bianco', 'Nero', 'Rosso'],
            condition: 'new',
            category: 'Calzature',
            stock: 20,
          },
          {
            name: 'Stivali in Pelle',
            description: 'Stivali eleganti in vera pelle, perfetti per l\'inverno.',
            image_url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800',
            ],
            original_price: 189.99,
            available_sizes: ['37', '38', '39', '40', '41'],
            available_colors: ['Nero', 'Marrone'],
            condition: 'new',
            category: 'Calzature',
            stock: 12,
          },
          {
            name: 'Zaino da Viaggio Premium',
            description: 'Zaino capiente e resistente per viaggi e avventure, con scomparto laptop.',
            image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
              'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800',
            ],
            original_price: 89.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero', 'Grigio', 'Blu'],
            condition: 'new',
            category: 'Accessori',
            stock: 25,
          },
          {
            name: 'Orologio Elegante',
            description: 'Orologio da polso elegante con cinturino in pelle, movimento al quarzo.',
            image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
            ],
            original_price: 199.99,
            available_sizes: ['Unica'],
            available_colors: ['Argento', 'Oro', 'Nero'],
            condition: 'new',
            category: 'Accessori',
            stock: 18,
          },
          {
            name: 'Borsa a Tracolla',
            description: 'Borsa elegante in pelle sintetica, perfetta per ogni occasione.',
            image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
            ],
            original_price: 79.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero', 'Marrone', 'Beige'],
            condition: 'new',
            category: 'Accessori',
            stock: 22,
          },
        ],
      },
      // Lista 3 - Elettronica
      {
        supplier_id: suppliers[1]?.user_id,
        name: 'Elettronica & Gadget Tech',
        min_discount: 20,
        max_discount: 60,
        min_reservation_value: 5000,
        max_reservation_value: 30000,
        products: [
          {
            name: 'Cuffie Wireless Premium',
            description: 'Cuffie wireless con cancellazione del rumore, autonomia 30 ore.',
            image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            ],
            original_price: 149.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero', 'Bianco', 'Blu'],
            condition: 'new',
            category: 'Elettronica',
            stock: 15,
          },
          {
            name: 'Smartwatch Fitness',
            description: 'Smartwatch con monitoraggio fitness, GPS integrato e notifiche smartphone.',
            image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
            ],
            original_price: 199.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero', 'Argento', 'Oro'],
            condition: 'new',
            category: 'Elettronica',
            stock: 20,
          },
          {
            name: 'Power Bank 20000mAh',
            description: 'Batteria portatile ad alta capacità con ricarica rapida.',
            image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800',
            ],
            original_price: 39.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero', 'Bianco'],
            condition: 'new',
            category: 'Elettronica',
            stock: 30,
          },
          {
            name: 'Tastiera Meccanica RGB',
            description: 'Tastiera meccanica gaming con illuminazione RGB personalizzabile.',
            image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
            ],
            original_price: 89.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero'],
            condition: 'new',
            category: 'Elettronica',
            stock: 12,
          },
        ],
      },
      // Lista 4 - Sport & Outdoor
      {
        supplier_id: suppliers[2]?.user_id,
        name: 'Sport & Outdoor Collection',
        min_discount: 35,
        max_discount: 75,
        min_reservation_value: 3500,
        max_reservation_value: 22000,
        products: [
          {
            name: 'Tenda da Campeggio 4 Posti',
            description: 'Tenda impermeabile per 4 persone, facile da montare.',
            image_url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800',
            ],
            original_price: 159.99,
            available_sizes: ['Unica'],
            available_colors: ['Verde', 'Arancione'],
            condition: 'new',
            category: 'Sport & Outdoor',
            stock: 8,
          },
          {
            name: 'Bicicletta Mountain Bike',
            description: 'Mountain bike con telaio in alluminio, 21 velocità.',
            image_url: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800',
            ],
            original_price: 399.99,
            available_sizes: ['M', 'L'],
            available_colors: ['Nero', 'Rosso', 'Blu'],
            condition: 'new',
            category: 'Sport & Outdoor',
            stock: 10,
          },
          {
            name: 'Materassino Yoga Premium',
            description: 'Materassino yoga antiscivolo, spessore 6mm.',
            image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
            ],
            original_price: 34.99,
            available_sizes: ['Unica'],
            available_colors: ['Viola', 'Blu', 'Rosa'],
            condition: 'new',
            category: 'Sport & Outdoor',
            stock: 25,
          },
          {
            name: 'Set Pesi Palestra',
            description: 'Set completo di manubri regolabili da 2 a 20kg.',
            image_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
            ],
            original_price: 129.99,
            available_sizes: ['Unica'],
            available_colors: ['Nero'],
            condition: 'new',
            category: 'Sport & Outdoor',
            stock: 15,
          },
          {
            name: 'Scarpe da Running',
            description: 'Scarpe da corsa professionali con ammortizzazione avanzata.',
            image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
            additional_images: [
              'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
            ],
            original_price: 119.99,
            available_sizes: ['39', '40', '41', '42', '43', '44', '45'],
            available_colors: ['Nero', 'Bianco', 'Arancione'],
            condition: 'new',
            category: 'Sport & Outdoor',
            stock: 18,
          },
        ],
      },
    ];

    const createdLists = [];

    for (const listData of lists) {
      if (!listData.supplier_id) continue;

      // Create supplier list
      const { data: list, error: listError } = await supabase
        .from('supplier_lists')
        .insert({
          supplier_id: listData.supplier_id,
          name: listData.name,
          min_discount: listData.min_discount,
          max_discount: listData.max_discount,
          min_reservation_value: listData.min_reservation_value,
          max_reservation_value: listData.max_reservation_value,
          status: 'active',
        })
        .select()
        .single();

      if (listError) {
        console.error('Errore creazione lista:', listError);
        continue;
      }

      // Create products for this list
      const productsToInsert = listData.products.map(product => ({
        ...product,
        supplier_list_id: list.id,
        supplier_id: listData.supplier_id,
        status: 'active',
      }));

      const { data: products, error: productsError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select();

      if (productsError) {
        console.error('Errore creazione prodotti:', productsError);
        continue;
      }

      createdLists.push({
        list,
        productsCount: products?.length || 0,
      });
    }

    return {
      success: true,
      message: `${createdLists.length} liste create con successo`,
      data: createdLists,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore nella creazione delle liste',
      error,
    };
  }
}

/**
 * Create test drops (active and pending)
 */
export async function createTestDrops(): Promise<TestDataResult> {
  try {
    // Get pickup points
    const { data: pickupPoints } = await supabase
      .from('pickup_points')
      .select('id, name, city')
      .eq('status', 'active')
      .limit(3);

    if (!pickupPoints || pickupPoints.length === 0) {
      return {
        success: false,
        message: 'Nessun punto di ritiro trovato',
      };
    }

    // Get supplier lists
    const { data: supplierLists } = await supabase
      .from('supplier_lists')
      .select('id, name, min_discount, max_discount, min_reservation_value, max_reservation_value')
      .eq('status', 'active')
      .limit(3);

    if (!supplierLists || supplierLists.length === 0) {
      return {
        success: false,
        message: 'Nessuna lista fornitore trovata',
      };
    }

    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const drops = [
      // Drop attivo 1
      {
        supplier_list_id: supplierLists[0].id,
        pickup_point_id: pickupPoints[0].id,
        name: `Drop ${pickupPoints[0].city} - ${supplierLists[0].name}`,
        current_discount: supplierLists[0].min_discount,
        current_value: supplierLists[0].min_reservation_value * 0.6, // 60% del target
        target_value: supplierLists[0].max_reservation_value,
        status: 'active',
        start_time: now.toISOString(),
        end_time: fiveDaysFromNow.toISOString(),
        approved_at: now.toISOString(),
        activated_at: now.toISOString(),
      },
      // Drop attivo 2
      {
        supplier_list_id: supplierLists[1]?.id || supplierLists[0].id,
        pickup_point_id: pickupPoints[1]?.id || pickupPoints[0].id,
        name: `Drop ${pickupPoints[1]?.city || pickupPoints[0].city} - ${supplierLists[1]?.name || supplierLists[0].name}`,
        current_discount: (supplierLists[1]?.min_discount || supplierLists[0].min_discount) + 10,
        current_value: (supplierLists[1]?.min_reservation_value || supplierLists[0].min_reservation_value) * 0.8,
        target_value: supplierLists[1]?.max_reservation_value || supplierLists[0].max_reservation_value,
        status: 'active',
        start_time: now.toISOString(),
        end_time: fiveDaysFromNow.toISOString(),
        approved_at: now.toISOString(),
        activated_at: now.toISOString(),
      },
      // Drop in attesa di approvazione
      {
        supplier_list_id: supplierLists[2]?.id || supplierLists[0].id,
        pickup_point_id: pickupPoints[2]?.id || pickupPoints[0].id,
        name: `Drop ${pickupPoints[2]?.city || pickupPoints[0].city} - ${supplierLists[2]?.name || supplierLists[0].name}`,
        current_discount: supplierLists[2]?.min_discount || supplierLists[0].min_discount,
        current_value: (supplierLists[2]?.min_reservation_value || supplierLists[0].min_reservation_value) * 0.4,
        target_value: supplierLists[2]?.max_reservation_value || supplierLists[0].max_reservation_value,
        status: 'pending_approval',
        start_time: now.toISOString(),
        end_time: fiveDaysFromNow.toISOString(),
      },
    ];

    const { data: createdDrops, error: dropsError } = await supabase
      .from('drops')
      .insert(drops)
      .select();

    if (dropsError) {
      return {
        success: false,
        message: 'Errore nella creazione dei drop',
        error: dropsError,
      };
    }

    return {
      success: true,
      message: `${createdDrops.length} drop creati con successo`,
      data: createdDrops,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore imprevisto',
      error,
    };
  }
}

/**
 * Create complete test data (suppliers + lists + products + drops)
 */
export async function createCompleteTestData(): Promise<TestDataResult> {
  try {
    // Get current user (should be admin)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        message: 'Devi essere autenticato',
      };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return {
        success: false,
        message: 'Solo gli admin possono creare dati di test',
      };
    }

    // Check if test data already exists
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (existingProducts && existingProducts.length > 0) {
      return {
        success: true,
        message: 'Dati di test già presenti nel database. Elimina prima i dati esistenti se vuoi ricrearli.',
      };
    }

    // Step 1: Create suppliers
    console.log('Creazione fornitori...');
    const suppliersResult = await createTestSuppliers();
    if (!suppliersResult.success) {
      return suppliersResult;
    }

    // Step 2: Create supplier lists with products
    console.log('Creazione liste e prodotti...');
    const listsResult = await createTestSupplierLists();
    if (!listsResult.success) {
      return listsResult;
    }

    // Step 3: Create drops
    console.log('Creazione drop...');
    const dropsResult = await createTestDrops();
    if (!dropsResult.success) {
      return dropsResult;
    }

    return {
      success: true,
      message: `✅ Dati di test creati con successo!\n\n` +
        `• ${suppliersResult.data?.length || 0} fornitori\n` +
        `• ${listsResult.data?.length || 0} liste prodotti\n` +
        `• ${dropsResult.data?.length || 0} drop\n\n` +
        `Puoi ora testare l'app con dati realistici!`,
      data: {
        suppliers: suppliersResult.data,
        lists: listsResult.data,
        drops: dropsResult.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore imprevisto durante la creazione dei dati',
      error,
    };
  }
}

/**
 * Delete all test data
 */
export async function deleteAllTestData(): Promise<TestDataResult> {
  try {
    // Get current user (should be admin)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        message: 'Devi essere autenticato',
      };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return {
        success: false,
        message: 'Solo gli admin possono eliminare dati di test',
      };
    }

    let deletedCount = 0;

    // Delete bookings first (has foreign keys to drops and products)
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!bookingsError) {
      console.log('Prenotazioni eliminate');
      deletedCount++;
    }

    // Delete user interests
    const { error: interestsError } = await supabase
      .from('user_interests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!interestsError) {
      console.log('Interessi utente eliminati');
      deletedCount++;
    }

    // Delete drops
    const { error: dropsError } = await supabase
      .from('drops')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!dropsError) {
      console.log('Drop eliminati');
      deletedCount++;
    }

    // Delete products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!productsError) {
      console.log('Prodotti eliminati');
      deletedCount++;
    }

    // Delete supplier lists
    const { error: listsError } = await supabase
      .from('supplier_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!listsError) {
      console.log('Liste fornitori eliminate');
      deletedCount++;
    }

    return {
      success: true,
      message: `✅ Tutti i dati di test sono stati eliminati!\n\n${deletedCount} tabelle pulite con successo.`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore imprevisto durante l\'eliminazione',
      error,
    };
  }
}
