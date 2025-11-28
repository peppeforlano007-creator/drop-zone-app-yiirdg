
# Guida Rapida: Test Autenticazione Admin

## 🔍 Problema Attuale

Quando clicchi su "Test Autenticazione" nel pannello admin (Testing e Diagnostics), ricevi l'errore:

```
Authentication failed: invalid login credentials
```

## 🎯 Cause Possibili

### 1. Email Non Confermata

**Problema**: L'utente di test non ha confermato l'email

**Verifica**:
1. Vai su Supabase Dashboard
2. Authentication → Users
3. Cerca l'utente `test@example.com`
4. Controlla la colonna "Email Confirmed"

**Soluzione A** - Conferma Manualmente:
1. Nel Dashboard Supabase → Authentication → Users
2. Trova l'utente
3. Clicca sui tre puntini (...)
4. Seleziona "Confirm Email"

**Soluzione B** - Disabilita Conferma Email (Solo per Testing):
1. Dashboard Supabase → Authentication → Providers → Email
2. Disabilita "Confirm email"
3. ⚠️ Ricorda di riabilitarla per produzione!

### 2. Link Email Non Funzionanti

**Problema**: I link nelle email di conferma non funzionano

**Causa**: Site URL e Redirect URLs non configurati

**Soluzione**: Vedi sezione "Configurazione Supabase" sotto

### 3. Utente Non Esiste

**Problema**: L'utente di test non è stato creato

**Verifica**:
1. Dashboard Supabase → Authentication → Users
2. Cerca `test@example.com`

**Soluzione**: Crea l'utente manualmente o tramite registrazione app

## 🔧 Configurazione Supabase (Risolve i Link Email)

### Passo 1: Configura Site URL

1. Dashboard Supabase → Authentication → URL Configuration
2. **Site URL**: Imposta uno di questi:
   ```
   Produzione: https://your-domain.com
   Sviluppo: http://localhost:19006
   Temporaneo: https://sippdylyuzejudmzbwdn.supabase.co
   ```

### Passo 2: Aggiungi Redirect URLs

Nella stessa pagina, aggiungi questi URL (uno per riga):

```
dropzone://email-confirmed
dropzone://update-password
http://localhost:19006/email-confirmed
http://localhost:19006/update-password
https://sippdylyuzejudmzbwdn.supabase.co/email-confirmed
https://sippdylyuzejudmzbwdn.supabase.co/update-password
```

### Passo 3: Aggiorna Email Template

1. Dashboard Supabase → Authentication → Email Templates
2. Seleziona "Confirm signup"
3. Sostituisci il contenuto con:

```html
<h2>Conferma la tua registrazione</h2>

<p>Grazie per esserti registrato!</p>

<p>Clicca sul link qui sotto per confermare il tuo account:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
    Conferma Email
  </a>
</p>

<p>Oppure copia questo link:</p>
<p>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email</p>

<p>Link valido per 24 ore.</p>
```

4. Clicca "Save"

## 🧪 Test Rapido

### Opzione 1: Test con Utente Esistente

1. **Trova un utente confermato**:
   - Dashboard Supabase → Authentication → Users
   - Cerca un utente con "Email Confirmed" = ✅
   - Annota email e resetta la password se necessario

2. **Modifica il test**:
   - Apri `utils/testHelpers.ts`
   - Trova la funzione `testAuthentication`
   - Cambia email e password con quelle dell'utente confermato

3. **Esegui il test**:
   - Admin Panel → Testing e Diagnostics
   - Clicca "Test Autenticazione"

### Opzione 2: Crea Nuovo Utente di Test

1. **Crea utente manualmente**:
   ```sql
   -- Esegui in Supabase SQL Editor
   
   -- 1. Crea utente in auth.users
   INSERT INTO auth.users (
     id,
     email,
     encrypted_password,
     email_confirmed_at,
     created_at,
     updated_at,
     raw_user_meta_data,
     role
   ) VALUES (
     gen_random_uuid(),
     'admin-test@example.com',
     crypt('TestPassword123', gen_salt('bf')),
     now(),
     now(),
     now(),
     '{"full_name": "Admin Test", "role": "admin"}'::jsonb,
     'authenticated'
   );
   
   -- 2. Crea profilo
   INSERT INTO public.profiles (
     user_id,
     email,
     full_name,
     role
   )
   SELECT 
     id,
     email,
     'Admin Test',
     'admin'
   FROM auth.users
   WHERE email = 'admin-test@example.com';
   ```

2. **Usa queste credenziali**:
   - Email: `admin-test@example.com`
   - Password: `TestPassword123`

### Opzione 3: Disabilita Conferma Email (Temporaneo)

1. Dashboard Supabase → Authentication → Providers → Email
2. **Disabilita** "Confirm email"
3. Registra un nuovo utente tramite app
4. Testa il login
5. ⚠️ **Riabilita** "Confirm email" dopo il test!

## 📊 Verifica Risultati

### Test Riuscito ✅

Dovresti vedere:

```
✅ Test Autenticazione
Autenticazione riuscita
Durata: XXXms
```

### Test Fallito ❌

Se vedi ancora errori:

1. **Controlla i logs**:
   - Dashboard Supabase → Logs
   - Filtra per "auth"
   - Cerca errori recenti

2. **Verifica credenziali**:
   - Email corretta?
   - Password corretta?
   - Utente esiste?
   - Email confermata?

3. **Testa manualmente**:
   ```bash
   # Usa curl o Postman
   curl -X POST 'https://sippdylyuzejudmzbwdn.supabase.co/auth/v1/token?grant_type=password' \
     -H 'apikey: YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

## 🔑 Trova le Chiavi API

Se hai bisogno delle chiavi API per test manuali:

1. Dashboard Supabase → Project Settings → API
2. **Project URL**: `https://sippdylyuzejudmzbwdn.supabase.co`
3. **anon/public key**: Copia la chiave "anon public"

## 🚀 Soluzione Rapida (5 minuti)

Se hai poco tempo, fai questo:

1. **Disabilita conferma email** (temporaneo):
   - Dashboard → Authentication → Providers → Email
   - Disabilita "Confirm email"

2. **Crea nuovo utente**:
   - Apri l'app
   - Registrati con:
     - Nome: Test User
     - Phone: +39 123 456 7890
     - Email: quicktest@example.com
     - Password: QuickTest123

3. **Testa login**:
   - Admin Panel → Testing
   - Modifica email in `testHelpers.ts` se necessario
   - Esegui test

4. **Riabilita conferma email**:
   - Dashboard → Authentication → Providers → Email
   - Abilita "Confirm email"

## 📞 Ancora Problemi?

Se il test continua a fallire:

1. **Controlla console browser**:
   - Apri DevTools (F12)
   - Guarda la tab Console
   - Cerca errori in rosso

2. **Controlla logs Supabase**:
   - Dashboard → Logs
   - Cerca errori di autenticazione

3. **Verifica database**:
   ```sql
   -- Controlla se l'utente esiste
   SELECT 
     u.email,
     u.email_confirmed_at,
     p.role,
     p.full_name
   FROM auth.users u
   LEFT JOIN public.profiles p ON p.user_id = u.id
   WHERE u.email = 'test@example.com';
   ```

4. **Leggi documentazione completa**:
   - `docs/PHONE_AUTH_AND_EMAIL_FIX.md`
   - `docs/SUPABASE_PHONE_AUTH_CONFIGURATION.md`

## ✅ Checklist Finale

- [ ] Site URL configurato in Supabase
- [ ] Redirect URLs aggiunti
- [ ] Email template aggiornato
- [ ] Utente di test creato
- [ ] Email utente confermata (o conferma disabilitata)
- [ ] Test autenticazione eseguito con successo
- [ ] Conferma email riabilitata (se disabilitata)

## 🎯 Risultato Atteso

Dopo aver seguito questa guida, il test di autenticazione nel pannello admin dovrebbe funzionare correttamente e mostrare:

```
✅ Tutti i Test Superati
Tutti i test sono stati completati con successo!
```
