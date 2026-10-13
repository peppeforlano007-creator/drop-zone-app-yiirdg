
# Guida Completa: Notifiche Push e Badge per Produzione

Questa guida spiega come implementare le notifiche push con badge count (numero di notifiche non lette) per la tua app quando sarà pubblicata su Apple App Store e Google Play Store.

## Panoramica

Per sincronizzare le notifiche dell'app con l'icona sulla home dello smartphone, dovrai:

1. **Installare e configurare `expo-notifications`**
2. **Richiedere i permessi per le notifiche**
3. **Gestire il badge count (numero di notifiche non lette)**
4. **Configurare le credenziali per push notifications (APNs per iOS, FCM per Android)**
5. **Inviare notifiche push dal backend con badge count**

---

## 1. Installazione Dipendenze

La dipendenza `expo-notifications` è già presente nel tuo `package.json`, ma assicurati di averla installata:

```bash
npx expo install expo-notifications
```

---

## 2. Configurazione App (app.json)

Aggiungi la configurazione per `expo-notifications` nel tuo `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "sounds": [],
          "enableBackgroundRemoteNotifications": true
        }
      ]
    ],
    "notification": {
      "icon": "./assets/images/notification-icon.png",
      "color": "#007AFF",
      "androidMode": "default",
      "androidCollapsedTitle": "Nuove notifiche"
    }
  }
}
```

**Note importanti:**
- **`icon`**: Deve essere un'immagine PNG completamente bianca con sfondo trasparente (per Android)
- **`enableBackgroundRemoteNotifications`**: Abilita le notifiche in background su iOS
- **`color`**: Colore dell'icona di notifica su Android

---

## 3. Configurazione Credenziali Push Notifications

### iOS (APNs - Apple Push Notification service)

1. **Registrati su Apple Developer Program** (richiesto per pubblicare su App Store)
2. **Genera un APNs Key:**
   - Vai su [Apple Developer Console](https://developer.apple.com/account/resources/authkeys/list)
   - Crea una nuova chiave con il servizio "Apple Push Notifications service (APNs)"
   - Scarica il file `.p8` (conservalo in modo sicuro!)
   - Annota il **Key ID** e il **Team ID**

3. **Configura le credenziali con EAS:**
   ```bash
   eas credentials
   ```
   - Seleziona il progetto iOS
   - Seleziona "Push Notifications"
   - Carica il file `.p8` e inserisci Key ID e Team ID

### Android (FCM - Firebase Cloud Messaging)

1. **Crea un progetto Firebase:**
   - Vai su [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuovo progetto o usa uno esistente
   - Aggiungi un'app Android con il package name della tua app

2. **Ottieni il Server Key:**
   - Vai su **Project Settings** → **Cloud Messaging**
   - Copia il **Server Key** (o genera un nuovo token API)

3. **Configura le credenziali con EAS:**
   ```bash
   eas credentials
   ```
   - Seleziona il progetto Android
   - Seleziona "Push Notifications"
   - Incolla il Server Key di Firebase

---

## 4. Implementazione nel Codice

### 4.1 Configurazione Iniziale (app/_layout.tsx o index.ts)

Aggiungi questa configurazione all'inizio della tua app:

```typescript
import * as Notifications from 'expo-notifications';

// Configura come gestire le notifiche quando l'app è in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // IMPORTANTE: abilita l'aggiornamento del badge
  }),
});
```

### 4.2 Richiesta Permessi e Registrazione Token

Crea un file `utils/notificationHelpers.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Le notifiche push funzionano solo su dispositivi fisici
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  // Android: crea un canale di notifica (richiesto per Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifiche Generali',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true, // IMPORTANTE: abilita il badge su Android
    });
  }

  // Richiedi i permessi
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true, // IMPORTANTE: richiedi il permesso per il badge
        allowSound: true,
        allowAnnouncements: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission for push notifications was denied');
    return null;
  }

  // Ottieni il token Expo Push
  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error('Project ID not found');
    }

    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    token = pushToken.data;
    console.log('Expo Push Token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
}

// Funzione per aggiornare il badge count
export async function updateBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log('Badge count updated to:', count);
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
}

// Funzione per ottenere il badge count corrente
export async function getBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}
```

### 4.3 Integrazione nell'App

Modifica `app/_layout.tsx` per registrare il token e gestire le notifiche:

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, updateBadgeCount } from '@/utils/notificationHelpers';
import { supabase } from '@/app/integrations/supabase/client';

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Registra per le notifiche push
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        // Salva il token nel database per l'utente corrente
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('user_id', user.id);
        }
      }
    });

    // Listener per notifiche ricevute mentre l'app è aperta
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log('Notification received:', notification);
        
        // Aggiorna il badge count
        const currentBadge = await Notifications.getBadgeCountAsync();
        await updateBadgeCount(currentBadge + 1);
      }
    );

    // Listener per quando l'utente interagisce con una notifica
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('Notification response:', response);
        
        // Quando l'utente apre una notifica, riduci il badge count
        const currentBadge = await Notifications.getBadgeCountAsync();
        if (currentBadge > 0) {
          await updateBadgeCount(currentBadge - 1);
        }

        // Naviga alla schermata appropriata basandoti sui dati della notifica
        const data = response.notification.request.content.data;
        if (data?.screen) {
          // Usa expo-router per navigare
          // router.push(data.screen);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // ... resto del layout
}
```

### 4.4 Sincronizzazione Badge con Notifiche Non Lette

Modifica `app/(tabs)/notifications.tsx` per aggiornare il badge quando l'utente visualizza le notifiche:

```typescript
import { useEffect } from 'react';
import { updateBadgeCount } from '@/utils/notificationHelpers';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    setNotifications(data || []);
    
    // Conta le notifiche non lette
    const unread = data?.filter(n => !n.read).length || 0;
    setUnreadCount(unread);
    
    // Aggiorna il badge
    await updateBadgeCount(unread);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      // Ricarica le notifiche per aggiornare il badge
      await loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      await updateBadgeCount(0);
      await loadNotifications();
    }
  };

  // ... resto del componente
}
```

---

## 5. Aggiornamento Database

Aggiungi una colonna per salvare il push token degli utenti:

```sql
-- Aggiungi colonna push_token alla tabella profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Crea un indice per velocizzare le query
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
```

---

## 6. Invio Notifiche Push dal Backend

### 6.1 Usando Expo Push Notification Service

Crea una Supabase Edge Function per inviare notifiche:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface NotificationPayload {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: any;
  badge?: number; // IMPORTANTE: numero da mostrare sul badge
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

serve(async (req) => {
  try {
    const { userIds, title, body, data, badge } = await req.json();

    // Ottieni i push token degli utenti
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('push_token')
      .in('user_id', userIds)
      .not('push_token', 'is', null);

    if (error) throw error;

    const messages: NotificationPayload[] = profiles.map((profile) => ({
      to: profile.push_token,
      title,
      body,
      data,
      badge, // Numero da mostrare sul badge
      sound: 'default',
      priority: 'high',
    }));

    // Invia le notifiche tramite Expo Push Notification Service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 6.2 Esempio di Invio Notifica con Badge Count

Quando crei una notifica nel database, invia anche la push notification:

```typescript
// Esempio: quando un drop viene attivato
const sendDropActivatedNotification = async (dropId: string) => {
  // 1. Crea le notifiche nel database
  const { data: drop } = await supabase
    .from('drops')
    .select('*, pickup_points(*)')
    .eq('id', dropId)
    .single();

  // Ottieni tutti gli utenti interessati
  const { data: users } = await supabase
    .from('user_interests')
    .select('user_id')
    .eq('pickup_point_id', drop.pickup_point_id);

  const userIds = users.map(u => u.user_id);

  // Crea notifiche nel database
  const notifications = userIds.map(userId => ({
    user_id: userId,
    title: 'Drop Attivato!',
    message: `Il drop "${drop.name}" è ora attivo!`,
    type: 'drop_activated',
    related_id: dropId,
    related_type: 'drop',
    read: false,
  }));

  await supabase.from('notifications').insert(notifications);

  // 2. Per ogni utente, conta le notifiche non lette e invia push notification
  for (const userId of userIds) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    // Invia push notification con badge count
    await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: [userId],
        title: 'Drop Attivato!',
        body: `Il drop "${drop.name}" è ora attivo!`,
        data: {
          screen: `/drop-details?id=${dropId}`,
          dropId,
        },
        badge: count || 0, // IMPORTANTE: numero di notifiche non lette
      },
    });
  }
};
```

---

## 7. Testing

### Durante lo Sviluppo (Expo Go)

**IMPORTANTE:** Le notifiche push **NON** funzionano in Expo Go su Android da SDK 53+. 
Devi creare un **development build**:

```bash
# Crea un development build
eas build --profile development --platform android
eas build --profile development --platform ios

# Oppure esegui localmente
npx expo run:android
npx expo run:ios
```

### Test su Dispositivo Fisico

1. Installa il development build sul tuo dispositivo
2. Apri l'app e accetta i permessi per le notifiche
3. Verifica che il token venga salvato nel database
4. Invia una notifica di test usando l'Expo Push Notification Tool:
   - Vai su https://expo.dev/notifications
   - Inserisci il tuo Expo Push Token
   - Imposta il `badge` a un numero (es. 5)
   - Invia la notifica
5. Verifica che:
   - La notifica appaia nella barra delle notifiche
   - Il badge sull'icona dell'app mostri il numero corretto
   - Quando apri la notifica, il badge si aggiorni

---

## 8. Pubblicazione su Store

### iOS (App Store)

1. **Build di produzione:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Verifica configurazione APNs:**
   - Assicurati che le credenziali APNs siano configurate correttamente
   - Xcode cambierà automaticamente l'entitlement da 'development' a 'production'

3. **Test in TestFlight:**
   - Carica la build su TestFlight
   - Testa le notifiche push in ambiente di produzione

### Android (Play Store)

1. **Build di produzione:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Verifica configurazione FCM:**
   - Assicurati che il Server Key di Firebase sia configurato
   - Verifica che il package name corrisponda

3. **Test in Internal Testing:**
   - Carica la build su Play Console
   - Testa le notifiche push in ambiente di produzione

---

## 9. Best Practices

### Gestione Badge Count

- **Aggiorna sempre il badge quando:**
  - Una nuova notifica viene ricevuta
  - L'utente legge una notifica
  - L'utente apre la schermata notifiche
  - L'utente marca tutte le notifiche come lette

- **Resetta il badge a 0 quando:**
  - L'utente ha letto tutte le notifiche
  - L'utente fa logout

### Performance

- **Non inviare troppe notifiche:**
  - Apple raccomanda di non inviare più di 2-3 notifiche all'ora
  - Raggruppa le notifiche quando possibile

- **Usa priorità appropriate:**
  - `high`: per notifiche urgenti (drop attivato, ordine pronto)
  - `normal`: per notifiche informative (nuovo prodotto)

### Privacy e Permessi

- **Richiedi i permessi al momento giusto:**
  - Non richiedere i permessi all'avvio dell'app
  - Spiega all'utente perché hai bisogno dei permessi
  - Richiedi i permessi quando l'utente compie un'azione che richiede notifiche

---

## 10. Troubleshooting

### Il badge non si aggiorna su iOS

- Verifica di aver richiesto il permesso `allowBadge: true`
- Controlla che `shouldSetBadge: true` sia impostato nel notification handler
- Assicurati di chiamare `setBadgeCountAsync()` dopo ogni modifica

### Il badge non si aggiorna su Android

- Verifica che il launcher supporti i badge (non tutti i launcher Android li supportano)
- Controlla che `showBadge: true` sia impostato nel notification channel
- Alcuni launcher richiedono permessi aggiuntivi

### Le notifiche non arrivano

- Verifica che il token sia salvato correttamente nel database
- Controlla i log di Expo Push Notification Service per errori
- Assicurati che le credenziali APNs/FCM siano configurate correttamente
- Verifica che l'app non sia in modalità "Non disturbare"

### Le notifiche non funzionano in Expo Go

- Le notifiche push non funzionano in Expo Go su Android da SDK 53+
- Devi creare un development build con `eas build` o `npx expo run:android/ios`

---

## Riepilogo

Questa guida ti ha mostrato come:

1. ✅ Configurare `expo-notifications` per iOS e Android
2. ✅ Richiedere i permessi per notifiche e badge
3. ✅ Registrare il dispositivo per ricevere push notifications
4. ✅ Gestire il badge count (numero di notifiche non lette)
5. ✅ Inviare notifiche push dal backend con badge count
6. ✅ Sincronizzare il badge con le notifiche nel database
7. ✅ Testare le notifiche durante lo sviluppo
8. ✅ Pubblicare l'app su App Store e Play Store con notifiche funzionanti

Quando l'app sarà pubblicata sugli store, gli utenti vedranno:
- **Notifiche push** quando l'app è chiusa o in background
- **Badge sull'icona** con il numero di notifiche non lette
- **Anteprima della notifica** sulla schermata di blocco e nella barra delle notifiche

---

## Risorse Utili

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Push Notification Tool](https://expo.dev/notifications)
