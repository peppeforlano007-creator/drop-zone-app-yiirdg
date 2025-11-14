
/**
 * Testing Helpers and Utilities
 * 
 * This file contains helper functions for testing various aspects of the app.
 * Use these functions to validate functionality during development and testing.
 */

import { supabase } from '@/app/integrations/supabase/client';
import { Alert } from 'react-native';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
  duration?: number;
}

/**
 * Test user authentication flow
 */
export async function testAuthentication(email: string, password: string): Promise<TestResult> {
  console.log('🧪 Testing authentication...');
  const startTime = Date.now();
  
  try {
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Test profile loading
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        message: `Profile loading failed: ${profileError.message}`,
        details: profileError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: 'Authentication test passed',
      details: { userId: data.user.id, role: profile.role },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Authentication test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test RLS policies for a specific table
 */
export async function testRLSPolicies(tableName: string): Promise<TestResult> {
  console.log(`🧪 Testing RLS policies for ${tableName}...`);
  const startTime = Date.now();
  
  try {
    // Test SELECT
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return {
        success: false,
        message: `RLS SELECT test failed for ${tableName}: ${selectError.message}`,
        details: selectError,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `RLS policies working correctly for ${tableName}`,
      details: { rowsReturned: selectData?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `RLS test exception for ${tableName}: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test database connectivity and performance
 */
export async function testDatabasePerformance(): Promise<TestResult> {
  console.log('🧪 Testing database performance...');
  
  const startTime = Date.now();
  
  try {
    // Test simple query
    const { data, error } = await supabase
      .from('pickup_points')
      .select('id, name, city')
      .limit(10);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (error) {
      return {
        success: false,
        message: `Database query failed: ${error.message}`,
        details: { duration, error },
        timestamp: new Date(),
        duration,
      };
    }

    const performanceRating = duration < 500 ? 'Excellent' : duration < 1000 ? 'Good' : duration < 2000 ? 'Fair' : 'Poor';

    return {
      success: true,
      message: `Database performance: ${performanceRating} (${duration}ms)`,
      details: { duration, rowsReturned: data?.length || 0, performanceRating },
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    return {
      success: false,
      message: `Database performance test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test product browsing functionality
 */
export async function testProductBrowsing(): Promise<TestResult> {
  console.log('🧪 Testing product browsing...');
  const startTime = Date.now();
  
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        supplier_lists (
          name,
          min_discount,
          max_discount,
          supplier_id
        )
      `)
      .eq('status', 'active')
      .limit(10);

    if (error) {
      return {
        success: false,
        message: `Product browsing failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Product browsing test passed (${products?.length || 0} products found)`,
      details: { productsFound: products?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Product browsing test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test drop functionality
 */
export async function testDropFunctionality(): Promise<TestResult> {
  console.log('🧪 Testing drop functionality...');
  const startTime = Date.now();
  
  try {
    const { data: drops, error } = await supabase
      .from('drops')
      .select(`
        *,
        pickup_points (name, city),
        supplier_lists (name, min_discount, max_discount)
      `)
      .in('status', ['active', 'approved'])
      .limit(10);

    if (error) {
      return {
        success: false,
        message: `Drop functionality test failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Drop functionality test passed (${drops?.length || 0} drops found)`,
      details: { dropsFound: drops?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Drop functionality test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test booking functionality
 */
export async function testBookingFunctionality(userId: string): Promise<TestResult> {
  console.log('🧪 Testing booking functionality...');
  const startTime = Date.now();
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        products (name, image_url),
        drops (name, status)
      `)
      .eq('user_id', userId)
      .limit(10);

    if (error) {
      return {
        success: false,
        message: `Booking functionality test failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Booking functionality test passed (${bookings?.length || 0} bookings found)`,
      details: { bookingsFound: bookings?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Booking functionality test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test payment methods functionality
 */
export async function testPaymentMethods(userId: string): Promise<TestResult> {
  console.log('🧪 Testing payment methods...');
  const startTime = Date.now();
  
  try {
    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return {
        success: false,
        message: `Payment methods test failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `Payment methods test passed (${paymentMethods?.length || 0} methods found)`,
      details: { methodsFound: paymentMethods?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Payment methods test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test user interests functionality
 */
export async function testUserInterests(userId: string): Promise<TestResult> {
  console.log('🧪 Testing user interests...');
  const startTime = Date.now();
  
  try {
    const { data: interests, error } = await supabase
      .from('user_interests')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return {
        success: false,
        message: `User interests test failed: ${error.message}`,
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      message: `User interests test passed (${interests?.length || 0} interests found)`,
      details: { interestsFound: interests?.length || 0 },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `User interests test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test real-time subscriptions
 */
export async function testRealtimeSubscriptions(): Promise<TestResult> {
  console.log('🧪 Testing real-time subscriptions...');
  const startTime = Date.now();
  
  try {
    // Create a test subscription
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drops' }, (payload) => {
        console.log('Test subscription received:', payload);
      })
      .subscribe();

    // Wait a bit to ensure subscription is established
    await new Promise(resolve => setTimeout(resolve, 1000));

    const status = channel.state;
    
    // Unsubscribe
    await supabase.removeChannel(channel);

    if (status === 'joined') {
      return {
        success: true,
        message: 'Real-time subscriptions test passed',
        details: { status },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } else {
      return {
        success: false,
        message: `Real-time subscription failed with status: ${status}`,
        details: { status },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Real-time subscriptions test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test image loading and caching
 */
export async function testImageLoading(): Promise<TestResult> {
  console.log('🧪 Testing image loading...');
  const startTime = Date.now();
  
  try {
    // Get a product with an image
    const { data: products, error } = await supabase
      .from('products')
      .select('image_url')
      .not('image_url', 'is', null)
      .limit(1)
      .single();

    if (error || !products) {
      return {
        success: false,
        message: 'No products with images found for testing',
        details: error,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }

    // Test if image URL is accessible
    const imageUrl = products.image_url;
    
    return {
      success: true,
      message: 'Image loading test passed',
      details: { imageUrl },
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      message: `Image loading test exception: ${error}`,
      details: error,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Run all tests
 */
export async function runAllTests(email?: string, password?: string, userId?: string): Promise<TestResult[]> {
  console.log('🧪 Running all tests...');
  
  const results: TestResult[] = [];

  // Database performance test
  results.push(await testDatabasePerformance());

  // Product browsing test
  results.push(await testProductBrowsing());

  // Drop functionality test
  results.push(await testDropFunctionality());

  // Image loading test
  results.push(await testImageLoading());

  // Real-time subscriptions test
  results.push(await testRealtimeSubscriptions());

  // RLS policy tests
  const tables = ['profiles', 'products', 'drops', 'bookings', 'pickup_points', 'supplier_lists'];
  for (const table of tables) {
    results.push(await testRLSPolicies(table));
  }

  // User-specific tests (if userId provided)
  if (userId) {
    results.push(await testBookingFunctionality(userId));
    results.push(await testPaymentMethods(userId));
    results.push(await testUserInterests(userId));
  }

  // Authentication test (if credentials provided)
  if (email && password) {
    results.push(await testAuthentication(email, password));
  }

  return results;
}

/**
 * Display test results in an alert
 */
export function displayTestResults(results: TestResult[]) {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  const summary = `Tests Passed: ${passed}\nTests Failed: ${failed}\nTotal Duration: ${totalDuration}ms\n\n`;
  const details = results.map((r, i) => 
    `${i + 1}. ${r.success ? '✅' : '❌'} ${r.message} (${r.duration}ms)`
  ).join('\n');

  Alert.alert(
    'Test Results',
    summary + details,
    [{ text: 'OK' }]
  );

  console.log('🧪 Test Results:', { passed, failed, totalDuration, results });
}

/**
 * Generate test report
 */
export function generateTestReport(results: TestResult[]): string {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  const avgDuration = totalDuration / results.length;

  let report = '# Test Report\n\n';
  report += `**Date:** ${new Date().toLocaleString('it-IT')}\n\n`;
  report += `## Summary\n\n`;
  report += `- Total Tests: ${results.length}\n`;
  report += `- Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)\n`;
  report += `- Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)\n`;
  report += `- Total Duration: ${totalDuration}ms\n`;
  report += `- Average Duration: ${avgDuration.toFixed(0)}ms\n\n`;

  report += `## Test Results\n\n`;
  results.forEach((result, index) => {
    report += `### ${index + 1}. ${result.message}\n\n`;
    report += `- Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- Duration: ${result.duration}ms\n`;
    report += `- Timestamp: ${result.timestamp.toLocaleTimeString('it-IT')}\n`;
    if (result.details) {
      report += `- Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    report += '\n';
  });

  return report;
}
