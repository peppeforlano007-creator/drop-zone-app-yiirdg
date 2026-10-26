import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/commonStyles';
import { cardPaymentPresentation, type BookingPayment, type CardBookingState } from '@/utils/bookingCardPayment';

export function CardBookingPayment({ payment, state }: { payment: BookingPayment; state?: CardBookingState }) {
  const message = cardPaymentPresentation(payment, state);
  const tone = message.tone === 'success' ? '#047857' : message.tone === 'warning' ? '#92400E' : colors.textSecondary;
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.heading}>
        {state?.release_pending || state?.state === 'capture_pending'
          ? <ActivityIndicator size="small" color={tone} />
          : <Ionicons name={message.tone === 'success' ? 'checkmark-circle-outline' : 'card-outline'} size={20} color={tone} />}
        <Text style={[styles.title, { color: tone }]}>{message.title}</Text>
      </View>
      <Text style={styles.detail}>{message.detail}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { paddingVertical: 12, gap: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '600', flex: 1 },
  detail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
});
