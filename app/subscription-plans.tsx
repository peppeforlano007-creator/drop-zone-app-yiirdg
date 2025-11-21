
import React from 'react';
import { Platform } from 'react-native';

// Dynamic import based on platform
// This approach works with Expo Router's file-based routing
const SubscriptionPlans = Platform.select({
  web: require('./subscription-plans.web').default,
  default: require('./subscription-plans.native').default,
});

export default SubscriptionPlans;
