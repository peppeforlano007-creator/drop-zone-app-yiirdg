import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

// Stripe riapre l'app su rdnstreetstockmarket://stripe-redirect dopo il pagamento.
// Il pagamento è già gestito dall'SDK: questa schermata torna subito indietro
// (alla scheda del drop) oppure, se non c'è nulla dietro, alla home.
export default function StripeRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);
  return <View style={{ flex: 1 }} />;
}
