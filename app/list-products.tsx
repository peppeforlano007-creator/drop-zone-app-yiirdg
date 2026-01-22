
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, Pressable, Image, Dimensions, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GAME_STATS_KEY = 'game_stats_v2';
const WEEKLY_CHALLENGES_KEY = 'weekly_challenges';
const CURRENT_CHALLENGE_INDEX_KEY = 'current_challenge_index';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  original_price: number;
  available_sizes: string[] | null;
  available_colors: string[] | null;
  condition: string;
  category: string | null;
  brand: string | null;
  stock: number;
}

interface GameStats {
  weekly_streak: number;
  total_discoveries: number;
  lists_explored: number;
  lists_explored_this_week: number;
  lists_interested_this_week: number;
  lists_shared_this_week: number;
  lists_navigated_to_end: string[];
  points_earned_this_week: number;
  points_earned_this_month: number;
  last_played: string;
  last_week_start: string;
  last_month_start?: string;
  explored_list_ids: string[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  locked: boolean;
}

export default function ListProductsScreen() {
  const { listId, listName, supplierListId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const hasTrackedNavigation = useRef(false);

  useEffect(() => {
    loadProducts();
  }, [listId]);

  const loadProducts = async () => {
    try {
      console.log('Loading products for list:', listId);
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_list_id', listId)
        .eq('status', 'active')
        .gt('stock', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`Loaded ${data?.length || 0} products for list`);
      setProducts(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading products:', error);
      setLoading(false);
    }
  };

  const handleScrollEnd = async (event: any) => {
    // Check if user has scrolled to the end of the list
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // Threshold for "end of list"
    const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isAtEnd && !hasReachedEnd && !hasTrackedNavigation.current && products.length > 0) {
      console.log('User reached end of list:', listName);
      setHasReachedEnd(true);
      hasTrackedNavigation.current = true;
      
      // Track navigation to end
      await trackNavigationToEnd();
    }
  };

  const trackNavigationToEnd = async () => {
    try {
      const listIdToTrack = (supplierListId || listId) as string;
      
      if (!listIdToTrack) {
        console.warn('No list ID available to track navigation');
        return;
      }

      console.log('Tracking navigation to end for list:', listIdToTrack);

      // Load current game stats
      const savedStats = await AsyncStorage.getItem(GAME_STATS_KEY);
      if (!savedStats) {
        console.warn('No game stats found');
        return;
      }

      const gameStats: GameStats = JSON.parse(savedStats);

      // Check if this list was already navigated to the end
      if (!Array.isArray(gameStats.lists_navigated_to_end)) {
        gameStats.lists_navigated_to_end = [];
      }

      const alreadyNavigated = gameStats.lists_navigated_to_end.includes(listIdToTrack);
      
      if (alreadyNavigated) {
        console.log('List already navigated to end this week');
        return;
      }

      // Add to navigated lists
      gameStats.lists_navigated_to_end.push(listIdToTrack);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(gameStats));
      console.log('Added list to navigated lists:', listIdToTrack);

      // Update NAVIGATORE challenge (id: '2')
      await updateChallengeProgress('2', 1);

      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error tracking navigation to end:', error);
    }
  };

  const updateChallengeProgress = async (challengeId: string, increment: number) => {
    try {
      console.log(`🎯 updateChallengeProgress called for challenge ${challengeId} with increment ${increment}`);
      
      const savedChallenges = await AsyncStorage.getItem(WEEKLY_CHALLENGES_KEY);
      if (!savedChallenges) {
        console.warn('No challenges found');
        return;
      }

      const challenges: Challenge[] = JSON.parse(savedChallenges);
      
      // Find the challenge being updated
      const challengeIndex = challenges.findIndex(c => c.id === challengeId);
      if (challengeIndex === -1) {
        console.warn('Challenge not found:', challengeId);
        return;
      }

      const challenge = challenges[challengeIndex];
      
      // Check if challenge is locked or already completed
      if (challenge.locked) {
        console.log(`❌ Challenge ${challengeId} is LOCKED. Cannot update progress.`);
        return;
      }
      
      if (challenge.completed) {
        console.log(`✅ Challenge ${challengeId} is already COMPLETED. No update needed.`);
        return;
      }

      // Update progress
      const currentProgress = challenge.progress || 0;
      const target = challenge.target || 1;
      const newProgress = Math.min(currentProgress + increment, target);
      const completed = newProgress >= target;
      
      console.log(`📊 Challenge ${challengeId}: progress ${currentProgress} -> ${newProgress} (target: ${target}), completed: ${completed}`);
      
      // Only proceed if there's an actual change
      if (newProgress === currentProgress && completed === challenge.completed) {
        console.log('No change in progress, skipping update');
        return;
      }
      
      // Update the challenge
      challenges[challengeIndex] = { ...challenge, progress: newProgress, completed };

      // If challenge is completed, unlock the next one
      if (completed && !challenge.completed) {
        console.log('🎉 Challenge completed! Unlocking next challenge...');
        
        const nextIndex = challengeIndex + 1;
        
        // Find the next challenge and unlock it
        if (nextIndex < challenges.length) {
          const nextChallenge = challenges[nextIndex];
          challenges[nextIndex] = { ...nextChallenge, locked: false };
          
          // Update current challenge index
          await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, nextIndex.toString());
          console.log(`🔓 Unlocked challenge ${nextChallenge.id}: ${nextChallenge.title}`);
          
          // Show completion alert
          Alert.alert(
            '🎉 Sfida Completata!',
            `Hai completato "${challenge.title}" e guadagnato ${challenge.reward} punti!\n\nLa prossima sfida "${nextChallenge.title}" è stata sbloccata!`,
            [{ text: 'Fantastico!', style: 'default' }]
          );
        } else {
          // All challenges completed
          Alert.alert(
            '🎉 Tutte le Sfide Completate!',
            `Hai completato "${challenge.title}" e guadagnato ${challenge.reward} punti!\n\nHai completato tutte le sfide della settimana! 🏆`,
            [{ text: 'Incredibile!', style: 'default' }]
          );
        }
      }

      // Save updated challenges to AsyncStorage
      await AsyncStorage.setItem(WEEKLY_CHALLENGES_KEY, JSON.stringify(challenges));
      console.log('✅ Challenge progress saved successfully');
      
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'nuovo':
        return '#4CAF50';
      case 'reso da cliente':
        return '#FF9800';
      case 'packaging rovinato':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'nuovo':
        return 'Nuovo';
      case 'reso da cliente':
        return 'Reso';
      case 'packaging rovinato':
        return 'Packaging Rovinato';
      default:
        return condition;
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.productImage}
        resizeMode="cover"
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.brand && (
          <Text style={styles.productBrand}>{item.brand}</Text>
        )}
        
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.productDetails}>
          <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(item.condition) + '20' }]}>
            <Text style={[styles.conditionText, { color: getConditionColor(item.condition) }]}>
              {getConditionLabel(item.condition)}
            </Text>
          </View>

          <Text style={styles.productPrice}>€{item.original_price.toFixed(2)}</Text>
        </View>

        {item.available_sizes && item.available_sizes.length > 0 && (
          <View style={styles.sizesContainer}>
            <Text style={styles.sizesLabel}>Taglie: </Text>
            <Text style={styles.sizesText}>{item.available_sizes.join(', ')}</Text>
          </View>
        )}

        {item.available_colors && item.available_colors.length > 0 && (
          <View style={styles.colorsContainer}>
            <Text style={styles.colorsLabel}>Colori: </Text>
            <Text style={styles.colorsText}>{item.available_colors.join(', ')}</Text>
          </View>
        )}

        <View style={styles.stockInfo}>
          <IconSymbol
            ios_icon_name="cube.box.fill"
            android_material_icon_name="inventory"
            size={16}
            color={item.stock > 10 ? '#4CAF50' : '#FF9800'}
          />
          <Text style={[
            styles.stockText,
            { color: item.stock > 10 ? '#4CAF50' : '#FF9800' }
          ]}>
            {item.stock} disponibili
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: listName as string || 'Prodotti',
            headerBackTitle: 'Indietro',
          }}
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento prodotti...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: listName as string || 'Prodotti',
          headerBackTitle: 'Indietro',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="tray.fill"
              android_material_icon_name="inventory_2"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>Nessun Prodotto</Text>
            <Text style={styles.emptyText}>
              Non ci sono prodotti disponibili in questa lista al momento.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'} disponibili
              </Text>
              {hasReachedEnd && (
                <View style={styles.completionBadge}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={16}
                    color="#4CAF50"
                  />
                  <Text style={styles.completionText}>Lista completata!</Text>
                </View>
              )}
            </View>
            
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScrollEnd}
              scrollEventThrottle={400}
            />
          </>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.backgroundSecondary,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  sizesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sizesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  sizesText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  colorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  colorsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
