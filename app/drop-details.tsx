
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable, Alert, Linking } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import ProductCard from '@/components/ProductCard';
import { mockDrops } from '@/data/mockData';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DropDetailsScreen() {
  const { dropId } = useLocalSearchParams();
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  const drop = mockDrops.find(d => d.id === dropId);

  if (!drop) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Drop non trovato',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={64} color={colors.text} />
          <Text style={styles.errorText}>Drop non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBook = (productId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookedProducts(prev => {
      const newSet = new Set(prev);
      newSet.add(productId);
      return newSet;
    });
    Alert.alert(
      'Prenotazione Confermata!',
      'Il prodotto è stato prenotato. Verrai addebitato alla fine del drop con lo sconto finale.',
      [{ text: 'OK' }]
    );
    console.log('Product booked:', productId);
  };

  const handleShareWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Create a shareable message
    const message = `🎉 Guarda questo Drop su DROPMARKET!\n\n` +
      `📦 ${drop.supplierName}\n` +
      `📍 Punto di ritiro: ${drop.pickupPoint}\n` +
      `💰 Sconto attuale: ${drop.currentDiscount}%\n` +
      `🎯 Sconto massimo: ${drop.maxDiscount}%\n` +
      `🛍️ ${drop.products.length} prodotti disponibili\n\n` +
      `Più persone prenotano con carta, più lo sconto aumenta! 🚀\n\n` +
      `Unisciti al drop: dropmarket://drop/${dropId}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        console.log('WhatsApp opened successfully');
      } else {
        Alert.alert(
          'WhatsApp non disponibile',
          'WhatsApp non è installato sul tuo dispositivo. Installa WhatsApp per condividere questo drop.',
          [{ text: 'OK' }]
        );
        console.log('WhatsApp not available');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Errore',
        'Si è verificato un errore durante l\'apertura di WhatsApp. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderProduct = ({ item }: { item: typeof drop.products[0] }) => (
    <ProductCard
      product={item}
      isInDrop={true}
      currentDiscount={drop.currentDiscount}
      onBook={handleBook}
      isInterested={bookedProducts.has(item.id)}
    />
  );

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: drop.supplierName,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={drop.products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
        
        {/* WhatsApp Share Button - Fixed at bottom */}
        <View style={styles.shareButtonContainer}>
          <Pressable 
            onPress={handleShareWhatsApp} 
            style={styles.whatsappButton}
          >
            <View style={styles.whatsappIconContainer}>
              <Text style={styles.whatsappIcon}>📱</Text>
            </View>
            <View style={styles.whatsappTextContainer}>
              <Text style={styles.whatsappButtonText}>Invita amici su WhatsApp</Text>
              <Text style={styles.whatsappButtonSubtext}>
                Più prenotazioni = più sconto!
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  shareButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    boxShadow: '0px 4px 12px rgba(37, 211, 102, 0.3)',
    elevation: 8,
  },
  whatsappIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIcon: {
    fontSize: 24,
  },
  whatsappTextContainer: {
    flex: 1,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  whatsappButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
});
