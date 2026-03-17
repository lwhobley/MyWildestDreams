/**
 * Subscription + Stripe Service — Priority 4
 * Handles: checkout, webhooks (server), tier gating, trial logic.
 * Stripe webhooks are handled in Supabase Edge Functions only.
 */
import { supabase } from '@/lib/supabase';
import type { SubscriptionTier } from '@/types';
import { PLANS } from '@/constants';

// ─── Tier Checks (always verify server-side in Edge Functions too) ─────────────
export function canCreateDream(tier: SubscriptionTier, thisMonthCount: number): boolean {
  if (tier === 'free') return thisMonthCount < 3;
  return true; // lucid + oracle = unlimited
}

export function canAccessCommunity(tier: SubscriptionTier): boolean {
  return tier === 'lucid' || tier === 'oracle';
}

export function canAccessSymbolism(tier: SubscriptionTier): boolean {
  return tier === 'lucid' || tier === 'oracle';
}

export function canAccessPatternAnalysis(tier: SubscriptionTier): boolean {
  return tier === 'oracle';
}

export function getStylesForTier(tier: SubscriptionTier): number | 'all' {
  const plan = PLANS.find(p => p.id === tier);
  return plan?.limits.stylesAvailable ?? 3;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
export interface CheckoutSession {
  sessionId: string;
  url: string; // Stripe Checkout URL
}

export async function createCheckoutSession(
  userId: string,
  planId: 'lucid' | 'oracle',
  interval: 'monthly' | 'annual',
): Promise<CheckoutSession> {
  const { data, error } = await supabase.functions.invoke<CheckoutSession>(
    'create-checkout-session',
    { body: { userId, planId, interval } },
  );
  if (error || !data) throw new Error(error?.message ?? 'Checkout unavailable.');
  return data;
}

// ─── Customer Portal (manage / cancel) ────────────────────────────────────────
export async function getCustomerPortalUrl(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'customer-portal',
    { body: { userId } },
  );
  if (error || !data) throw new Error(error?.message ?? 'Portal unavailable.');
  return data.url;
}

// ─── Restore Purchases (iOS) ──────────────────────────────────────────────────
export async function restorePurchases(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase.functions.invoke<{ tier: SubscriptionTier }>(
    'restore-purchases',
    { body: { userId } },
  );
  if (error || !data) throw new Error('Could not restore purchases.');
  return data.tier;
}

// ─── Trial ────────────────────────────────────────────────────────────────────
export async function isInFreeTrial(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('trial_ends_at, tier')
    .eq('id', userId)
    .single();

  if (!data || data.tier !== 'free') return false;
  if (!data.trial_ends_at) return false;

  return new Date(data.trial_ends_at) > new Date();
}

export async function getTrialDaysRemaining(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('trial_ends_at')
    .eq('id', userId)
    .single();

  if (!data?.trial_ends_at) return 0;
  const diff = new Date(data.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
