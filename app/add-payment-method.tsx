
import React from 'react';
import { Platform } from 'react-native';

// Dynamic import based on platform
// This approach works with Expo Router's file-based routing
const AddPaymentMethod = Platform.select({
  web: require('./add-payment-method.web').default,
  default: require('./add-payment-method.native').default,
});

export default AddPaymentMethod;
