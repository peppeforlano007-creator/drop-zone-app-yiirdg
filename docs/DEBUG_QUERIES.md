
# Query SQL Utili per Debug

## 🔍 Verifica Configurazione

### Controlla Trigger Esistenti
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_update_drop%'
ORDER BY trigger_name;
```

### Controlla Funzione update_drop_on_booking
```sql
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_drop_on_booking';
```

### Verifica Tabelle Eliminate
```sql
-- Queste query dovrebbero restituire errore "relation does not exist"
SELECT * FROM payment_methods LIMIT 1;
SELECT * FROM subscriptions LIMIT 1;
SELECT * FROM subscription_plans LIMIT 1;
```

### Verifica Colonne Rimosse da Bookings
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- Le seguenti colonne NON dovrebbero esistere:
-- - payment_intent_id
-- - authorized_amount
-- - payment_method_id
-- - stripe_payment_method_id
```

## 📊 Monitoraggio Drop

### Vedi Tutti i Drop con Valori Attuali
```sql
SELECT 
  d.id,
  d.name,
  d.status,
  d.current_value,
  d.current_discount,
  sl.min_discount,
  sl.max_discount,
  sl.min_reservation_value,
  sl.max_reservation_value,
  COUNT(b.id) as total_bookings,
  SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as active_bookings
FROM drops d
LEFT JOIN supplier_lists sl ON d.supplier_list_id = sl.id
LEFT JOIN bookings b ON d.id = b.drop_id
GROUP BY d.id, d.name, d.status, d.current_value, d.current_discount,
         sl.min_discount, sl.max_discount, sl.min_reservation_value, sl.max_reservation_value
ORDER BY d.created_at DESC;
```

### Calcola Manualmente Valore e Sconto di un Drop
```sql
-- Sostituisci 'DROP_ID_HERE' con l'ID del drop
WITH drop_info AS (
  SELECT 
    d.id as drop_id,
    d.name,
    d.current_value as db_current_value,
    d.current_discount as db_current_discount,
    sl.min_discount,
    sl.max_discount,
    sl.min_reservation_value,
    sl.max_reservation_value
  FROM drops d
  JOIN supplier_lists sl ON d.supplier_list_id = sl.id
  WHERE d.id = 'DROP_ID_HERE'
),
calculated_value AS (
  SELECT 
    SUM(b.original_price) as calc_current_value
  FROM bookings b
  WHERE b.drop_id = 'DROP_ID_HERE'
    AND b.status = 'active'
    AND b.payment_method = 'cod'
)
SELECT 
  di.*,
  cv.calc_current_value,
  CASE 
    WHEN cv.calc_current_value <= di.min_reservation_value THEN di.min_discount
    WHEN cv.calc_current_value >= di.max_reservation_value THEN di.max_discount
    ELSE di.min_discount + 
      ((di.max_discount - di.min_discount) * 
       (cv.calc_current_value - di.min_reservation_value) / 
       (di.max_reservation_value - di.min_reservation_value))
  END as calc_current_discount,
  -- Confronto con valori nel database
  CASE 
    WHEN ABS(di.db_current_value - cv.calc_current_value) < 0.01 THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as value_check
FROM drop_info di
CROSS JOIN calculated_value cv;
```

### Vedi Prenotazioni di un Drop
```sql
-- Sostituisci 'DROP_ID_HERE' con l'ID del drop
SELECT 
  b.id,
  b.created_at,
  p.full_name as user_name,
  pr.name as product_name,
  b.original_price,
  b.discount_percentage,
  b.final_price,
  b.payment_method,
  b.payment_status,
  b.status
FROM bookings b
JOIN profiles p ON b.user_id = p.user_id
JOIN products pr ON b.product_id = pr.id
WHERE b.drop_id = 'DROP_ID_HERE'
ORDER BY b.created_at DESC;
```

## 🔄 Test Trigger Manualmente

### Test Inserimento Prenotazione
```sql
-- 1. Salva valori attuali del drop
SELECT id, current_value, current_discount, updated_at 
FROM drops 
WHERE id = 'DROP_ID_HERE';

-- 2. Inserisci prenotazione di test
INSERT INTO bookings (
  user_id,
  product_id,
  drop_id,
  pickup_point_id,
  original_price,
  discount_percentage,
  final_price,
  payment_method,
  payment_status,
  status
) VALUES (
  'USER_ID_HERE',
  'PRODUCT_ID_HERE',
  'DROP_ID_HERE',
  'PICKUP_POINT_ID_HERE',
  100.00,
  30.00,
  70.00,
  'cod',
  'pending',
  'active'
) RETURNING id;

-- 3. Verifica che il drop sia stato aggiornato
SELECT id, current_value, current_discount, updated_at 
FROM drops 
WHERE id = 'DROP_ID_HERE';

-- 4. Pulisci (elimina prenotazione di test)
DELETE FROM bookings WHERE id = 'BOOKING_ID_FROM_STEP_2';
```

### Test Aggiornamento Stato Prenotazione
```sql
-- 1. Salva valori attuali
SELECT id, current_value, current_discount 
FROM drops 
WHERE id = 'DROP_ID_HERE';

-- 2. Cambia stato prenotazione
UPDATE bookings 
SET status = 'cancelled' 
WHERE id = 'BOOKING_ID_HERE';

-- 3. Verifica aggiornamento drop
SELECT id, current_value, current_discount 
FROM drops 
WHERE id = 'DROP_ID_HERE';

-- 4. Ripristina (se necessario)
UPDATE bookings 
SET status = 'active' 
WHERE id = 'BOOKING_ID_HERE';
```

## 📦 Monitoraggio Stock Prodotti

### Vedi Prodotti con Stock Basso
```sql
SELECT 
  p.id,
  p.name,
  p.stock,
  p.status,
  sl.name as supplier_list,
  COUNT(b.id) as active_bookings
FROM products p
LEFT JOIN supplier_lists sl ON p.supplier_list_id = sl.id
LEFT JOIN bookings b ON p.id = b.product_id AND b.status = 'active'
WHERE p.stock <= 5
  AND p.status = 'active'
GROUP BY p.id, p.name, p.stock, p.status, sl.name
ORDER BY p.stock ASC;
```

### Verifica Consistenza Stock
```sql
-- Trova prodotti dove stock non corrisponde alle prenotazioni
SELECT 
  p.id,
  p.name,
  p.stock as current_stock,
  COUNT(b.id) as active_bookings,
  p.stock - COUNT(b.id) as stock_difference,
  CASE 
    WHEN p.stock - COUNT(b.id) < 0 THEN '❌ PROBLEMA: Stock negativo'
    WHEN p.stock = 0 AND COUNT(b.id) > 0 THEN '⚠️ ATTENZIONE: Stock 0 ma prenotazioni attive'
    ELSE '✅ OK'
  END as status_check
FROM products p
LEFT JOIN bookings b ON p.id = b.product_id AND b.status = 'active'
GROUP BY p.id, p.name, p.stock
HAVING p.stock - COUNT(b.id) < 0 OR (p.stock = 0 AND COUNT(b.id) > 0)
ORDER BY stock_difference ASC;
```

## 📧 Monitoraggio Notifiche

### Vedi Notifiche Recenti
```sql
SELECT 
  n.id,
  n.created_at,
  p.full_name as user_name,
  n.title,
  n.message,
  n.type,
  n.read
FROM notifications n
JOIN profiles p ON n.user_id = p.user_id
ORDER BY n.created_at DESC
LIMIT 50;
```

### Vedi Notifiche Non Lette per Utente
```sql
-- Sostituisci 'USER_ID_HERE' con l'ID utente
SELECT 
  id,
  created_at,
  title,
  message,
  type,
  related_type,
  related_id
FROM notifications
WHERE user_id = 'USER_ID_HERE'
  AND read = false
ORDER BY created_at DESC;
```

### Conta Notifiche per Tipo
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN read = true THEN 1 ELSE 0 END) as read_count,
  SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as unread_count
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY total DESC;
```

## 🔧 Risoluzione Problemi

### Forza Ricalcolo Valori Drop
```sql
-- Usa questa query se i valori del drop sembrano sbagliati
-- Sostituisci 'DROP_ID_HERE' con l'ID del drop

WITH drop_info AS (
  SELECT 
    d.id,
    sl.min_discount,
    sl.max_discount,
    sl.min_reservation_value,
    sl.max_reservation_value
  FROM drops d
  JOIN supplier_lists sl ON d.supplier_list_id = sl.id
  WHERE d.id = 'DROP_ID_HERE'
),
calculated AS (
  SELECT 
    COALESCE(SUM(b.original_price), 0) as new_value
  FROM bookings b
  WHERE b.drop_id = 'DROP_ID_HERE'
    AND b.status = 'active'
    AND b.payment_method = 'cod'
)
UPDATE drops d
SET 
  current_value = c.new_value,
  current_discount = CASE 
    WHEN c.new_value <= di.min_reservation_value THEN di.min_discount
    WHEN c.new_value >= di.max_reservation_value THEN di.max_discount
    ELSE di.min_discount + 
      ((di.max_discount - di.min_discount) * 
       (c.new_value - di.min_reservation_value) / 
       (di.max_reservation_value - di.min_reservation_value))
  END,
  updated_at = NOW()
FROM drop_info di, calculated c
WHERE d.id = 'DROP_ID_HERE'
RETURNING d.id, d.current_value, d.current_discount;
```

### Reset Stock Prodotto
```sql
-- Usa questa query se lo stock di un prodotto sembra sbagliato
-- Sostituisci 'PRODUCT_ID_HERE' con l'ID del prodotto

WITH product_info AS (
  SELECT 
    p.id,
    p.stock as current_stock,
    COUNT(b.id) as active_bookings
  FROM products p
  LEFT JOIN bookings b ON p.id = b.product_id AND b.status = 'active'
  WHERE p.id = 'PRODUCT_ID_HERE'
  GROUP BY p.id, p.stock
)
SELECT 
  id,
  current_stock,
  active_bookings,
  current_stock - active_bookings as available_stock,
  CASE 
    WHEN current_stock - active_bookings < 0 THEN 'PROBLEMA: Stock negativo'
    ELSE 'OK'
  END as status
FROM product_info;

-- Se lo stock è sbagliato, puoi correggerlo manualmente:
-- UPDATE products 
-- SET stock = CORRECT_VALUE_HERE 
-- WHERE id = 'PRODUCT_ID_HERE';
```

### Verifica Permessi RLS
```sql
-- Verifica politiche RLS per tabella drops
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'drops';

-- Verifica politiche RLS per tabella bookings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings';
```

## 📈 Statistiche Utili

### Statistiche Drop Attivi
```sql
SELECT 
  COUNT(*) as total_active_drops,
  AVG(current_value) as avg_value,
  AVG(current_discount) as avg_discount,
  MIN(current_value) as min_value,
  MAX(current_value) as max_value
FROM drops
WHERE status = 'active';
```

### Statistiche Prenotazioni
```sql
SELECT 
  payment_method,
  status,
  COUNT(*) as total,
  SUM(original_price) as total_original,
  SUM(final_price) as total_final,
  SUM(original_price - final_price) as total_savings
FROM bookings
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY payment_method, status
ORDER BY payment_method, status;
```

### Top Prodotti Prenotati
```sql
SELECT 
  p.id,
  p.name,
  p.stock,
  COUNT(b.id) as total_bookings,
  SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as active_bookings
FROM products p
LEFT JOIN bookings b ON p.id = b.product_id
GROUP BY p.id, p.name, p.stock
ORDER BY total_bookings DESC
LIMIT 20;
```

## 🎯 Query Rapide

### Ultimo Aggiornamento Drop
```sql
SELECT id, name, current_value, current_discount, updated_at 
FROM drops 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Ultime Prenotazioni
```sql
SELECT 
  b.id,
  b.created_at,
  p.full_name,
  pr.name as product,
  d.name as drop,
  b.status
FROM bookings b
JOIN profiles p ON b.user_id = p.user_id
JOIN products pr ON b.product_id = pr.id
JOIN drops d ON b.drop_id = d.id
ORDER BY b.created_at DESC
LIMIT 20;
```

### Prodotti Esauriti
```sql
SELECT 
  p.id,
  p.name,
  p.stock,
  sl.name as supplier_list
FROM products p
JOIN supplier_lists sl ON p.supplier_list_id = sl.id
WHERE p.stock = 0
  AND p.status = 'active'
ORDER BY p.updated_at DESC;
```

---

**Nota:** Sostituisci sempre i placeholder (DROP_ID_HERE, USER_ID_HERE, etc.) con gli ID reali prima di eseguire le query.
