
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, Pressable, Alert, Animated, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface SupplierList {
  id: string;
  name: string;
  supplier_id: string;
  supplier_name: string;
  min_discount: number;
  max_discount: number;
  min_reservation_value: number;
  max_reservation_value: number;
  product_count: number;
}

interface GameStats {
  daily_streak: number;
  total_discoveries: number;
  lists_explored: number;
  points_earned_today: number;
  last_played: string;
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
}

const WELCOME_MODAL_KEY = 'game_welcome_shown';
const GAME_STATS_KEY = 'game_stats';
const LAST_CHALLENGE_DATE_KEY = 'last_challenge_date';

export default function GameFeedScreen() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    daily_streak: 0,
    total_discoveries: 0,
    lists_explored: 0,
    points_earned_today: 0,
    last_played: new Date().toISOString().split('T')[0],
  });
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load game data
  useEffect(() => {
    loadGameData();
    loadUnreadNotifications();
    checkWelcomeScreen();
  }, []);

  const checkWelcomeScreen = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(WELCOME_MODAL_KEY);
      if (!hasShown) {
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Error checking welcome screen:', error);
    }
  };

  const closeWelcome = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_MODAL_KEY, 'true');
      setShowWelcome(false);
    } catch (error) {
      console.error('Error saving welcome state:', error);
    }
  };

  const loadGameData = async () => {
    try {
      console.log('🎮 Loading game data...');
      setLoading(true);

      // Load supplier lists with product counts
      const { data: lists, error: listsError } = await supabase
        .from('supplier_lists')
        .select(`
          id,
          name,
          supplier_id,
          min_discount,
          max_discount,
          min_reservation_value,
          max_reservation_value,
          products!inner(id)
        `)
        .eq('status', 'active')
        .gt('products.stock', 0)
        .eq('products.status', 'active');

      if (listsError) throw listsError;

      // Get supplier names
      const supplierIds = [...new Set(lists?.map(l => l.supplier_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Count products per list
      const listsWithCounts = lists?.reduce((acc: SupplierList[], list: any) => {
        const productCount = list.products?.length || 0;
        if (productCount > 0) {
          acc.push({
            id: list.id,
            name: list.name,
            supplier_id: list.supplier_id,
            supplier_name: profilesMap.get(list.supplier_id) || 'Fornitore',
            min_discount: list.min_discount,
            max_discount: list.max_discount,
            min_reservation_value: list.min_reservation_value,
            max_reservation_value: list.max_reservation_value,
            product_count: productCount,
          });
        }
        return acc;
      }, []) || [];

      setSupplierLists(listsWithCounts);

      // Load game stats
      const savedStats = await AsyncStorage.getItem(GAME_STATS_KEY);
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        const today = new Date().toISOString().split('T')[0];
        
        // Check if streak should continue
        const lastPlayed = new Date(stats.last_played);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Continue streak
          stats.daily_streak += 1;
        } else if (daysDiff > 1) {
          // Reset streak
          stats.daily_streak = 1;
        }
        
        // Reset daily points if new day
        if (stats.last_played !== today) {
          stats.points_earned_today = 0;
          stats.last_played = today;
        }
        
        setGameStats(stats);
        await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(stats));
      }

      // Generate daily challenges
      await generateDailyChallenges(listsWithCounts.length);

      setLoading(false);
    } catch (error) {
      console.error('Error loading game data:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del gioco');
      setLoading(false);
    }
  };

  const generateDailyChallenges = async (listCount: number) => {
    const today = new Date().toISOString().split('T')[0];
    const lastChallengeDate = await AsyncStorage.getItem(LAST_CHALLENGE_DATE_KEY);
    
    if (lastChallengeDate === today) {
      // Load existing challenges
      const savedChallenges = await AsyncStorage.getItem(`challenges_${today}`);
      if (savedChallenges) {
        setDailyChallenges(JSON.parse(savedChallenges));
        return;
      }
    }

    // Generate new challenges
    const challenges: Challenge[] = [
      {
        id: '1',
        title: 'Esploratore Mattutino',
        description: 'Scopri 3 liste diverse oggi',
        icon: 'explore',
        progress: 0,
        target: 3,
        reward: 50,
        completed: false,
      },
      {
        id: '2',
        title: 'Cacciatore di Offerte',
        description: 'Mostra interesse per 5 liste',
        icon: 'favorite',
        progress: 0,
        target: 5,
        reward: 100,
        completed: false,
      },
      {
        id: '3',
        title: 'Collezionista',
        description: `Esplora tutte le ${listCount} liste disponibili`,
        icon: 'stars',
        progress: 0,
        target: listCount,
        reward: 200,
        completed: false,
      },
    ];

    setDailyChallenges(challenges);
    await AsyncStorage.setItem(`challenges_${today}`, JSON.stringify(challenges));
    await AsyncStorage.setItem(LAST_CHALLENGE_DATE_KEY, today);
  };

  const loadUnreadNotifications = async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleListTap = async (list: SupplierList) => {
    if (!user || !user.pickupPointId) {
      Alert.alert('Errore', 'Devi essere registrato con un punto di ritiro');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isSelected = selectedLists.has(list.id);
    const newSelected = new Set(selectedLists);

    if (isSelected) {
      newSelected.delete(list.id);
      
      // Remove interest
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('supplier_list_id', list.id);
    } else {
      newSelected.add(list.id);
      
      // Add interest for all products in the list
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_list_id', list.id)
        .eq('status', 'active')
        .gt('stock', 0)
        .limit(1);

      if (products && products.length > 0) {
        await supabase
          .from('user_interests')
          .insert({
            user_id: user.id,
            product_id: products[0].id,
            supplier_list_id: list.id,
            pickup_point_id: user.pickupPointId,
          });
      }

      // Award points
      const pointsEarned = 10;
      await awardPoints(pointsEarned, 'list_interest');
      
      // Update challenges
      updateChallengeProgress('2', 1);
    }

    setSelectedLists(newSelected);
    
    // Update stats
    const newStats = { ...gameStats };
    if (!isSelected) {
      newStats.total_discoveries += 1;
      if (!selectedLists.has(list.id)) {
        newStats.lists_explored += 1;
        updateChallengeProgress('1', 1);
        updateChallengeProgress('3', 1);
      }
    }
    setGameStats(newStats);
    await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));
  };

  const awardPoints = async (points: number, activityType: string) => {
    if (!user || user.rating_stars < 5) {
      return;
    }

    try {
      // Update user loyalty points
      const { data: profile } = await supabase
        .from('profiles')
        .select('loyalty_points')
        .eq('user_id', user.id)
        .single();

      const currentPoints = profile?.loyalty_points || 0;
      const newPoints = currentPoints + points;

      await supabase
        .from('profiles')
        .update({ loyalty_points: newPoints })
        .eq('user_id', user.id);

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          points_earned: points,
        });

      // Update game stats
      const newStats = { ...gameStats };
      newStats.points_earned_today += points;
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));

      // Show reward animation
      setRewardAmount(points);
      setShowRewardAnimation(true);
      
      Animated.sequence([
        Animated.timing(rewardAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(rewardAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowRewardAnimation(false));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const updateChallengeProgress = async (challengeId: string, increment: number) => {
    const newChallenges = dailyChallenges.map(challenge => {
      if (challenge.id === challengeId && !challenge.completed) {
        const newProgress = Math.min(challenge.progress + increment, challenge.target);
        const completed = newProgress >= challenge.target;
        
        if (completed && !challenge.completed) {
          // Award challenge reward
          awardPoints(challenge.reward, 'challenge_completed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        return { ...challenge, progress: newProgress, completed };
      }
      return challenge;
    });

    setDailyChallenges(newChallenges);
    
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(`challenges_${today}`, JSON.stringify(newChallenges));
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  // Pulse animation for streak
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento gioco...</Text>
        </View>
      </>
    );
  }

  if (showWelcome) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <IconSymbol
                ios_icon_name="gamecontroller.fill"
                android_material_icon_name="sports_esports"
                size={80}
                color={colors.primary}
              />
            </View>
            
            <Text style={styles.welcomeTitle}>Benvenuto al Gioco delle Liste!</Text>
            <Text style={styles.welcomeSubtitle}>
              Scopri le liste dei fornitori, guadagna punti e sblocca ricompense
            </Text>

            <View style={styles.welcomeSection}>
              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={32}
                  color="#FFD700"
                />
                <Text style={styles.welcomeFeatureTitle}>Guadagna Punti</Text>
                <Text style={styles.welcomeFeatureText}>
                  Ogni lista che esplori ti fa guadagnare punti fedeltà
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="flame.fill"
                  android_material_icon_name="local_fire_department"
                  size={32}
                  color="#FF6B35"
                />
                <Text style={styles.welcomeFeatureTitle}>Mantieni la Striscia</Text>
                <Text style={styles.welcomeFeatureText}>
                  Gioca ogni giorno per mantenere la tua striscia attiva
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="trophy.fill"
                  android_material_icon_name="emoji_events"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.welcomeFeatureTitle}>Sfide Giornaliere</Text>
                <Text style={styles.welcomeFeatureText}>
                  Completa le sfide per guadagnare punti bonus
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="gift.fill"
                  android_material_icon_name="card_giftcard"
                  size={32}
                  color="#4CAF50"
                />
                <Text style={styles.welcomeFeatureTitle}>Sblocca Coupon</Text>
                <Text style={styles.welcomeFeatureText}>
                  Usa i punti per riscattare coupon sconto
                </Text>
              </View>
            </View>

            <Pressable style={styles.welcomeButton} onPress={closeWelcome}>
              <Text style={styles.welcomeButtonText}>Inizia a Giocare!</Text>
            </Pressable>
          </ScrollView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleLogout} style={styles.headerButton}>
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Gioco delle Liste</Text>
            <Text style={styles.headerSubtitle}>{user?.pickupPoint || 'N/A'}</Text>
          </View>

          <Pressable onPress={handleNotifications} style={styles.headerButton}>
            <IconSymbol
              ios_icon_name="bell.fill"
              android_material_icon_name="notifications"
              size={24}
              color={colors.text}
            />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <IconSymbol
                  ios_icon_name="flame.fill"
                  android_material_icon_name="local_fire_department"
                  size={32}
                  color="#FF6B35"
                />
              </Animated.View>
              <Text style={styles.statValue}>{gameStats.daily_streak}</Text>
              <Text style={styles.statLabel}>Giorni di Fila</Text>
            </View>

            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={32}
                color="#FFD700"
              />
              <Text style={styles.statValue}>{gameStats.points_earned_today}</Text>
              <Text style={styles.statLabel}>Punti Oggi</Text>
            </View>

            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{gameStats.lists_explored}</Text>
              <Text style={styles.statLabel}>Liste Esplorate</Text>
            </View>
          </View>

          {/* Daily Challenges */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="trophy.fill"
                android_material_icon_name="emoji_events"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Sfide Giornaliere</Text>
            </View>

            {dailyChallenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <IconSymbol
                    ios_icon_name={challenge.icon === 'explore' ? 'map.fill' : challenge.icon === 'favorite' ? 'heart.fill' : 'star.fill'}
                    android_material_icon_name={challenge.icon}
                    size={24}
                    color={challenge.completed ? '#4CAF50' : colors.text}
                  />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>
                  </View>
                  {challenge.completed && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={28}
                      color="#4CAF50"
                    />
                  )}
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(challenge.progress / challenge.target) * 100}%`,
                          backgroundColor: challenge.completed ? '#4CAF50' : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {challenge.progress}/{challenge.target}
                  </Text>
                </View>

                <View style={styles.rewardBadge}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={16}
                    color="#FFD700"
                  />
                  <Text style={styles.rewardText}>+{challenge.reward} punti</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Supplier Lists */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="list.bullet.rectangle"
                android_material_icon_name="list"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Liste Disponibili</Text>
            </View>

            <Text style={styles.sectionSubtitle}>
              Tocca le liste che ti interessano per guadagnare punti!
            </Text>

            {supplierLists.map((list) => {
              const isSelected = selectedLists.has(list.id);
              return (
                <Pressable
                  key={list.id}
                  style={({ pressed }) => [
                    styles.listCard,
                    isSelected && styles.listCardSelected,
                    pressed && styles.listCardPressed,
                  ]}
                  onPress={() => handleListTap(list)}
                >
                  <View style={styles.listHeader}>
                    <View style={[styles.listIcon, isSelected && styles.listIconSelected]}>
                      <IconSymbol
                        ios_icon_name={isSelected ? 'checkmark' : 'bag.fill'}
                        android_material_icon_name={isSelected ? 'check' : 'shopping_bag'}
                        size={24}
                        color={isSelected ? '#FFF' : colors.text}
                      />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{list.name}</Text>
                      <Text style={styles.listSupplier}>di {list.supplier_name}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <IconSymbol
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={16}
                          color="#FFD700"
                        />
                        <Text style={styles.selectedBadgeText}>+10</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.listDetails}>
                    <View style={styles.listDetailItem}>
                      <IconSymbol
                        ios_icon_name="tag.fill"
                        android_material_icon_name="local_offer"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.listDetailText}>
                        {list.min_discount}% - {list.max_discount}% sconto
                      </Text>
                    </View>
                    <View style={styles.listDetailItem}>
                      <IconSymbol
                        ios_icon_name="cube.box.fill"
                        android_material_icon_name="inventory"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.listDetailText}>
                        {list.product_count} prodotti
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.info}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Come Funziona</Text>
              <Text style={styles.infoText}>
                Le tue scelte aiutano l&apos;amministratore a capire quali liste attivare per la tua città. 
                Quando abbastanza utenti mostrano interesse, un drop verrà attivato!
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Reward Animation */}
        {showRewardAnimation && (
          <Animated.View
            style={[
              styles.rewardAnimation,
              {
                opacity: rewardAnim,
                transform: [
                  {
                    translateY: rewardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -50],
                    }),
                  },
                  {
                    scale: rewardAnim,
                  },
                ],
              },
            ]}
          >
            <View style={styles.rewardAnimationContent}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={32}
                color="#FFD700"
              />
              <Text style={styles.rewardAnimationText}>+{rewardAmount} punti!</Text>
            </View>
          </Animated.View>
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B6914',
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  listCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  listCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconSelected: {
    backgroundColor: colors.primary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listSupplier: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6914',
  },
  listDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  listDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rewardAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -100,
    marginTop: -50,
    zIndex: 1000,
  },
  rewardAnimationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  rewardAnimationText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  welcomeContainer: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeIcon: {
    marginTop: 60,
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  welcomeSection: {
    width: '100%',
    gap: 24,
    marginBottom: 40,
  },
  welcomeFeature: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeFeatureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeFeatureText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  welcomeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
