
import { Platform } from 'react-native';

// Platform-specific exports
// This file serves as a fallback and router to platform-specific implementations
let AddPaymentMethodScreen: any;

if (Platform.OS === 'web') {
  AddPaymentMethodScreen = require('./add-payment-method.web').default;
} else {
  AddPaymentMethodScreen = require('./add-payment-method.native').default;
}

export default AddPaymentMethodScreen;
