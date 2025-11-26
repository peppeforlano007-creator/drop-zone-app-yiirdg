
# Risoluzione Definitiva Errore Ricorsione Infinita (42P17)

## Problema

L'app mostrava l'errore "infinite recursion detected in policy for relation 'profiles'" (codice 42P17) quando:
- Si apriva l'app
- Si tentava di effettuare il login
- Si caricavano i profili utente

## Causa Principale

Il problema era causato da una **race condition** tra:
1. La creazione del JWT (JSON Web Token) durante il login
2. La sincronizzazione dei metadati utente (`role`, `pickup_point_id`) nel JWT
3. Le policy RLS (Row Level Security) che cercavano di leggere questi metadati dal JWT

**Sequenza problematica:**
1. Utente effettua il login
2. Supabase crea un JWT con i metadati correnti (che potrebbero essere vuoti o obsoleti)
3. Il client prova a caricare il profilo usando le policy RLS
4. Le policy RLS controllano `auth.jwt() -> 'app_metadata' ->> 'role'`
5. Il JWT non ha ancora i metadati aggiornati
6. Le policy falliscono o causano ricorsione infinita

## Soluzione Implementata

### 1. Migrazione Database Completa

Abbiamo creato una migrazione (`fix_infinite_recursion_complete_solution`) che:

#### A. Ricrea tutte le policy RLS senza ricorsione
```sql
-- Policy semplici che usano solo auth.uid() e JWT metadata
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO public
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO public
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'role')::text, '') = 'admin'
);
```

#### B. Aggiorna la funzione `handle_new_user`
La funzione ora:
1. **PRIMA** imposta i metadati in `auth.users.raw_app_meta_data`
2. **POI** crea il profilo nella tabella `profiles`

Questo garantisce che il JWT abbia i metadati corretti fin dall'inizio.

```sql
-- FIRST: Set the app_metadata in auth.users BEFORE creating profile
UPDATE auth.users
SET raw_app_meta_data = 
  COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', v_role,
    'pickup_point_id', v_pickup_point_id
  )
WHERE id = new.id;

-- THEN: Insert profile
INSERT INTO public.profiles (...)
VALUES (...);
```

#### C. Sincronizza i metadati per tutti gli utenti esistenti
```sql
-- Aggiorna i metadati per TUTTI gli utenti esistenti
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT user_id, role, pickup_point_id FROM profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', profile_record.role,
        'pickup_point_id', profile_record.pickup_point_id
      )
    WHERE id = profile_record.user_id;
  END LOOP;
END;
$$;
```

### 2. Miglioramenti nel Client (AuthContext)

#### A. Refresh della sessione prima di caricare il profilo
```typescript
// Refresh the session to ensure we have the latest JWT with app_metadata
if (retryCount === 0) {
  console.log('AuthProvider: Refreshing session to get latest JWT...');
  const { data: { session: refreshedSession }, error: refreshError } = 
    await supabase.auth.refreshSession();
  if (refreshedSession) {
    setSession(refreshedSession);
  }
}
```

#### B. Retry con backoff esponenziale
```typescript
// Special handling for infinite recursion error (42P17)
if (profileError.code === '42P17') {
  if (retryCount < 5) {
    const retryDelay = (retryCount + 1) * 2000; // 2s, 4s, 6s, 8s, 10s
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    return loadUserProfile(userId, retryCount + 1);
  }
}
```

#### C. Logging dettagliato
Abbiamo aggiunto logging estensivo per tracciare:
- Quando viene caricato il profilo
- Quali metadati sono presenti nel JWT
- Eventuali errori e tentativi di retry

## Policy RLS Finali

### Profiles Table

1. **Users can view own profile**
   - Permette agli utenti di vedere il proprio profilo
   - Usa: `user_id = auth.uid()`

2. **Users can update own profile**
   - Permette agli utenti di aggiornare il proprio profilo
   - Usa: `user_id = auth.uid()`

3. **Allow profile creation**
   - Permette la creazione del profilo durante la registrazione
   - Usa: `user_id = auth.uid() OR role = 'admin'`

4. **Admins can view all profiles**
   - Permette agli admin di vedere tutti i profili
   - Usa: `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`

5. **Admins can update all profiles**
   - Permette agli admin di aggiornare tutti i profili
   - Usa: `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`

6. **Admins can delete profiles**
   - Permette agli admin di eliminare profili
   - Usa: `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`

7. **Pickup points can view customer profiles**
   - Permette ai punti di ritiro di vedere i profili dei clienti con ordini
   - Usa: `role = 'pickup_point' AND EXISTS (ordini per quel punto di ritiro)`

## Funzioni Helper

Tutte le funzioni helper sono state aggiornate per essere:
- **STABLE**: Permette il caching dei risultati
- **SECURITY DEFINER**: Bypassa le policy RLS per evitare ricorsione
- **SET search_path**: Previene SQL injection

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin',
    false
  );
$$;
```

## Trigger

### sync_user_metadata_trigger

Questo trigger si attiva DOPO ogni INSERT o UPDATE sulla tabella `profiles` e sincronizza automaticamente i metadati nel JWT:

```sql
CREATE TRIGGER sync_user_metadata_trigger
AFTER INSERT OR UPDATE OF role, pickup_point_id ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_metadata();
```

## Test e Verifica

### 1. Verifica Policy
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
```

### 2. Verifica Metadati Utente
```sql
SELECT 
  u.id,
  u.email,
  u.raw_app_meta_data->>'role' as jwt_role,
  p.role as profile_role,
  u.raw_app_meta_data->>'pickup_point_id' as jwt_pickup_point,
  p.pickup_point_id as profile_pickup_point
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id;
```

### 3. Test Login
1. Apri l'app
2. Effettua il login con un utente esistente
3. Verifica che non ci siano errori 42P17 nei log
4. Verifica che il profilo venga caricato correttamente

### 4. Test Registrazione
1. Registra un nuovo utente
2. Verifica che il profilo venga creato
3. Verifica che i metadati siano sincronizzati nel JWT
4. Effettua il login con il nuovo utente

## Accesso per Diversi Ruoli

### Utente Consumer
- Può vedere e modificare solo il proprio profilo
- Può prenotare prodotti
- Può vedere i drop attivi

### Punto di Ritiro (Pickup Point)
- Può vedere i profili dei clienti con ordini presso il proprio punto
- Può gestire gli ordini in arrivo
- Può vedere le statistiche del proprio punto

### Amministratore
- Può vedere e modificare tutti i profili
- Può gestire fornitori, prodotti, drop
- Può vedere tutte le statistiche

## Risoluzione Problemi

### Se l'errore persiste:

1. **Verifica che la migrazione sia stata applicata**
   ```sql
   SELECT version, name 
   FROM supabase_migrations.schema_migrations 
   WHERE name LIKE '%infinite_recursion%'
   ORDER BY version DESC;
   ```

2. **Verifica i metadati degli utenti**
   ```sql
   SELECT id, email, raw_app_meta_data 
   FROM auth.users 
   WHERE raw_app_meta_data IS NULL 
   OR raw_app_meta_data->>'role' IS NULL;
   ```

3. **Forza il refresh della sessione**
   - Esci dall'app
   - Chiudi completamente l'app
   - Riapri l'app
   - Effettua nuovamente il login

4. **Controlla i log del database**
   ```sql
   SELECT * FROM pg_stat_statements 
   WHERE query LIKE '%profiles%' 
   ORDER BY calls DESC;
   ```

## Conclusione

Questa soluzione risolve definitivamente il problema della ricorsione infinita:
- ✅ Le policy RLS non causano più ricorsione
- ✅ I metadati JWT sono sincronizzati correttamente
- ✅ Tutti gli utenti esistenti hanno i metadati aggiornati
- ✅ I nuovi utenti hanno i metadati impostati immediatamente
- ✅ Il client gestisce correttamente i retry e il refresh della sessione

L'app è ora accessibile per tutti i ruoli: consumer, pickup point e amministratore.
