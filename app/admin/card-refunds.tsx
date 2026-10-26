import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { listAdminCardRefunds, refundCardPaymentAsAdmin, CardBookingError, type AdminCardRefundRow } from '@/utils/bookingCardApi';

const ERRORS: Record<string, string> = {
  ADMIN_REQUIRED: 'Solo gli amministratori possono fare rimborsi.',
  REFUND_ITEM_ALREADY_COLLECTED: "L'articolo è stato ritirato: rimborsa solo dopo il reso al mittente.",
  REFUND_NOT_AVAILABLE: 'Questo pagamento non è rimborsabile.',
  REFUND_NEEDS_REVIEW: 'Stripe non ha confermato il rimborso. Il caso resta in revisione: riprova tra poco.',
};
const money = (c: number) => `€${(c / 100).toFixed(2)}`;

export default function CardRefundsScreen() {
  const [rows, setRows] = useState<AdminCardRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setRows(await listAdminCardRefunds()); }
    catch (e) { setError(e instanceof CardBookingError && ERRORS[e.code] ? ERRORS[e.code] : 'Impossibile caricare i pagamenti.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refund = (row: AdminCardRefundRow) => {
    Alert.alert('Rimborsa pagamento', `Rimborsare ${money(row.amount_cents)} a ${row.customer_name} per "${row.product_name}"? L'operazione non si può annullare.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimborsa', style: 'destructive', onPress: async () => {
        setBusy(row.attempt_id);
        try {
          await refundCardPaymentAsAdmin(row.attempt_id, row.item_returned ? 'RETURNED' : 'OPERATOR_REQUEST');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Rimborso non completato', e instanceof CardBookingError && ERRORS[e.code] ? ERRORS[e.code] : 'Riprova tra poco.');
        } finally { setBusy(null); await load(); }
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Rimborsi carta' }} />
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          {error && <Text style={styles.error}>{error}</Text>}
          {!error && rows.length === 0 && <Text style={styles.muted}>Nessun pagamento con carta incassato.</Text>}
          {rows.map((r) => {
            const done = r.refund_state === 'refunded';
            const blocked = r.item_collected && !r.item_returned;
            return (
              <View key={r.attempt_id} style={styles.card}>
                <Text style={styles.title}>{r.product_name}</Text>
                <Text style={styles.muted}>{r.customer_name} · {money(r.amount_cents)}</Text>
                <Text style={styles.muted}>
                  {done ? 'Rimborsato' : r.refund_state === 'review' ? 'Da rivedere: Stripe non ha confermato' : r.item_returned ? 'Articolo reso' : r.item_collected ? 'Articolo ritirato' : 'Articolo non ritirato'}
                </Text>
                {!done && (
                  <Pressable disabled={busy !== null || blocked} onPress={() => refund(r)}
                    style={[styles.button, (busy !== null || blocked) && { opacity: 0.4 }]}>
                    {busy === r.attempt_id ? <ActivityIndicator color="#fff" /> :
                      <Text style={styles.buttonText}>{r.refund_state === 'review' ? 'Riprova rimborso' : 'Rimborsa'}</Text>}
                  </Pressable>
                )}
                {blocked && !done && <Text style={styles.muted}>Rimborsabile solo dopo il reso al mittente.</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textSecondary },
  error: { color: '#C0392B', fontSize: 14 },
  button: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
