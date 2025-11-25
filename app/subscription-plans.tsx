
import { Platform } from 'react-native';
import SubscriptionPlansWeb from './subscription-plans.web';
import SubscriptionPlansNative from './subscription-plans.native';

// Dynamic export based on platform
export default Platform.select({
  web: SubscriptionPlansWeb,
  default: SubscriptionPlansNative,
});
