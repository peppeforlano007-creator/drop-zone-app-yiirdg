
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';

// Configura come vengono mostrate le notifiche quando l'app è in foreground
// Wrapped in try/catch so a crash before the native runtime is ready (e.g. TestFlight cold-start)
// does not take down the whole app.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  console.log('[PushNotifications] setNotificationHandler registered');
} catch (e) {
  console.warn('[PushNotifications] setNotificationHandler failed (non-fatal):', e);
}

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Push notifications non disponibili su simulatore');
      return null;
    }

    // Richiedi permessi
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[PushNotifications] Richiedendo permessi notifiche...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[PushNotifications] Risposta permessi:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permesso notifiche negato');
      return null;
    }

    // Canale Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        showBadge: true,
      });
    }

    console.log('[PushNotifications] Calling getExpoPushTokenAsync with projectId: 587d28f9-01b5-4121-aa8e-4d77ee7b13ae, experienceId: @giuseppeforlano/rdn-street-stock-market');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '587d28f9-01b5-4121-aa8e-4d77ee7b13ae',
      experienceId: '@giuseppeforlano/rdn-street-stock-market',
    });
    const token = tokenData.data;
    console.log('[PushNotifications] Push token ottenuto:', token);

    if (token && userId) {
      // Salva il token nel profilo utente su Supabase (con un retry in caso di errore)
      console.log('[PushNotifications] Saving push token to Supabase for user:', userId);
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('user_id', userId);

      if (error) {
        console.warn('[PushNotifications] Errore salvataggio push token (attempt 1):', error.message, '— retrying in 3s...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const { error: retryError } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('user_id', userId);
        if (retryError) {
          console.error('[PushNotifications] Errore salvataggio push token (attempt 2 — giving up):', retryError.message);
        } else {
          console.log('[PushNotifications] Push token salvato con successo (retry) per utente:', userId);
        }
      } else {
        console.log('[PushNotifications] Push token salvato con successo per utente:', userId);
      }
    }

    return token;
  } catch (error) {
    console.error('[PushNotifications] Push notification registration failed:', error);
    return null;
  }
}

export async function updateBadgeCount(count: number): Promise<void> {
  try {
    console.log('[PushNotifications] updateBadgeCount:', count);
    await Notifications.setBadgeCountAsync(count);
  } catch (e) {
    console.warn('[PushNotifications] setBadgeCountAsync failed:', e);
  }
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    console.log('[PushNotifications] Invio push notification a token:', pushToken, '| titolo:', title);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[PushNotifications] Errore HTTP invio push:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('[PushNotifications] Push notification inviata con successo:', result);
  } catch (error) {
    console.warn('[PushNotifications] Errore invio push notification (non-fatal):', error);
  }
}
