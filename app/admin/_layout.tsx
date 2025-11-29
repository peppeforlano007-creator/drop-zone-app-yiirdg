
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'Admin Dashboard',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="manage-drops"
        options={{
          title: 'Gestisci Drop',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="drop-analytics"
        options={{
          title: 'Analytics Drop',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="complete-drop"
        options={{
          title: 'Completa Drop',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'Gestisci Utenti',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="loyalty-program"
        options={{
          title: 'Programma Fedeltà',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="suppliers"
        options={{
          title: 'Gestisci Fornitori',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: 'Gestisci Prodotti',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="pickup-points"
        options={{
          title: 'Punti di Ritiro',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="user-details"
        options={{
          title: 'Dettagli Utente',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="supplier-details"
        options={{
          title: 'Dettagli Fornitore',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="legal-documents"
        options={{
          title: 'Documenti Legali',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Impostazioni',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
