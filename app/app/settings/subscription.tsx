/**
 * Subscription Screen
 * Connects to: PLANS constant, createCheckoutSession, getCustomerPortalUrl
 * Billing interval toggle: monthly / annual
 * Plan selection → open Stripe Checkout URL in WebBrowser
 */
import { View, Text } from 'react-native';
import { COLORS } from '@/constants';
export default function SubscriptionScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void }}>
      <Text style={{ color: COLORS.silver }}>Subscription</Text>
    </View>
  );
}
