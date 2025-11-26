
# Test per Verifica Risoluzione Ricorsione Infinita

## Test da Eseguire nel Database

### 1. Verifica Policy RLS

```sql
-- Dovrebbero esserci 7 policy sulla tabella profiles
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'Usa auth.uid() ✓'
    WHEN qual LIKE '%auth.jwt()%' THEN 'Usa JWT metadata ✓'
    ELSE 'Altro'
  END as tipo_policy
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
```

**Risultato atteso:** 7 policy, nessuna che interroga direttamente la tabella profiles

### 2. Verifica Metadati Utenti

```sql
-- Tutti gli utenti dovrebbero avere role nei metadati
SELECT 
  u.id,
  u.email,
  u.raw_app_meta_data->>'role' as jwt_role,
  p.role as profile_role,
  CASE 
    WHEN u.raw_app_meta_data->>'role' = p.role THEN '✓ Sincronizzato'
    ELSE '✗ NON Sincronizzato'
  END as stato
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;
```

**Risultato atteso:** Tutti gli utenti hanno `✓ Sincronizzato`

### 3. Verifica Funzioni Helper

```sql
-- Verifica che le funzioni esistano e siano STABLE SECURITY DEFINER
SELECT 
  proname as nome_funzione,
  CASE provolatile
    WHEN 's' THEN '✓ STABLE'
    WHEN 'i' THEN '✗ IMMUTABLE'
    WHEN 'v' THEN '✗ VOLATILE'
  END as volatilita,
  CASE prosecdef
    WHEN true THEN '✓ SECURITY DEFINER'
    ELSE '✗ NO SECURITY DEFINER'
  END as security
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_pickup_point', 'get_user_pickup_point_id')
ORDER BY proname;
```

**Risultato atteso:** Tutte le funzioni sono STABLE e SECURITY DEFINER

### 4. Verifica Trigger

```sql
-- Verifica che il trigger sync_user_metadata esista e sia abilitato
SELECT 
  tgname as nome_trigger,
  tgenabled as abilitato,
  CASE tgenabled
    WHEN 'O' THEN '✓ Abilitato'
    WHEN 'D' THEN '✗ Disabilitato'
  END as stato
FROM pg_trigger 
WHERE tgname = 'sync_user_metadata_trigger';
```

**Risultato atteso:** Trigger abilitato (O)

## Test da Eseguire nell'App

### Test 1: Apertura App

1. Apri l'app in Expo Go
2. **Verifica:** Non dovrebbero apparire errori nella console
3. **Verifica:** Non dovrebbe apparire l'errore "Error loading profiles"

**Log attesi:**
```
AuthProvider: Initializing...
AuthProvider: Initial session: [user_id o null]
```

**Log NON attesi:**
```
Error loading profiles: code: 42P17
infinite recursion detected
```

### Test 2: Login Utente Consumer

1. Vai alla schermata di login
2. Inserisci credenziali di un utente consumer
3. Premi "Accedi"

**Verifica:**
- ✅ Login completato con successo
- ✅ Profilo caricato correttamente
- ✅ Reindirizzamento alla home
- ✅ Nessun errore 42P17 nei log

**Log attesi:**
```
AuthProvider: Logging in user: [email]
AuthProvider: User logged in successfully: [user_id]
AuthProvider: JWT app_metadata: { role: 'consumer', ... }
AuthProvider: Loading profile for user: [user_id] (attempt 1)
AuthProvider: Refreshing session to get latest JWT...
AuthProvider: Session refreshed successfully
AuthProvider: Profile loaded successfully: consumer
```

### Test 3: Login Punto di Ritiro

1. Vai alla schermata di login
2. Inserisci credenziali di un punto di ritiro
3. Premi "Accedi"

**Verifica:**
- ✅ Login completato con successo
- ✅ Profilo caricato correttamente
- ✅ Reindirizzamento alla dashboard punto di ritiro
- ✅ pickup_point_id presente nel profilo
- ✅ Nessun errore 42P17 nei log

**Log attesi:**
```
AuthProvider: Logging in user: [email]
AuthProvider: User logged in successfully: [user_id]
AuthProvider: JWT app_metadata: { role: 'pickup_point', pickup_point_id: '[uuid]' }
AuthProvider: Profile loaded successfully: pickup_point
AuthProvider: User data created: { role: 'pickup_point', pickupPointId: '[uuid]', ... }
```

### Test 4: Login Amministratore

1. Vai alla schermata di login
2. Inserisci credenziali di un amministratore
3. Premi "Accedi"

**Verifica:**
- ✅ Login completato con successo
- ✅ Profilo caricato correttamente
- ✅ Reindirizzamento alla dashboard admin
- ✅ Statistiche caricate correttamente
- ✅ Nessun errore 42P17 nei log

**Log attesi:**
```
AuthProvider: Logging in user: [email]
AuthProvider: User logged in successfully: [user_id]
AuthProvider: JWT app_metadata: { role: 'admin' }
AuthProvider: Profile loaded successfully: admin
Admin Dashboard: Loading stats...
```

### Test 5: Registrazione Nuovo Utente

1. Vai alla schermata di registrazione
2. Compila tutti i campi
3. Seleziona un punto di ritiro
4. Premi "Registrati"

**Verifica:**
- ✅ Registrazione completata con successo
- ✅ Messaggio di verifica email mostrato
- ✅ Profilo creato nel database
- ✅ Metadati sincronizzati nel JWT
- ✅ Nessun errore 42P17 nei log

**Log attesi:**
```
AuthProvider: Registering user: [email] consumer pickup_point_id: [uuid]
AuthProvider: User registered successfully: [user_id]
AuthProvider: Profile will be created automatically by database trigger
```

**Verifica nel database:**
```sql
-- Verifica che il nuovo utente abbia i metadati corretti
SELECT 
  u.email,
  u.raw_app_meta_data->>'role' as jwt_role,
  p.role as profile_role,
  u.raw_app_meta_data->>'pickup_point_id' as jwt_pickup_point,
  p.pickup_point_id as profile_pickup_point
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
WHERE u.email = '[email_nuovo_utente]';
```

### Test 6: Dashboard Admin - Caricamento Statistiche

1. Accedi come amministratore
2. Vai alla dashboard admin
3. Osserva il caricamento delle statistiche

**Verifica:**
- ✅ Statistiche caricate correttamente
- ✅ Conteggio utenti visualizzato
- ✅ Conteggio fornitori visualizzato
- ✅ Nessun errore nei log

**Log attesi:**
```
Admin Dashboard: Loading stats...
```

**Log NON attesi:**
```
Error loading users count: { code: '42P17', ... }
Error loading profiles: code: 42P17
```

### Test 7: Dashboard Punto di Ritiro

1. Accedi come punto di ritiro
2. Vai alla dashboard punto di ritiro
3. Osserva il caricamento dei dati

**Verifica:**
- ✅ Dati punto di ritiro caricati
- ✅ Statistiche ordini visualizzate
- ✅ Nessun errore nei log

**Log attesi:**
```
Loading dashboard data for pickup point: [uuid]
Pickup point loaded: [nome]
Active orders count: [numero]
```

## Checklist Finale

- [ ] Tutte le policy RLS sono state ricreate
- [ ] Tutti gli utenti hanno metadati sincronizzati
- [ ] Le funzioni helper sono STABLE SECURITY DEFINER
- [ ] Il trigger sync_user_metadata è abilitato
- [ ] L'app si apre senza errori 42P17
- [ ] Il login funziona per tutti i ruoli
- [ ] La registrazione crea correttamente i metadati
- [ ] Le dashboard caricano i dati senza errori
- [ ] I log non mostrano errori di ricorsione infinita

## Se Qualcosa Non Funziona

### Errore persiste all'apertura dell'app

1. Verifica che la migrazione sia stata applicata:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE name = 'fix_infinite_recursion_complete_solution';
   ```

2. Se la migrazione non c'è, applicala manualmente

3. Riavvia l'app completamente (chiudi e riapri)

### Errore persiste al login

1. Verifica i metadati dell'utente:
   ```sql
   SELECT raw_app_meta_data FROM auth.users WHERE email = '[email]';
   ```

2. Se i metadati sono vuoti, sincronizzali manualmente:
   ```sql
   UPDATE auth.users u
   SET raw_app_meta_data = 
     COALESCE(raw_app_meta_data, '{}'::jsonb) || 
     jsonb_build_object('role', p.role, 'pickup_point_id', p.pickup_point_id)
   FROM profiles p
   WHERE p.user_id = u.id AND u.email = '[email]';
   ```

3. Esci e rientra nell'app

### Dashboard non carica i dati

1. Verifica che l'utente sia autenticato:
   ```typescript
   console.log('User:', user);
   console.log('Session:', session);
   ```

2. Verifica le policy RLS sulla tabella che non carica

3. Controlla i log del database per errori specifici

## Conclusione

Se tutti i test passano, la ricorsione infinita è stata risolta definitivamente! 🎉

L'app è ora completamente funzionante per:
- ✅ Utenti consumer
- ✅ Punti di ritiro
- ✅ Amministratori
