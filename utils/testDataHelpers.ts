
import { supabase } from '@/app/integrations/supabase/client';

/**
 * Test Data Helpers
 * 
 * Functions to create test data for development and testing
 */

export interface TestDataResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

/**
 * Create a test supplier user
 */
export async function createTestSupplier(): Promise<TestDataResult> {
  try {
    // Check if test supplier already exists
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'supplier.test@example.com')
      .single();

    if (existingProfiles) {
      return {
        success: true,
        message: 'Fornitore test già esistente',
        data: existingProfiles,
      };
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'supplier.test@example.com',
      password: 'TestSupplier123!',
      options: {
        data: {
          full_name: 'Fornitore Test',
          role: 'supplier',
        },
      },
    });

    if (authError) {
      return {
        success: false,
        message: 'Errore nella creazione del fornitore',
        error: authError,
      };
    }

    return {
      success: true,
      message: 'Fornitore test creato con successo',
      data: authData,
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
 * Create a test supplier list with products
 */
export async function createTestSupplierList(supplierId: string): Promise<TestDataResult> {
  try {
    // Create supplier list
    const { data: listData, error: listError } = await supabase
      .from('supplier_lists')
      .insert({
        supplier_id: supplierId,
        name: 'Lista Test - Abbigliamento',
        min_discount: 30,
        max_discount: 80,
        min_reservation_value: 5000,
        max_reservation_value: 30000,
        status: 'active',
      })
      .select()
      .single();

    if (listError) {
      return {
        success: false,
        message: 'Errore nella creazione della lista',
        error: listError,
      };
    }

    // Create test products
    const products = [
      {
        supplier_list_id: listData.id,
        supplier_id: supplierId,
        name: 'Giacca in Pelle Premium',
        description: 'Giacca in pelle di alta qualità, perfetta per l\'inverno',
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
        status: 'active',
      },
      {
        supplier_list_id: listData.id,
        supplier_id: supplierId,
        name: 'Sneakers Sportive',
        description: 'Scarpe sportive comode e alla moda',
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
        stock: 15,
        status: 'active',
      },
      {
        supplier_list_id: listData.id,
        supplier_id: supplierId,
        name: 'Zaino da Viaggio',
        description: 'Zaino capiente e resistente per viaggi e avventure',
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
        stock: 20,
        status: 'active',
      },
      {
        supplier_list_id: listData.id,
        supplier_id: supplierId,
        name: 'Orologio Elegante',
        description: 'Orologio da polso elegante con cinturino in pelle',
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
        stock: 8,
        status: 'active',
      },
      {
        supplier_list_id: listData.id,
        supplier_id: supplierId,
        name: 'Jeans Slim Fit',
        description: 'Jeans moderni con vestibilità slim',
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
        additional_images: [
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
          'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800',
        ],
        original_price: 79.99,
        available_sizes: ['28', '30', '32', '34', '36'],
        available_colors: ['Blu', 'Nero', 'Grigio'],
        condition: 'new',
        category: 'Abbigliamento',
        stock: 25,
        status: 'active',
      },
    ];

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (productsError) {
      return {
        success: false,
        message: 'Errore nella creazione dei prodotti',
        error: productsError,
      };
    }

    return {
      success: true,
      message: `Lista creata con successo con ${productsData.length} prodotti`,
      data: { list: listData, products: productsData },
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
 * Create complete test data (supplier + list + products)
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
        message: 'Dati di test già presenti nel database',
      };
    }

    // Create test supplier
    const supplierResult = await createTestSupplier();
    if (!supplierResult.success) {
      return supplierResult;
    }

    // Get supplier ID
    const { data: supplierProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', 'supplier.test@example.com')
      .single();

    if (!supplierProfile) {
      return {
        success: false,
        message: 'Impossibile trovare il profilo del fornitore',
      };
    }

    // Create supplier list with products
    const listResult = await createTestSupplierList(supplierProfile.user_id);
    
    return listResult;
  } catch (error) {
    return {
      success: false,
      message: 'Errore imprevisto',
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

    // Delete products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (productsError) {
      console.error('Error deleting products:', productsError);
    }

    // Delete supplier lists
    const { error: listsError } = await supabase
      .from('supplier_lists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (listsError) {
      console.error('Error deleting supplier lists:', listsError);
    }

    // Delete user interests
    const { error: interestsError } = await supabase
      .from('user_interests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (interestsError) {
      console.error('Error deleting user interests:', interestsError);
    }

    return {
      success: true,
      message: 'Tutti i dati di test sono stati eliminati',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Errore imprevisto',
      error,
    };
  }
}
