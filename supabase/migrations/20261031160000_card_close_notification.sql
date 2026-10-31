-- Notifica di chiusura drop per chi paga con carta (equivalente a quella dei contanti).
-- Trigger separato: non modifica record_test_card_result; un errore qui non blocca mai l'incasso.
CREATE OR REPLACE FUNCTION public.notify_card_attempt_settled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp' AS $$
DECLARE d record; pname text; msg text; pct int; amt numeric;
BEGIN
  BEGIN
    IF NEW.state = 'captured' AND OLD.state IS DISTINCT FROM 'captured' AND NEW.final_cents > 0 THEN
      IF EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id=NEW.user_id AND type='drop_completed' AND related_id=NEW.drop_id AND related_type='drop') THEN
        RETURN NEW;
      END IF;
      SELECT name, final_discount_percentage INTO d FROM public.drops WHERE id=NEW.drop_id;
      SELECT name INTO pname FROM public.products WHERE id=NEW.product_id;
      pct := floor(coalesce(d.final_discount_percentage, NEW.final_group_bps::numeric/100));
      amt := NEW.final_cents::numeric/100;
      msg := 'Il drop è terminato con uno sconto finale del '||pct||'%!'||E'\n\n';
      IF pname IS NOT NULL THEN msg := msg||'• '||pname||E'\n\n'; END IF;
      IF NEW.final_loyalty_bps > 0 THEN
        msg := msg||'🌟 Sconto fedeltà: −'||(NEW.final_loyalty_bps/100)||'%'||E'\n\n';
      END IF;
      msg := msg||'💳 GIÀ PAGATO CON CARTA: €'||to_char(amt,'FM999990.00')||E'\n'
                ||'Al ritiro non devi pagare nulla.'||E'\n\n'
                ||'Ti notificheremo quando l''ordine sarà pronto per il ritiro!';
      INSERT INTO public.notifications(user_id,title,message,type,related_id,related_type,read)
      VALUES (NEW.user_id,'Drop Completato: '||coalesce(d.name,''),msg,'drop_completed',NEW.drop_id,'drop',false);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS z_notify_card_attempt_settled ON public.booking_card_attempts;
CREATE TRIGGER z_notify_card_attempt_settled
AFTER UPDATE OF state ON public.booking_card_attempts
FOR EACH ROW EXECUTE FUNCTION public.notify_card_attempt_settled();
