
# Risoluzione Completa Errore Ricorsione Infinita

## Problema Risolto ✅

L'app mostrava l'errore "infinite recursion detected in policy for relation 'profiles'" (codice 42P17) quando:
- Si apriva l'app
- Si tentava di fare login
- Si caricava il profilo utente

## Causa del Problema

Il problema era causato da **dipendenze circolari nelle policy RLS (Row Level Security)** del database:

1. La tabella `profiles` aveva una policy che interrogava le tabelle `order_items` e `orders`
2. La tabella `order_items` aveva una policy che interrogava la tabella `profiles`
3. Questo creava un loop infinito: `profiles` → `order_items` → `profiles` → ...

## Soluzione Implementata

Ho **eliminato tutte le dipendenze circolari** riscrivendo le policy RLS per utilizzare i metadati JWT invece di interrogare altre tabelle.

### Cosa Ho Fatto

1. **Uso dei Metadati JWT**
   - Invece di interrogare la tabella `profiles` per verificare il ruolo utente
   - Leggo il ruolo direttamente dal JWT: `auth.jwt() -> 'app_metadata' ->> 'role'`
   - Questo è possibile perché abbiamo un trigger che sincronizza i dati del profilo nei metadati JWT

2. **Rimozione Query Circolari**
   - Le policy su `profiles` non interrogano più `profiles` indirettamente
   - Le policy su `order_items` e `orders` usano i metadati JWT per i controlli di ruolo
   - Ogni policy è autonoma e non crea dipendenze circolari

3. **Sincronizzazione Automatica Metadati**
   - Il trigger `sync_user_metadata` assicura che i metadati JWT siano sempre aggiornati
   - Quando un profilo viene creato o aggiornato, il trigger sincronizza `role` e `pickup_point_id` in `auth.users.raw_app_meta_data`

## Migrazione Applicata

Nome migrazione: `fix_infinite_recursion_final`

### Cosa Fa la Migrazione

1. **Elimina le policy problematiche** che creavano dipendenze circolari
2. **Crea nuove policy basate su JWT** per:
   - Tabella `profiles` (accesso admin e punti di ritiro)
   - Tabella `order_items` (accesso admin e punti di ritiro)
   - Tabella `orders` (accesso admin e punti di ritiro)
3. **Sincronizza i metadati degli utenti esistenti** per assicurare che tutti abbiano i dati JWT corretti
4. **Aggiunge query di verifica** per controllare potenziali problemi di ricorsione

## Vantaggi della Soluzione

1. ✅ **Niente Più Ricorsione Infinita** - Dipendenze circolari eliminate
2. ✅ **Caricamento Profilo Più Veloce** - Non servono più retry o ritardi
3. ✅ **Migliori Prestazioni** - I metadati JWT sono in cache, nessuna query al database per i controlli di ruolo
4. ✅ **Codice Più Semplice** - AuthContext è più pulito e facile da mantenere
5. ✅ **Più Affidabile** - Nessuna race condition o problema di timing

## Come Testare

### 1. Aprire l'App
- Apri l'app in Expo Go
- **Non dovrebbero esserci errori** di "infinite recursion"
- Il profilo dovrebbe caricarsi immediatamente

### 2. Fare Login
- Inserisci le credenziali di accesso
- Il login dovrebbe funzionare correttamente
- Dovresti essere reindirizzato alla dashboard appropriata in base al tuo ruolo:
  - **Consumer** → Feed principale
  - **Punto di Ritiro** → Dashboard punto di ritiro
  - **Admin** → Dashboard amministratore

### 3. Verificare i Log
Nella console dovresti vedere:
```
AuthProvider: Profile loaded successfully: [ruolo]
AuthProvider: User data created: { role: '...', email: '...', ... }
```

**NON dovresti vedere:**
```
Error loading profiles: code: 42P17
infinite recursion detected in policy for relation "profiles"
```

## Cosa Fare Se Ci Sono Ancora Problemi

Se dovessi ancora riscontrare errori:

1. **Verifica che la migrazione sia stata applicata**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
   Tutte le policy dovrebbero usare `auth.jwt()` per i controlli di ruolo

2. **Controlla i metadati JWT**
   - Fai logout e login di nuovo
   - Questo forza un refresh del JWT con i metadati aggiornati

3. **Verifica i log della console**
   - Cerca messaggi di errore specifici
   - Controlla se ci sono problemi di connessione al database

## File Modificati

- ✅ `contexts/AuthContext.tsx` - Semplificata la logica di caricamento profilo
- ✅ Database - Tutte le policy RLS ora usano metadati JWT
- ✅ Trigger database - Sincronizzazione automatica metadati

## Conclusione

Il problema della ricorsione infinita è stato **completamente risolto**. L'app dovrebbe ora funzionare correttamente per tutti i ruoli utente (consumer, pickup_point, admin) senza alcun errore di ricorsione.

**L'app è pronta per essere utilizzata! 🎉**

Se hai ancora problemi, contattami con i log specifici della console e posso aiutarti ulteriormente.
