
/**
 * Supplier Import and Management Test Helpers
 * 
 * Tests for supplier list import functionality
 */

import { supabase } from '@/app/integrations/supabase/client';
import { TestResult } from './testHelpers';
import { ProductCondition } from '@/types/Product';

export interface SupplierListData {
  name: string;
  minDiscount: number;
  maxDiscount: number;
  minReservationValue: number;
  maxReservationValue: number;
  products: ProductData[];
}

export interface ProductData {
  name: string;
  description?: string;
  imageUrl: string;
  originalPrice: number;
  availableSizes?: string[];
  availableColors?: string[];
  condition: ProductCondition;
  category?: string;
  stock?: number;
}

/**
 * Test supplier list creation
 */
export async function testSupplierListCreation(
  supplierId: string,
  listData: SupplierListData
): Promise<TestResult> {
  console.log('🧪 Testing supplier list creation...');
  const startTime = Date.now();

  try {
    // Validate input data
    if (listData.minDiscount >= listData.maxDiscount) {
      return {
        success: false,
        message: 'Min discount must be less than max discount',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    if (listData.minReservationValue >= listData.maxReservationValue) {
      return {
        success: false,
        message: 'Min reservation value must be less than max reservation value',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    if (listData.products.length === 0) {
      return {
        success: false,
        message: 'At least one product is required',
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Create supplier list
    const { data: supplierList, error: listError } = await supabase
      .from('supplier_lists')
      .insert({
        supplier_id: supplierId,
        name: listData.name,
        min_discount: listData.minDiscount,
        max_discount: listData.maxDiscount,
        min_reservation_value: listData.minReservationValue,
        max_reservation_value: listData.maxReservationValue,
        status: 'active',
      })
      .select()
      .single();

    if (listError) {
      return {
        success: false,
        message: `Failed to create supplier list: ${listError.message}`,
        details: listError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Create products
    const productsToInsert = listData.products.map(product => ({
      supplier_list_id: supplierList.id,
      supplier_id: supplierId,
      name: product.name,
      description: product.description || '',
      image_url: product.imageUrl,
      original_price: product.originalPrice,
      available_sizes: product.availableSizes || [],
      available_colors: product.availableColors || [],
      condition: product.condition,
      category: product.category || 'Generale',
      stock: product.stock || 1,
      status: 'active',
    }));

    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (productsError) {
      // Rollback: delete the supplier list
      await supabase.from('supplier_lists').delete().eq('id', supplierList.id);

      return {
        success: false,
        message: `Failed to create products: ${productsError.message}`,
        details: productsError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Supplier list created successfully with ${products?.length || 0} products`,
      details: {
        listId: supplierList.id,
        listName: supplierList.name,
        productsCount: products?.length || 0,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Supplier list creation test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test supplier list validation
 */
export async function testSupplierListValidation(): Promise<TestResult> {
  console.log('🧪 Testing supplier list validation...');
  const startTime = Date.now();

  try {
    const testCases = [
      {
        name: 'Invalid discount range',
        data: {
          minDiscount: 80,
          maxDiscount: 30,
          minReservationValue: 5000,
          maxReservationValue: 30000,
        },
        shouldFail: true,
      },
      {
        name: 'Invalid reservation value range',
        data: {
          minDiscount: 30,
          maxDiscount: 80,
          minReservationValue: 30000,
          maxReservationValue: 5000,
        },
        shouldFail: true,
      },
      {
        name: 'Valid ranges',
        data: {
          minDiscount: 30,
          maxDiscount: 80,
          minReservationValue: 5000,
          maxReservationValue: 30000,
        },
        shouldFail: false,
      },
    ];

    const results = testCases.map(testCase => {
      const isValid =
        testCase.data.minDiscount < testCase.data.maxDiscount &&
        testCase.data.minReservationValue < testCase.data.maxReservationValue;

      const passed = testCase.shouldFail ? !isValid : isValid;

      return {
        testCase: testCase.name,
        passed,
      };
    });

    const allPassed = results.every(r => r.passed);

    return {
      success: allPassed,
      message: allPassed
        ? 'All validation tests passed'
        : 'Some validation tests failed',
      details: results,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Validation test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test Excel file parsing
 */
export async function testExcelParsing(): Promise<TestResult> {
  console.log('🧪 Testing Excel parsing...');
  const startTime = Date.now();

  try {
    // Test data that simulates parsed Excel data
    const mockExcelData = [
      {
        nome: 'Giacca in Pelle',
        descrizione: 'Giacca in pelle di alta qualità',
        foto: 'https://example.com/jacket.jpg',
        prezzoListino: 450,
        taglie: 'S, M, L, XL',
        colori: 'Nero, Marrone',
        condizione: 'nuovo',
        categoria: 'Abbigliamento',
        stock: 10,
      },
      {
        nome: 'Scarpe da Ginnastica',
        foto: 'https://example.com/shoes.jpg',
        prezzoListino: 120,
        taglie: '40, 41, 42, 43',
        colori: 'Bianco, Nero',
        condizione: 'reso da cliente',
        stock: 5,
      },
    ];

    // Parse and validate
    const parsedProducts = mockExcelData.map((row, index) => {
      // Normalize condition
      let condition: ProductCondition = 'nuovo';
      const conditionValue = String(row.condizione || '').toLowerCase().trim();

      if (conditionValue.includes('reso') || conditionValue.includes('cliente')) {
        condition = 'reso da cliente';
      } else if (conditionValue.includes('packaging') || conditionValue.includes('rovinato')) {
        condition = 'packaging rovinato';
      }

      return {
        name: row.nome || `Prodotto ${index + 1}`,
        description: row.descrizione || '',
        imageUrl: row.foto || '',
        originalPrice: parseFloat(String(row.prezzoListino || 0)),
        availableSizes: row.taglie ? row.taglie.split(',').map((s: string) => s.trim()) : [],
        availableColors: row.colori ? row.colori.split(',').map((c: string) => c.trim()) : [],
        condition,
        category: row.categoria || 'Generale',
        stock: parseInt(String(row.stock || 1)),
      };
    });

    // Validate parsed data
    const validationErrors: string[] = [];

    parsedProducts.forEach((product, index) => {
      if (!product.name) {
        validationErrors.push(`Product ${index + 1}: Missing name`);
      }
      if (!product.imageUrl) {
        validationErrors.push(`Product ${index + 1}: Missing image URL`);
      }
      if (product.originalPrice <= 0) {
        validationErrors.push(`Product ${index + 1}: Invalid price`);
      }
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Excel parsing validation failed',
        details: { errors: validationErrors },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Excel parsing test passed (${parsedProducts.length} products parsed)`,
      details: { productsCount: parsedProducts.length, products: parsedProducts },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Excel parsing test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test product stock management
 */
export async function testProductStockManagement(productId: string): Promise<TestResult> {
  console.log('🧪 Testing product stock management...');
  const startTime = Date.now();

  try {
    // Get current stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, status')
      .eq('id', productId)
      .single();

    if (fetchError) {
      return {
        success: false,
        message: `Failed to fetch product: ${fetchError.message}`,
        details: fetchError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    const originalStock = product.stock || 0;

    // Test stock decrement
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: originalStock - 1 })
      .eq('id', productId);

    if (updateError) {
      return {
        success: false,
        message: `Failed to update stock: ${updateError.message}`,
        details: updateError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Verify update
    const { data: updatedProduct, error: verifyError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();

    if (verifyError) {
      return {
        success: false,
        message: `Failed to verify stock update: ${verifyError.message}`,
        details: verifyError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Restore original stock
    await supabase
      .from('products')
      .update({ stock: originalStock })
      .eq('id', productId);

    const stockDecremented = updatedProduct.stock === originalStock - 1;

    return {
      success: stockDecremented,
      message: stockDecremented
        ? 'Stock management test passed'
        : 'Stock was not decremented correctly',
      details: {
        originalStock,
        updatedStock: updatedProduct.stock,
        expected: originalStock - 1,
      },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Stock management test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}
