
import { Platform } from 'react-native';

// Platform-specific exports
// This file serves as a fallback and router to platform-specific implementations
let SubscriptionPlansScreen: any;

if (Platform.OS === 'web') {
  SubscriptionPlansScreen = require('./subscription-plans.web').default;
} else {
  SubscriptionPlansScreen = require('./subscription-plans.native').default;
}

export default SubscriptionPlansScreen;
