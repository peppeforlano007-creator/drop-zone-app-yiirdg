import { Platform } from 'react-native';

type Params = Record<string, string | number>;

let ready = false;

/**
 * Meta SDK: the install and app-open events are logged natively by the SDK itself.
 * Here we only ask for iOS tracking consent (ATT) and, if granted, enable the advertising id.
 * Every call is wrapped so analytics can never break the app.
 */
export async function initMetaAnalytics(): Promise<void> {
  if (Platform.OS === 'web' || ready) return;
  ready = true;
  try {
    const { Settings } = await import('react-native-fbsdk-next');
    if (Platform.OS === 'ios') {
      const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
      const { status } = await requestTrackingPermissionsAsync();
      const granted = status === 'granted';
      Settings.setAdvertiserTrackingEnabled(granted);
      Settings.setAdvertiserIDCollectionEnabled(granted);
    } else {
      Settings.setAdvertiserIDCollectionEnabled(true);
    }
    Settings.initializeSDK();
  } catch (e) {
    console.log('[Meta] init skipped', e);
  }
}

export async function logMetaEvent(name: string, params?: Params, valueToSum?: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { AppEventsLogger } = await import('react-native-fbsdk-next');
    if (valueToSum !== undefined) AppEventsLogger.logEvent(name, valueToSum, params ?? {});
    else AppEventsLogger.logEvent(name, params ?? {});
  } catch { /* never block the app */ }
}

export const trackRegistration = () => logMetaEvent('fb_mobile_complete_registration', { fb_registration_method: 'phone' });
export const trackBooking = (valueEuro: number) =>
  logMetaEvent('fb_mobile_add_to_cart', { fb_currency: 'EUR' }, valueEuro);
export const trackCardPaymentAuthorized = (valueEuro: number) =>
  logMetaEvent('fb_mobile_initiated_checkout', { fb_currency: 'EUR' }, valueEuro);
