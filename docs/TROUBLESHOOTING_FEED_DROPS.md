
# Risoluzione Problemi Feed e Drops

## Problemi Identificati

### 1. Feed Principale Mostra Solo 1/2 Liste

**Sintomo**: Nel feed principale viene visualizzata solo 1 lista su 2 disponibili (Yoox invece di Yoox + Westwing).

**Causa**: Il codice di caricamento è corretto. Il problema potrebbe essere:
- Cache del browser/app
- Problema temporaneo di sincronizzazione
- Filtro RLS che blocca l'accesso a una delle liste

**Soluzione Implementata**:
- Aggiunto logging dettagliato in `app/(tabs)/(home)/index.tsx` per tracciare ogni fase del caricamento
- Il logging ora mostra:
  - Numero di prodotti caricati
  - ID delle liste univoche trovate
  - Dettagli di ogni lista caricata
  - Prodotti raggruppati per lista
  - Liste filtrate e incluse nel risultato finale

**Come Verificare**:
1. Apri l'app e vai al feed principale
2. Controlla i log della console (usa `npx expo start` e guarda il terminale)
3. Cerca le sezioni:
   - `=== LOADING PRODUCTS ===`
   - `=== GROUPING PRODUCTS BY LIST ===`
   - `=== FILTERING LISTS ===`
   - `=== FINAL RESULT ===`
4. Verifica che entrambe le liste (Yoox e Westwing) siano presenti

**Se il problema persiste**:
```sql
-- Verifica che entrambe le liste siano attive
SELECT id, name, status FROM supplier_lists WHERE status = 'active';

-- Verifica che ci siano prodotti per entrambe le liste
SELECT 
  supplier_list_id,
  COUNT(*) as product_count
FROM products
WHERE status = 'active'
GROUP BY supplier_list_id;

-- Verifica le policy RLS
SELECT * FROM pg_policies WHERE tablename = 'supplier_lists';
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### 2. Nessun Drop Visibile nella Sezione Drops

**Sintomo**: La sezione drops è vuota anche dopo aver "approvato" un drop.

**Causa**: 
- Non ci sono drops nel database
- Il sistema automatico crea drops solo quando si raggiunge il valore minimo di prenotazioni
- Per la lista Yoox: valore attuale €1,482 < valore minimo €2,000

**Soluzione Implementata**:
1. **Creazione Drop Manuale**: Aggiunto nuovo screen `app/admin/create-drop.tsx` che permette di:
   - Selezionare una lista fornitore
   - Selezionare un punto di ritiro
   - Creare un drop manualmente anche senza raggiungere il valore minimo
   - Il drop viene creato con stato "approved" (pronto per l'attivazione)

2. **Accesso Rapido**: Aggiunto pulsante "Crea Drop Manuale" nella dashboard admin

**Come Creare un Drop Manualmente**:
1. Vai alla Dashboard Admin
2. Clicca su "Crea Drop Manuale"
3. Seleziona una lista fornitore (es. Yoox o Westwing)
4. Seleziona un punto di ritiro (es. Roma)
5. Clicca su "Crea Drop"
6. Il drop verrà creato con stato "approved"
7. Vai a "Gestisci Drop" per attivarlo

**Verifica Drops nel Database**:
```sql
-- Verifica tutti i drops
SELECT 
  d.id,
  d.name,
  d.status,
  d.current_discount,
  d.current_value,
  d.target_value,
  sl.name as list_name,
  pp.name as pickup_point_name
FROM drops d
LEFT JOIN supplier_lists sl ON sl.id = d.supplier_list_id
LEFT JOIN pickup_points pp ON pp.id = d.pickup_point_id
ORDER BY d.created_at DESC;

-- Verifica gli interessi degli utenti
SELECT 
  ui.supplier_list_id,
  ui.pickup_point_id,
  sl.name as list_name,
  pp.city,
  COUNT(DISTINCT ui.user_id) as unique_users,
  COUNT(ui.id) as total_interests,
  SUM(p.original_price) as total_value,
  sl.min_reservation_value
FROM user_interests ui
JOIN supplier_lists sl ON sl.id = ui.supplier_list_id
JOIN pickup_points pp ON pp.id = ui.pickup_point_id
JOIN products p ON p.id = ui.product_id
WHERE sl.status = 'active'
  AND pp.status = 'active'
GROUP BY ui.supplier_list_id, ui.pickup_point_id, sl.name, pp.city, sl.min_reservation_value;
```

### 3. Funzione "Ispeziona" in Expo Non Funziona

**Sintomo**: Non riesci ad abilitare la funzione ispeziona nell'app Expo.

**Causa**: La funzione ispeziona richiede React DevTools.

**Soluzione**:
1. Installa React DevTools (già presente in package.json):
   ```bash
   npm install react-devtools
   ```

2. Avvia React DevTools in un terminale separato:
   ```bash
   npx react-devtools
   ```

3. Avvia l'app Expo:
   ```bash
   npx expo start
   ```

4. Nell'app, premi:
   - **iOS**: Cmd + D (simulatore) o scuoti il dispositivo
   - **Android**: Cmd + M (emulatore) o scuoti il dispositivo
   - **Web**: F12 per aprire gli strumenti di sviluppo del browser

5. Seleziona "Toggle Element Inspector" o "Inspect Element"

**Alternative**:
- Usa i log della console per il debugging (già implementati estensivamente)
- Usa Expo Dev Tools nel browser (si apre automaticamente con `npx expo start`)
- Usa Flipper per debugging avanzato

## Stato Attuale del Database

### Liste Fornitori
- **Yoox**: 1,999 prodotti attivi
- **Westwing**: 1,617 prodotti attivi

### Interessi Utenti
- **Yoox (Roma)**: 8 interessi, valore totale €1,482 (mancano €518 per raggiungere il minimo di €2,000)

### Drops
- **Nessun drop attivo**: Devi creare un drop manualmente o aggiungere più interessi per raggiungere il valore minimo

## Prossimi Passi

1. **Verifica Feed**:
   - Apri l'app e controlla i log
   - Verifica che entrambe le liste siano visibili
   - Usa i pulsanti di navigazione laterali per passare tra le liste

2. **Crea Drop di Test**:
   - Vai alla Dashboard Admin
   - Clicca su "Crea Drop Manuale"
   - Crea un drop per la lista Yoox con punto di ritiro Roma
   - Attiva il drop dalla sezione "Gestisci Drop"

3. **Verifica Drop**:
   - Vai alla sezione "Drop Attivi" nell'app
   - Dovresti vedere il drop appena creato
   - Verifica che gli utenti possano prenotare prodotti

## Comandi Utili per il Debugging

```bash
# Avvia l'app con logging dettagliato
npx expo start --clear

# Avvia React DevTools
npx react-devtools

# Controlla i log in tempo reale
# I log appariranno nel terminale dove hai avviato expo start

# Pulisci la cache
npx expo start --clear
```

## Query SQL Utili

```sql
-- Verifica stato generale
SELECT 
  'Lists' as type, COUNT(*) as count FROM supplier_lists WHERE status = 'active'
UNION ALL
SELECT 'Products', COUNT(*) FROM products WHERE status = 'active'
UNION ALL
SELECT 'Drops', COUNT(*) FROM drops WHERE status IN ('active', 'approved')
UNION ALL
SELECT 'Interests', COUNT(*) FROM user_interests
UNION ALL
SELECT 'Users', COUNT(*) FROM profiles;

-- Verifica prodotti per lista
SELECT 
  sl.name as list_name,
  COUNT(p.id) as product_count,
  sl.status as list_status
FROM supplier_lists sl
LEFT JOIN products p ON p.supplier_list_id = sl.id AND p.status = 'active'
WHERE sl.status = 'active'
GROUP BY sl.id, sl.name, sl.status;

-- Verifica interessi per drop potenziali
SELECT 
  sl.name as list_name,
  pp.city,
  COUNT(DISTINCT ui.user_id) as users,
  COUNT(ui.id) as interests,
  SUM(p.original_price) as total_value,
  sl.min_reservation_value as min_required,
  CASE 
    WHEN SUM(p.original_price) >= sl.min_reservation_value THEN 'READY FOR DROP'
    ELSE 'NEEDS MORE INTERESTS'
  END as status
FROM user_interests ui
JOIN supplier_lists sl ON sl.id = ui.supplier_list_id
JOIN pickup_points pp ON pp.id = ui.pickup_point_id
JOIN products p ON p.id = ui.product_id
WHERE sl.status = 'active' AND pp.status = 'active'
GROUP BY sl.id, sl.name, pp.city, sl.min_reservation_value;
```

## Contatti e Supporto

Se i problemi persistono:
1. Controlla i log dettagliati nella console
2. Verifica lo stato del database con le query SQL fornite
3. Assicurati che le policy RLS siano configurate correttamente
4. Prova a pulire la cache con `npx expo start --clear`
