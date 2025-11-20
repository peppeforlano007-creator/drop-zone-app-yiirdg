
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function PickupPointLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect if not a pickup point user
    if (!loading && (!user || user.role !== 'pickup_point')) {
      console.log('PickupPointLayout: User is not a pickup point, redirecting to login');
      router.replace('/login');
    }
  }, [user, loading]);

  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="earnings" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false }} />
    </Stack>
  );
}
