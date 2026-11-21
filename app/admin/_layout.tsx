
import { Stack, router, useSegments } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessSection, sectionForScreen } from '@/utils/adminPermissions';

function AccessDenied() {
  return (
    <View style={guardStyles.overlay}>
      <Text style={guardStyles.title}>Accesso non consentito</Text>
      <Text style={guardStyles.text}>Il tuo account admin non ha accesso a questa sezione.</Text>
      <Pressable
        style={({ pressed }) => [guardStyles.button, pressed && { opacity: 0.8 }]}
        onPress={() => router.replace('/admin/dashboard')}
      >
        <Text style={guardStyles.buttonText}>Torna alla dashboard</Text>
      </Pressable>
    </View>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const segments = useSegments() as string[];
  const adminIndex = segments.indexOf('admin');
  const screen = adminIndex >= 0 ? segments[adminIndex + 1] ?? 'dashboard' : 'dashboard';
  const allowed = canAccessSection(user?.adminPermissions, sectionForScreen(screen));

  return (
    <View style={{ flex: 1 }}>
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
        name="chat"
        options={{
          title: 'Chat',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="chat-group"
        options={{
          title: 'Chat',
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
    {!allowed && <AccessDenied />}
    </View>
  );
}

const guardStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  text: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  button: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 44,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
