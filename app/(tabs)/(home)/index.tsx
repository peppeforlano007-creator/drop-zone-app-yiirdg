
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, Pressable, Alert, Animated, ActivityIndicator, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

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
  weekly_streak: number;
  total_discoveries: number;
  lists_explored: number;
  lists_explored_this_week: number;
  lists_interested_this_week: number;
  lists_shared_this_week: number;
  lists_navigated_to_end: string[]; // IDs of lists navigated to the end
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

const WELCOME_MODAL_KEY = 'game_welcome_shown';
const GAME_STATS_KEY = 'game_stats_v2';
const WEEKLY_CHALLENGES_KEY = 'weekly_challenges';
const CURRENT_CHALLENGE_INDEX_KEY = 'current_challenge_index';

// Helper to get the start of the current week (Monday)
const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

// Helper to get the start of the current month
const getMonthStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

export default function GameFeedScreen() {
  const { logout, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplierLists, setSupplierLists] = useState<SupplierList[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    weekly_streak: 0,
    total_discoveries: 0,
    lists_explored: 0,
    lists_explored_this_week: 0,
    lists_interested_this_week: 0,
    lists_shared_this_week: 0,
    lists_navigated_to_end: [],
    points_earned_this_week: 0,
    points_earned_this_month: 0,
    last_played: new Date().toISOString().split('T')[0],
    last_week_start: getWeekStart(),
    explored_list_ids: [],
  });
  const [weeklyChallenges, setWeeklyChallenges] = useState<Challenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showMissedWeekModal, setShowMissedWeekModal] = useState(false);
  const [missedWeeksCount, setMissedWeeksCount] = useState(0);
  const [previousStreak, setPreviousStreak] = useState(0);
  
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load game data on mount
  useEffect(() => {
    loadGameData();
    loadUnreadNotifications();
    checkWelcomeScreen();
  }, []);

  // Reload challenges when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Screen focused, reloading challenges...');
      reloadChallenges();
    }, [])
  );

  const reloadChallenges = async () => {
    try {
      const savedChallenges = await AsyncStorage.getItem(WEEKLY_CHALLENGES_KEY);
      
      if (savedChallenges) {
        const parsedChallenges = JSON.parse(savedChallenges);
        
        // Find the first unlocked, incomplete challenge
        let newCurrentIndex = 0;
        for (let i = 0; i < parsedChallenges.length; i++) {
          if (!parsedChallenges[i].locked && !parsedChallenges[i].completed) {
            newCurrentIndex = i;
            break;
          }
          // If all challenges are completed, set to last challenge
          if (i === parsedChallenges.length - 1) {
            newCurrentIndex = i;
          }
        }
        
        console.log('📊 Reloaded challenges:', parsedChallenges);
        console.log('📊 Current challenge index (first unlocked incomplete):', newCurrentIndex);
        
        setWeeklyChallenges(parsedChallenges);
        setCurrentChallengeIndex(newCurrentIndex);
        
        // Update the saved index to match
        await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, newCurrentIndex.toString());
      }
    } catch (error) {
      console.error('Error reloading challenges:', error);
    }
  };

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

      if (listsError) {
        console.error('Error loading supplier lists:', listsError);
        throw listsError;
      }

      // Get supplier names
      const supplierIds = [...new Set((lists || []).map(l => l.supplier_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', supplierIds);

      const profilesMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      // Count products per list with null safety
      const listsWithCounts = (lists || []).reduce((acc: SupplierList[], list: any) => {
        if (!list || !list.id || !list.name) {
          console.warn('Skipping invalid list:', list);
          return acc;
        }
        
        const productCount = Array.isArray(list.products) ? list.products.length : 0;
        if (productCount > 0) {
          acc.push({
            id: list.id,
            name: list.name || 'Lista Senza Nome',
            supplier_id: list.supplier_id || '',
            supplier_name: profilesMap.get(list.supplier_id) || 'Fornitore',
            min_discount: list.min_discount || 0,
            max_discount: list.max_discount || 0,
            min_reservation_value: list.min_reservation_value || 0,
            max_reservation_value: list.max_reservation_value || 0,
            product_count: productCount,
          });
        }
        return acc;
      }, []);

      console.log(`Loaded ${listsWithCounts.length} supplier lists with products`);
      setSupplierLists(listsWithCounts);

      // Load game stats
      const savedStats = await AsyncStorage.getItem(GAME_STATS_KEY);
      const currentWeekStart = getWeekStart();
      const currentMonthStart = getMonthStart();
      
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        
        // Check if we're in a new week
        if (stats.last_week_start !== currentWeekStart) {
          console.log('New week detected, checking streak status');
          
          // Calculate how many weeks have passed
          const lastWeekStart = new Date(stats.last_week_start);
          const thisWeekStart = new Date(currentWeekStart);
          const weeksDiff = Math.floor((thisWeekStart.getTime() - lastWeekStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
          
          console.log(`Weeks difference: ${weeksDiff}`);
          
          // Check if user participated last week (earned any points)
          const participatedLastWeek = stats.points_earned_this_week > 0;
          
          if (weeksDiff === 1 && participatedLastWeek) {
            // User played last week, continue streak
            console.log('User played last week, continuing streak');
            stats.weekly_streak += 1;
          } else if (weeksDiff > 1) {
            // User missed one or more weeks, reset streak
            console.log(`User missed ${weeksDiff - 1} week(s), resetting streak`);
            
            // Show missed week modal if they had a streak
            if (stats.weekly_streak > 0) {
              setPreviousStreak(stats.weekly_streak);
              setMissedWeeksCount(weeksDiff - 1);
              setShowMissedWeekModal(true);
            }
            
            // Reset streak to 0 (will become 1 when they play this week)
            stats.weekly_streak = 0;
          } else if (weeksDiff === 1 && !participatedLastWeek) {
            // User didn't participate last week, reset streak
            console.log('User did not participate last week, resetting streak');
            
            if (stats.weekly_streak > 0) {
              setPreviousStreak(stats.weekly_streak);
              setMissedWeeksCount(1);
              setShowMissedWeekModal(true);
            }
            
            stats.weekly_streak = 0;
          }
          
          // Reset weekly counters
          stats.points_earned_this_week = 0;
          stats.lists_explored_this_week = 0;
          stats.lists_interested_this_week = 0;
          stats.lists_shared_this_week = 0;
          stats.lists_navigated_to_end = [];
          stats.last_week_start = currentWeekStart;
          
          // Reset challenges for new week
          await AsyncStorage.removeItem(WEEKLY_CHALLENGES_KEY);
          await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, '0');
        }
        
        // Check if we're in a new month
        const lastMonthStart = stats.last_month_start || currentMonthStart;
        if (lastMonthStart !== currentMonthStart) {
          console.log('New month detected, transferring points to loyalty program');
          
          // Transfer monthly points to loyalty program
          if (stats.points_earned_this_month > 0 && user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('loyalty_points')
              .eq('user_id', user.id)
              .single();

            const currentLoyaltyPoints = profile?.loyalty_points || 0;
            const newLoyaltyPoints = currentLoyaltyPoints + stats.points_earned_this_month;

            await supabase
              .from('profiles')
              .update({ loyalty_points: newLoyaltyPoints })
              .eq('user_id', user.id);

            console.log(`Transferred ${stats.points_earned_this_month} points to loyalty program`);
            
            Alert.alert(
              '🎉 Punti Trasferiti!',
              `I tuoi ${stats.points_earned_this_month} punti del mese sono stati aggiunti al programma fedeltà!`,
              [{ text: 'Fantastico!', style: 'default' }]
            );
          }
          
          // Reset monthly points
          stats.points_earned_this_month = 0;
          stats.last_month_start = currentMonthStart;
        }
        
        setGameStats(stats);
        await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(stats));
      } else {
        // Initialize new stats
        const newStats = {
          ...gameStats,
          last_week_start: currentWeekStart,
          last_month_start: currentMonthStart,
        };
        setGameStats(newStats);
        await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));
      }

      // Load user interests to mark selected lists
      if (user) {
        const { data: interests } = await supabase
          .from('user_interests')
          .select('supplier_list_id')
          .eq('user_id', user.id);

        if (interests) {
          const interestedListIds = new Set(interests.map(i => i.supplier_list_id));
          setSelectedLists(interestedListIds);
        }
      }

      // Generate weekly challenges
      await generateWeeklyChallenges(listsWithCounts.length);

      setLoading(false);
    } catch (error) {
      console.error('Error loading game data:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del gioco');
      setLoading(false);
    }
  };

  const generateWeeklyChallenges = async (listCount: number) => {
    const currentWeekStart = getWeekStart();
    
    // Try to load existing challenges for this week
    const savedChallenges = await AsyncStorage.getItem(WEEKLY_CHALLENGES_KEY);
    
    if (savedChallenges) {
      try {
        const parsedChallenges = JSON.parse(savedChallenges);
        
        if (Array.isArray(parsedChallenges)) {
          // Find the first unlocked, incomplete challenge
          let newCurrentIndex = 0;
          for (let i = 0; i < parsedChallenges.length; i++) {
            if (!parsedChallenges[i].locked && !parsedChallenges[i].completed) {
              newCurrentIndex = i;
              break;
            }
            // If all challenges are completed, set to last challenge
            if (i === parsedChallenges.length - 1) {
              newCurrentIndex = i;
            }
          }
          
          setWeeklyChallenges(parsedChallenges);
          setCurrentChallengeIndex(newCurrentIndex);
          await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, newCurrentIndex.toString());
          return;
        }
      } catch (error) {
        console.error('Error parsing saved challenges:', error);
      }
    }

    // Ensure listCount is valid
    const validListCount = Math.max(1, listCount || 3);

    // Generate new sequential challenges
    const challenges: Challenge[] = [
      {
        id: '1',
        title: 'COLLEZIONISTA',
        description: `Esplora i prodotti di tutte le ${validListCount} liste disponibili`,
        icon: 'collections',
        progress: 0,
        target: validListCount,
        reward: 100,
        completed: false,
        locked: false, // First challenge is unlocked
      },
      {
        id: '2',
        title: 'NAVIGATORE',
        description: 'Naviga fino in fondo per scoprire tutti i prodotti di una lista',
        icon: 'explore',
        progress: 0,
        target: 1,
        reward: 150,
        completed: false,
        locked: true, // Locked until previous challenge is completed
      },
      {
        id: '3',
        title: 'CACCIATORE DI OFFERTE',
        description: 'Mostra interesse per una lista',
        icon: 'favorite',
        progress: 0,
        target: 1,
        reward: 100,
        completed: false,
        locked: true,
      },
      {
        id: '4',
        title: 'AMBASCIATORE',
        description: 'Condividi una lista con amici e parenti e potrai attivare un drop su quella lista con ritiro nella tua città',
        icon: 'share',
        progress: 0,
        target: 1,
        reward: 200,
        completed: false,
        locked: true,
      },
    ];

    setWeeklyChallenges(challenges);
    setCurrentChallengeIndex(0);
    await AsyncStorage.setItem(WEEKLY_CHALLENGES_KEY, JSON.stringify(challenges));
    await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, '0');
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

  const handleListExplore = async (list: SupplierList) => {
    console.log('User tapped Explore button for list:', list?.name || 'unknown');
    
    if (!list || !list.id) {
      console.error('Invalid list object:', list);
      Alert.alert('Errore', 'Lista non valida');
      return;
    }
    
    if (!user || !user.pickupPointId) {
      Alert.alert('Errore', 'Devi essere registrato con un punto di ritiro');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if this list was already explored this week
    const alreadyExplored = Array.isArray(gameStats.explored_list_ids) && gameStats.explored_list_ids.includes(list.id);

    if (!alreadyExplored) {
      // Update stats
      const newStats = { ...gameStats };
      newStats.lists_explored = (newStats.lists_explored || 0) + 1;
      newStats.lists_explored_this_week = (newStats.lists_explored_this_week || 0) + 1;
      
      // Ensure explored_list_ids is an array
      if (!Array.isArray(newStats.explored_list_ids)) {
        newStats.explored_list_ids = [];
      }
      newStats.explored_list_ids.push(list.id);
      
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));

      // Award points for exploring
      await awardPoints(10, 'list_explored');

      // Update COLLEZIONISTA challenge (id: '1')
      await updateChallengeProgress('1', 1);
    }

    // Navigate to list details
    router.push({
      pathname: '/list-products',
      params: { 
        listId: list.id, 
        listName: list.name || 'Prodotti',
        supplierListId: list.id // Pass this for tracking navigation to end
      }
    });
  };

  const handleListInterest = async (list: SupplierList) => {
    console.log('User tapped Interest button (heart) for list:', list?.name || 'unknown');
    
    if (!list || !list.id) {
      console.error('Invalid list object:', list);
      Alert.alert('Errore', 'Lista non valida');
      return;
    }
    
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
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('supplier_list_id', list.id);

      if (error) {
        console.error('Error removing interest:', error);
      }

      // Update stats
      const newStats = { ...gameStats };
      newStats.lists_interested_this_week = Math.max(0, (newStats.lists_interested_this_week || 0) - 1);
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));
    } else {
      newSelected.add(list.id);
      
      // Add interest for all products in the list
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_list_id', list.id)
        .eq('status', 'active')
        .gt('stock', 0)
        .limit(1);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      if (products && products.length > 0) {
        const { error: insertError } = await supabase
          .from('user_interests')
          .insert({
            user_id: user.id,
            product_id: products[0].id,
            supplier_list_id: list.id,
            pickup_point_id: user.pickupPointId,
          });

        if (insertError) {
          console.error('Error inserting interest:', insertError);
        }
      }

      // Award points
      await awardPoints(5, 'list_interest');
      
      // Update stats
      const newStats = { ...gameStats };
      newStats.lists_interested_this_week = (newStats.lists_interested_this_week || 0) + 1;
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));

      // Update CACCIATORE DI OFFERTE challenge (id: '3')
      await updateChallengeProgress('3', 1);
    }

    setSelectedLists(newSelected);
  };

  const handleListShare = async (list: SupplierList) => {
    console.log('User tapped Share button for list:', list.name);
    
    if (!user || !user.pickupPointId) {
      Alert.alert('Errore', 'Devi essere registrato con un punto di ritiro');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Safely get pickup point name with fallback
      const pickupPointName = user.pickupPoint || 'il tuo punto di ritiro';
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        // Fallback: Show a message with shareable text
        const shareText = `🎁 Scopri ${list.name || 'questa lista'} su DropShop!\n\n` +
          `${list.product_count || 0} prodotti disponibili con sconti dal ${list.min_discount || 0}% al ${list.max_discount || 0}%!\n\n` +
          `Più persone della tua città mostrano interesse, più è probabile che si attivi un drop con sconti incredibili! 🔥\n\n` +
          `Punto di ritiro: ${pickupPointName}\n\n` +
          `Unisciti a noi e approfitta delle migliori offerte!`;
        
        Alert.alert(
          'Condividi questa lista',
          shareText,
          [
            { text: 'Copia Testo', onPress: () => {
              // In a real app, you'd use Clipboard API here
              Alert.alert('Successo', 'Testo copiato! Condividilo con i tuoi amici.');
            }},
            { text: 'Chiudi', style: 'cancel' }
          ]
        );
        return;
      }

      // Create shareable content
      const shareMessage = `🎁 Scopri ${list.name || 'questa lista'} su DropShop!\n\n` +
        `${list.product_count || 0} prodotti disponibili con sconti dal ${list.min_discount || 0}% al ${list.max_discount || 0}%!\n\n` +
        `Più persone della tua città mostrano interesse, più è probabile che si attivi un drop con sconti incredibili! 🔥\n\n` +
        `Punto di ritiro: ${pickupPointName}\n\n` +
        `Unisciti a noi e approfitta delle migliori offerte!`;

      // Share using native share dialog
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(shareMessage), {
        mimeType: 'text/plain',
        dialogTitle: `Condividi ${list.name || 'lista'}`,
        UTI: 'public.plain-text',
      });

      // Track the share
      await supabase
        .from('list_shares')
        .insert({
          user_id: user.id,
          supplier_list_id: list.id,
          pickup_point_id: user.pickupPointId,
        });

      // Update stats
      const newStats = { ...gameStats };
      newStats.lists_shared_this_week = (newStats.lists_shared_this_week || 0) + 1;
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));

      // Award points
      await awardPoints(20, 'list_shared');

      // Update AMBASCIATORE challenge (id: '4')
      await updateChallengeProgress('4', 1);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error sharing list:', error);
      Alert.alert('Errore', 'Impossibile condividere la lista. Riprova più tardi.');
    }
  };

  const awardPoints = async (points: number, activityType: string) => {
    if (!user || user.rating_stars < 5) {
      console.log('User not eligible for points (rating < 5 stars)');
      return;
    }

    try {
      // Update game stats (points accumulate during the week/month)
      const newStats = { ...gameStats };
      newStats.points_earned_this_week = (newStats.points_earned_this_week || 0) + points;
      newStats.points_earned_this_month = (newStats.points_earned_this_month || 0) + points;
      
      // If this is the first activity this week, start the streak
      if (newStats.points_earned_this_week === points && newStats.weekly_streak === 0) {
        newStats.weekly_streak = 1;
      }
      
      setGameStats(newStats);
      await AsyncStorage.setItem(GAME_STATS_KEY, JSON.stringify(newStats));

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          points_earned: points,
        });

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
    if (!Array.isArray(weeklyChallenges) || weeklyChallenges.length === 0) {
      console.warn('No challenges to update');
      return;
    }
    
    // Find the challenge being updated
    const challengeIndex = weeklyChallenges.findIndex(c => c && c.id === challengeId);
    if (challengeIndex === -1) {
      console.warn('Challenge not found:', challengeId);
      return;
    }

    const challenge = weeklyChallenges[challengeIndex];
    
    // Check if challenge is locked or already completed
    if (!challenge || challenge.locked || challenge.completed) {
      console.log('Challenge is locked or already completed');
      return;
    }

    // Update progress
    const currentProgress = challenge.progress || 0;
    const target = challenge.target || 1;
    const newProgress = Math.min(currentProgress + increment, target);
    const completed = newProgress >= target;
    
    console.log(`Updated challenge ${challengeId}: ${currentProgress} -> ${newProgress} (target: ${target})`);
    
    // Create updated challenges array
    const updatedChallenges = [...weeklyChallenges];
    updatedChallenges[challengeIndex] = { ...challenge, progress: newProgress, completed };

    // If challenge is completed, unlock the next one
    if (completed && !challenge.completed) {
      console.log('🎉 Challenge completed! Unlocking next challenge...');
      
      // Find the next challenge and unlock it
      if (challengeIndex < updatedChallenges.length - 1) {
        const nextChallenge = updatedChallenges[challengeIndex + 1];
        updatedChallenges[challengeIndex + 1] = { ...nextChallenge, locked: false };
        
        // Update current challenge index to the next unlocked challenge
        const newIndex = challengeIndex + 1;
        setCurrentChallengeIndex(newIndex);
        await AsyncStorage.setItem(CURRENT_CHALLENGE_INDEX_KEY, newIndex.toString());
        console.log(`✅ Unlocked challenge ${nextChallenge.id}: ${nextChallenge.title}`);
        console.log(`✅ Updated current challenge index to: ${newIndex}`);
        
        // Award challenge reward
        await awardPoints(challenge.reward || 0, 'challenge_completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show completion alert
        Alert.alert(
          '🎉 Sfida Completata!',
          `Hai completato "${challenge.title || 'Sfida'}" e guadagnato ${challenge.reward || 0} punti!\n\nLa prossima sfida "${nextChallenge.title}" è stata sbloccata!`,
          [{ text: 'Fantastico!', style: 'default' }]
        );
      } else {
        // All challenges completed
        await awardPoints(challenge.reward || 0, 'challenge_completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          '🎉 Tutte le Sfide Completate!',
          `Hai completato "${challenge.title || 'Sfida'}" e guadagnato ${challenge.reward || 0} punti!\n\nHai completato tutte le sfide della settimana! 🏆`,
          [{ text: 'Incredibile!', style: 'default' }]
        );
      }
    }

    // Update state and save to AsyncStorage
    setWeeklyChallenges(updatedChallenges);
    
    try {
      await AsyncStorage.setItem(WEEKLY_CHALLENGES_KEY, JSON.stringify(updatedChallenges));
      console.log('✅ Challenge progress and unlock status saved successfully');
    } catch (error) {
      console.error('Error saving challenges:', error);
    }
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

  const closeMissedWeekModal = () => {
    setShowMissedWeekModal(false);
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
              Completa le sfide settimanali, guadagna punti e sblocca ricompense
            </Text>

            <View style={styles.welcomeSection}>
              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={32}
                  color="#FFD700"
                />
                <Text style={styles.welcomeFeatureTitle}>Sfide Settimanali</Text>
                <Text style={styles.welcomeFeatureText}>
                  Completa le sfide una alla volta per guadagnare punti
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="flame.fill"
                  android_material_icon_name="local_fire_department"
                  size={32}
                  color="#FF6B35"
                />
                <Text style={styles.welcomeFeatureTitle}>Striscia Settimanale</Text>
                <Text style={styles.welcomeFeatureText}>
                  Gioca ogni settimana per mantenere la tua striscia attiva
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="trophy.fill"
                  android_material_icon_name="emoji_events"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.welcomeFeatureTitle}>Programma Fedeltà</Text>
                <Text style={styles.welcomeFeatureText}>
                  A fine mese i punti vengono trasferiti al programma fedeltà per riscattare coupon
                </Text>
              </View>

              <View style={styles.welcomeFeature}>
                <IconSymbol
                  ios_icon_name="gift.fill"
                  android_material_icon_name="card_giftcard"
                  size={32}
                  color="#4CAF50"
                />
                <Text style={styles.welcomeFeatureTitle}>Condividi e Guadagna</Text>
                <Text style={styles.welcomeFeatureText}>
                  Condividi le liste con amici per aumentare le possibilità di attivare drop nella tua città
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

  const currentChallenge = weeklyChallenges[currentChallengeIndex];

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
              <Text style={styles.statValue}>{gameStats.weekly_streak}</Text>
              <Text style={styles.statLabel}>Settimane di Fila</Text>
            </View>

            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={32}
                color="#FFD700"
              />
              <Text style={styles.statValue}>{gameStats.points_earned_this_week}</Text>
              <Text style={styles.statLabel}>Punti Questa Settimana</Text>
            </View>

            <View style={styles.statItem}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar_today"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{gameStats.points_earned_this_month}</Text>
              <Text style={styles.statLabel}>Punti Questo Mese</Text>
            </View>
          </View>

          {/* Current Challenge */}
          {currentChallenge && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconSymbol
                  ios_icon_name="trophy.fill"
                  android_material_icon_name="emoji_events"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Sfida Attuale</Text>
              </View>

              <View style={[styles.challengeCard, styles.currentChallengeCard]}>
                <View style={styles.challengeHeader}>
                  <IconSymbol
                    ios_icon_name={
                      currentChallenge.icon === 'collections' ? 'square.grid.2x2.fill' :
                      currentChallenge.icon === 'explore' ? 'map.fill' :
                      currentChallenge.icon === 'favorite' ? 'heart.fill' :
                      'square.and.arrow.up.fill'
                    }
                    android_material_icon_name={currentChallenge.icon}
                    size={32}
                    color={currentChallenge.completed ? '#4CAF50' : colors.primary}
                  />
                  <View style={styles.challengeInfo}>
                    <Text style={styles.currentChallengeTitle}>{currentChallenge.title}</Text>
                    <Text style={styles.challengeDescription}>{currentChallenge.description}</Text>
                  </View>
                  {currentChallenge.completed && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={32}
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
                          width: `${(currentChallenge.progress / currentChallenge.target) * 100}%`,
                          backgroundColor: currentChallenge.completed ? '#4CAF50' : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {currentChallenge.progress}/{currentChallenge.target}
                  </Text>
                </View>

                <View style={styles.rewardBadge}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={16}
                    color="#FFD700"
                  />
                  <Text style={styles.rewardText}>+{currentChallenge.reward} punti</Text>
                </View>
              </View>
            </View>
          )}

          {/* All Challenges Overview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Tutte le Sfide</Text>
            </View>

            {weeklyChallenges.map((challenge, index) => (
              <View key={challenge.id} style={[
                styles.challengeCard,
                challenge.locked && styles.lockedChallengeCard
              ]}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeNumberBadge}>
                    <Text style={styles.challengeNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={[
                      styles.challengeTitle,
                      challenge.locked && styles.lockedChallengeText
                    ]}>
                      {challenge.title}
                    </Text>
                    <Text style={[
                      styles.challengeDescription,
                      challenge.locked && styles.lockedChallengeText
                    ]}>
                      {challenge.description}
                    </Text>
                  </View>
                  {challenge.locked ? (
                    <IconSymbol
                      ios_icon_name="lock.fill"
                      android_material_icon_name="lock"
                      size={24}
                      color={colors.textSecondary}
                    />
                  ) : challenge.completed ? (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={28}
                      color="#4CAF50"
                    />
                  ) : null}
                </View>

                {!challenge.locked && (
                  <>
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
                  </>
                )}
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
              Esplora le liste, mostra interesse e condividile con amici per attivare drop nella tua città!
            </Text>

            {supplierLists.map((list) => {
              if (!list || !list.id) {
                console.warn('Skipping invalid list in render:', list);
                return null;
              }
              
              const isInterested = selectedLists.has(list.id);
              const isExplored = Array.isArray(gameStats.explored_list_ids) && gameStats.explored_list_ids.includes(list.id);
              
              return (
                <View key={list.id} style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <View style={[styles.listIcon, isExplored && styles.listIconExplored]}>
                      <IconSymbol
                        ios_icon_name={isExplored ? 'checkmark' : 'bag.fill'}
                        android_material_icon_name={isExplored ? 'check' : 'shopping_bag'}
                        size={24}
                        color={isExplored ? '#4CAF50' : colors.text}
                      />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{list.name}</Text>
                      <Text style={styles.listSupplier}>di {list.supplier_name}</Text>
                    </View>
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

                  <View style={styles.listActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.exploreButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleListExplore(list)}
                    >
                      <IconSymbol
                        ios_icon_name="eye.fill"
                        android_material_icon_name="visibility"
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.exploreButtonText}>
                        {isExplored ? 'Esplora Ancora' : 'Esplora Prodotti'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.interestButton,
                        isInterested && styles.interestButtonActive,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleListInterest(list)}
                    >
                      <IconSymbol
                        ios_icon_name={isInterested ? 'heart.fill' : 'heart'}
                        android_material_icon_name={isInterested ? 'favorite' : 'favorite_border'}
                        size={20}
                        color={isInterested ? '#FFF' : colors.primary}
                      />
                      <Text style={[
                        styles.interestButtonText,
                        isInterested && styles.interestButtonTextActive
                      ]}>
                        {isInterested ? 'Interessato' : 'Mi Interessa'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Share Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.shareButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleListShare(list)}
                  >
                    <IconSymbol
                      ios_icon_name="square.and.arrow.up"
                      android_material_icon_name="share"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.shareButtonText}>
                      Condividi con Amici (+20 punti)
                    </Text>
                  </Pressable>
                </View>
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
                • Completa le sfide una alla volta per sbloccare la successiva{'\n'}
                • Ogni settimana puoi partecipare una volta{'\n'}
                • Se salti una settimana, la tua striscia si azzera{'\n'}
                • I punti mensili vengono sempre preservati{'\n'}
                • A fine mese i punti vengono trasferiti al programma fedeltà{'\n'}
                • Condividi le liste per aumentare le possibilità di attivare drop!
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

        {/* Missed Week Modal */}
        <Modal
          visible={showMissedWeekModal}
          transparent={true}
          animationType="fade"
          onRequestClose={closeMissedWeekModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={64}
                  color="#FF9800"
                />
              </View>

              <Text style={styles.modalTitle}>Striscia Persa</Text>
              
              <Text style={styles.modalMessage}>
                {missedWeeksCount === 1 
                  ? 'Non hai partecipato al gioco la settimana scorsa.'
                  : `Non hai partecipato al gioco per ${missedWeeksCount} settimane.`}
              </Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Striscia Precedente</Text>
                  <View style={styles.modalStatValue}>
                    <IconSymbol
                      ios_icon_name="flame.fill"
                      android_material_icon_name="local_fire_department"
                      size={24}
                      color="#FF6B35"
                    />
                    <Text style={styles.modalStatNumber}>{previousStreak}</Text>
                  </View>
                </View>

                <View style={styles.modalStatDivider} />

                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Striscia Attuale</Text>
                  <View style={styles.modalStatValue}>
                    <IconSymbol
                      ios_icon_name="flame.fill"
                      android_material_icon_name="local_fire_department"
                      size={24}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.modalStatNumber}>0</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalInfoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.info}
                />
                <Text style={styles.modalInfoText}>
                  Non preoccuparti! I tuoi punti mensili sono stati preservati. Ricomincia a giocare questa settimana per ricostruire la tua striscia!
                </Text>
              </View>

              <Pressable
                style={styles.modalButton}
                onPress={closeMissedWeekModal}
              >
                <Text style={styles.modalButtonText}>Ricomincia a Giocare!</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  currentChallengeCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  lockedChallengeCard: {
    opacity: 0.6,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  challengeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
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
  currentChallengeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  lockedChallengeText: {
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
    borderWidth: 1,
    borderColor: colors.border,
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
  listIconExplored: {
    backgroundColor: '#E8F5E9',
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
  listDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
  listActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  exploreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  interestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  interestButtonActive: {
    backgroundColor: colors.primary,
  },
  interestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  interestButtonTextActive: {
    color: '#FFF',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIcon: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalStats: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalStatValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalStatNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  modalInfoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
