
# Testing Guide

This guide provides comprehensive instructions for testing all features of the app before deployment to the App Store and Play Store.

## Table of Contents

- [Functional Testing](#functional-testing)
- [UI/UX Testing](#uiux-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Platform-Specific Testing](#platform-specific-testing)
- [Automated Testing Tools](#automated-testing-tools)

## Functional Testing

### 1. User Registration & Authentication

#### Consumer Registration
- [ ] Open the app and navigate to registration
- [ ] Fill in all required fields (name, email, phone, pickup point)
- [ ] Select a pickup point from the list
- [ ] Submit registration with valid data
- [ ] Verify email confirmation message is displayed
- [ ] Check email inbox for verification link
- [ ] Click verification link and confirm email
- [ ] Log in with registered credentials
- [ ] Verify profile loads correctly with consumer role

#### Supplier Registration
- [ ] Navigate to supplier registration
- [ ] Fill in business details
- [ ] Submit registration
- [ ] Verify email confirmation
- [ ] Log in as supplier
- [ ] Verify supplier dashboard access

#### Login Flow
- [ ] Test login with valid credentials
- [ ] Test login with invalid email
- [ ] Test login with invalid password
- [ ] Test login with unverified email
- [ ] Verify appropriate error messages
- [ ] Test "Remember Me" functionality
- [ ] Test logout functionality

### 2. Product Browsing

#### Home Feed
- [ ] Verify products load in TikTok-style feed
- [ ] Test infinite scroll functionality
- [ ] Verify product images load correctly
- [ ] Test product image gallery (swipe through images)
- [ ] Verify product details display correctly
- [ ] Test "Vorrò Partecipare al Drop" button
- [ ] Verify interest is saved to database
- [ ] Test product filtering by category
- [ ] Test product search functionality

#### Product Details
- [ ] Tap on product to view full details
- [ ] Verify all product information displays
- [ ] Test size selection (if applicable)
- [ ] Test color selection (if applicable)
- [ ] Verify stock availability
- [ ] Test back navigation

### 3. Drop Participation

#### Interest Registration
- [ ] Browse products and mark interest
- [ ] Verify interest counter updates
- [ ] Check that interests are saved per user
- [ ] Verify interests persist after app restart

#### Drop Activation
- [ ] Wait for minimum reservation value to be reached
- [ ] Verify drop is created automatically
- [ ] Check drop appears in Drops tab
- [ ] Verify drop timer starts (5 days)
- [ ] Verify initial discount is set correctly

#### Drop Details
- [ ] Navigate to active drop
- [ ] Verify drop information displays correctly
- [ ] Check current discount percentage
- [ ] Verify progress bar shows correctly
- [ ] Test "Prenota con Carta" button
- [ ] Verify WhatsApp share functionality

### 4. Booking & Payments

#### Payment Method Management
- [ ] Navigate to Payment Methods
- [ ] Add a new payment method
- [ ] Verify card details are validated
- [ ] Set default payment method
- [ ] Remove a payment method
- [ ] Verify changes persist

#### Booking Process
- [ ] Select product in active drop
- [ ] Choose size and color (if applicable)
- [ ] Tap "Prenota con Carta"
- [ ] Verify payment authorization
- [ ] Check booking appears in My Bookings
- [ ] Verify authorized amount is correct

#### Payment Capture
- [ ] Wait for drop to end or manually complete drop (admin)
- [ ] Verify final discount is calculated correctly
- [ ] Check payment is captured at final price
- [ ] Verify booking status updates to "captured"
- [ ] Check order is created for supplier

### 5. Admin Panel Functionalities

#### Drop Management
- [ ] Log in as admin
- [ ] Navigate to Manage Drops
- [ ] View pending drops
- [ ] Approve a pending drop
- [ ] Activate an approved drop
- [ ] Deactivate an active drop
- [ ] Complete a drop manually
- [ ] View drop analytics

#### User Management
- [ ] Navigate to Users section
- [ ] View all users
- [ ] Filter users by role
- [ ] Search for specific user
- [ ] View user details
- [ ] Update user role (if needed)

#### Supplier Management
- [ ] Navigate to Suppliers section
- [ ] View all suppliers
- [ ] Approve pending suppliers
- [ ] View supplier products
- [ ] Deactivate supplier account

#### Product Management
- [ ] Navigate to Products section
- [ ] View all products
- [ ] Filter by status
- [ ] Search products
- [ ] View product details
- [ ] Update product status

#### Booking Management
- [ ] Navigate to Bookings section
- [ ] View all bookings
- [ ] Filter by status
- [ ] Filter by payment status
- [ ] Search bookings
- [ ] View booking details

#### Analytics
- [ ] Navigate to Analytics
- [ ] Verify all statistics load correctly
- [ ] Check revenue calculations
- [ ] View top suppliers
- [ ] View top products
- [ ] View top pickup points

### 6. Supplier List Import

#### Excel Import
- [ ] Log in as supplier
- [ ] Navigate to Import List
- [ ] View Excel format guide
- [ ] Download sample Excel file
- [ ] Fill in product data
- [ ] Upload Excel file
- [ ] Verify products are imported correctly
- [ ] Check for validation errors
- [ ] Verify supplier list is created

### 7. Pickup Point Order Management

#### Order Arrival
- [ ] Log in as pickup point manager
- [ ] Navigate to Orders
- [ ] View incoming orders
- [ ] Mark order as arrived
- [ ] Verify arrival timestamp
- [ ] Check customer notification is sent

#### Order Pickup
- [ ] View ready-for-pickup orders
- [ ] Mark order as picked up
- [ ] Verify pickup timestamp
- [ ] Check order status updates
- [ ] Verify commission calculation

## UI/UX Testing

### Responsiveness

#### Screen Sizes
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (standard)
- [ ] Test on iPhone 14 Pro Max (large)
- [ ] Test on iPad (tablet)
- [ ] Test on various Android phones
- [ ] Test on Android tablets

#### Orientations
- [ ] Test portrait mode
- [ ] Test landscape mode
- [ ] Verify layout adapts correctly
- [ ] Check that all content is accessible

### Layout Issues

#### Visual Inspection
- [ ] Check for overlapping elements
- [ ] Verify text is readable
- [ ] Check button sizes (minimum 44x44 points)
- [ ] Verify spacing is consistent
- [ ] Check alignment of elements
- [ ] Verify images scale correctly

#### Navigation
- [ ] Test all navigation links
- [ ] Verify back buttons work
- [ ] Check tab bar navigation
- [ ] Test deep linking
- [ ] Verify modal dismissal

### Color Contrast

#### Accessibility
- [ ] Check text on background contrast
- [ ] Verify button text is readable
- [ ] Test in light mode
- [ ] Test in dark mode
- [ ] Use accessibility inspector

### Instructions & Labels

#### Clarity
- [ ] Verify all labels are in Italian
- [ ] Check for typos
- [ ] Verify instructions are clear
- [ ] Test error messages
- [ ] Check success messages

## Performance Testing

### Network Conditions

#### Connection Types
- [ ] Test on Wi-Fi
- [ ] Test on 4G/LTE
- [ ] Test on 3G
- [ ] Test on slow connection
- [ ] Test offline behavior

#### Loading States
- [ ] Verify loading indicators appear
- [ ] Check timeout handling
- [ ] Test retry mechanisms
- [ ] Verify error messages

### Image Loading

#### Optimization
- [ ] Check image caching works
- [ ] Verify images load progressively
- [ ] Test with slow connection
- [ ] Check memory usage
- [ ] Verify no image flickering

### Data Fetching

#### API Performance
- [ ] Measure query response times
- [ ] Check for unnecessary requests
- [ ] Verify pagination works
- [ ] Test real-time updates
- [ ] Check for memory leaks

### UI Rendering

#### Smooth Scrolling
- [ ] Test FlatList performance
- [ ] Verify no frame drops
- [ ] Check scroll position persistence
- [ ] Test with large datasets

#### Animations
- [ ] Verify animations are smooth
- [ ] Check haptic feedback
- [ ] Test transition animations
- [ ] Verify no animation jank

### Load Testing

#### Concurrent Users
- [ ] Simulate multiple users
- [ ] Test drop activation with many users
- [ ] Verify database performance
- [ ] Check for race conditions

## Security Testing

### Data Protection

#### Sensitive Data
- [ ] Verify passwords are hashed
- [ ] Check payment data is encrypted
- [ ] Verify API keys are not exposed
- [ ] Check for data leaks in logs

### Authentication

#### Session Management
- [ ] Test session expiration
- [ ] Verify token refresh
- [ ] Check logout clears session
- [ ] Test concurrent sessions

### Authorization

#### Role-Based Access
- [ ] Verify consumers can't access admin panel
- [ ] Check suppliers can only see their data
- [ ] Verify pickup points have limited access
- [ ] Test RLS policies

### Input Validation

#### SQL Injection
- [ ] Test with SQL injection patterns
- [ ] Verify input sanitization
- [ ] Check parameterized queries

#### XSS Prevention
- [ ] Test with script tags
- [ ] Verify output encoding
- [ ] Check for reflected XSS

### API Security

#### Rate Limiting
- [ ] Test excessive requests
- [ ] Verify rate limiting works
- [ ] Check error responses

#### CORS
- [ ] Verify CORS configuration
- [ ] Test cross-origin requests
- [ ] Check allowed origins

## Platform-Specific Testing

### iOS Testing

#### Devices
- [ ] iPhone SE (2nd gen)
- [ ] iPhone 12/13
- [ ] iPhone 14/15
- [ ] iPhone 14/15 Pro Max
- [ ] iPad Air
- [ ] iPad Pro

#### iOS Versions
- [ ] iOS 15
- [ ] iOS 16
- [ ] iOS 17
- [ ] iOS 18 (latest)

#### iOS Features
- [ ] Test Face ID/Touch ID
- [ ] Verify push notifications
- [ ] Check deep linking
- [ ] Test app permissions
- [ ] Verify background refresh

### Android Testing

#### Devices
- [ ] Samsung Galaxy S21/S22
- [ ] Google Pixel 6/7
- [ ] OnePlus devices
- [ ] Xiaomi devices
- [ ] Budget Android phones

#### Android Versions
- [ ] Android 11
- [ ] Android 12
- [ ] Android 13
- [ ] Android 14 (latest)

#### Android Features
- [ ] Test biometric authentication
- [ ] Verify push notifications
- [ ] Check deep linking
- [ ] Test app permissions
- [ ] Verify background services

### Platform Differences

#### Behavior
- [ ] Compare navigation patterns
- [ ] Check platform-specific UI
- [ ] Verify icon rendering
- [ ] Test haptic feedback differences

## Automated Testing Tools

### Using the Testing Dashboard

1. Log in as admin
2. Navigate to "Testing & Diagnostica"
3. Run individual tests or full test suite
4. Review test results
5. Check performance metrics
6. View device information

### Test Categories

#### Database Performance
- Measures query response times
- Checks connection stability
- Verifies data integrity

#### Product Browsing
- Tests product loading
- Verifies filtering works
- Checks pagination

#### Drop Functionality
- Tests drop creation
- Verifies discount calculation
- Checks timer functionality

#### RLS Policies
- Verifies row-level security
- Tests access control
- Checks data isolation

### Performance Monitoring

The app includes built-in performance monitoring:

```typescript
import { performanceMonitor } from '@/utils/performanceMonitor';

// Start measuring
performanceMonitor.start('operation_name');

// ... perform operation ...

// End measuring
performanceMonitor.end('operation_name');

// View metrics
const metrics = performanceMonitor.getMetrics();
```

### Security Helpers

Use security helpers for validation:

```typescript
import {
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  sanitizeInput,
} from '@/utils/securityHelpers';

// Validate email
if (!isValidEmail(email)) {
  // Handle invalid email
}

// Check password strength
const { isValid, strength, issues } = validatePasswordStrength(password);

// Sanitize user input
const clean = sanitizeInput(userInput);
```

## Pre-Deployment Checklist

### Code Quality
- [ ] All console.logs reviewed
- [ ] No TODO comments remaining
- [ ] Code is properly formatted
- [ ] No unused imports
- [ ] No hardcoded values

### Configuration
- [ ] Environment variables set
- [ ] API keys configured
- [ ] Supabase project configured
- [ ] Stripe keys configured
- [ ] App version updated

### Assets
- [ ] App icons generated
- [ ] Splash screens created
- [ ] All images optimized
- [ ] Fonts included

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] User guide created
- [ ] Admin guide created

### Store Preparation
- [ ] App Store screenshots
- [ ] Play Store screenshots
- [ ] App description written
- [ ] Keywords researched
- [ ] Privacy policy created
- [ ] Terms of service created

## Reporting Issues

When you find an issue during testing:

1. **Document the issue**
   - What happened?
   - What was expected?
   - Steps to reproduce

2. **Capture evidence**
   - Screenshots
   - Screen recordings
   - Console logs
   - Network logs

3. **Categorize severity**
   - Critical (app crashes)
   - High (feature broken)
   - Medium (UI issue)
   - Low (minor cosmetic)

4. **Track resolution**
   - Issue number
   - Fix implemented
   - Verification date
   - Tester name

## Continuous Testing

Testing should be ongoing:

- Test after each new feature
- Regression test after bug fixes
- Performance test regularly
- Security audit quarterly
- User acceptance testing before releases

## Resources

- [Expo Testing Documentation](https://docs.expo.dev/guides/testing/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
