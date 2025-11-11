
import { useEffect } from 'react';
import { usePayment } from '@/contexts/PaymentContext';
import { mockDrops, mockProducts } from '@/data/mockData';
import { Alert } from 'react-native';

/**
 * Hook to automatically capture payments when drops end
 * In a production app, this would be handled by a backend service
 */
export function useDropPaymentCapture() {
  const { authorizations, capturePayment } = usePayment();

  useEffect(() => {
    const checkAndCapturePayments = async () => {
      const now = Date.now();

      // Find all authorized payments for drops that have ended
      const paymentsToCapture = authorizations.filter(auth => {
        if (auth.status !== 'authorized') return false;

        // Find the product and its drop
        const product = mockProducts.find(p => p.id === auth.productId);
        if (!product) return false;

        const drop = mockDrops.find(d => 
          d.products.some(p => p.id === product.id)
        );
        if (!drop) return false;

        // Check if drop has ended
        return drop.endTime.getTime() < now;
      });

      // Capture each payment
      for (const auth of paymentsToCapture) {
        const product = mockProducts.find(p => p.id === auth.productId);
        const drop = mockDrops.find(d => 
          d.products.some(p => p.id === auth.productId)
        );

        if (product && drop) {
          const finalDiscount = drop.currentDiscount;
          const finalAmount = product.originalPrice * (1 - finalDiscount / 100);

          try {
            await capturePayment(auth.id, finalAmount, finalDiscount);
            console.log(`Payment captured for ${product.name}: €${finalAmount.toFixed(2)} (-${finalDiscount}%)`);
            
            // In a real app, you would show a notification to the user
            // For now, we'll just log it
          } catch (error) {
            console.error('Failed to capture payment:', error);
          }
        }
      }
    };

    // Check immediately
    checkAndCapturePayments();

    // Check every minute
    const interval = setInterval(checkAndCapturePayments, 60000);

    return () => clearInterval(interval);
  }, [authorizations, capturePayment]);
}
