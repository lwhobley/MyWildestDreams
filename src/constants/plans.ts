// src/constants/plans.ts
// ─── Subscription Plans · Tier Definitions ────────────────────────────────────

import type { Plan } from '@/types';

export const PLANS: Plan[] = [
  {
    id: 'dreamer',
    name: 'Dreamer',
    monthlyPrice: 0,
    yearlyPrice: 0,
    lsMonthlyVariantId: process.env.EXPO_PUBLIC_LS_DREAMER_VARIANT_ID ?? '',
    lsYearlyVariantId: process.env.EXPO_PUBLIC_LS_DREAMER_VARIANT_ID ?? '',
    dreamLimit: 3,
    styleCount: 5,
    archiveDays: 7,
    communityAccess: false,
    symbolismEngine: false,
    priorityRendering: false,
    features: [
      '3 dreams per month',
      '5 visual styles',
      'Basic HD rendering',
      '7-day archive',
    ],
  },
  {
    id: 'lucid',
    name: 'Lucid',
    monthlyPrice: 9,
    yearlyPrice: 79,  // ~$6.58/mo
    lsMonthlyVariantId: process.env.EXPO_PUBLIC_LS_LUCID_MONTHLY_ID ?? '',
    lsYearlyVariantId: process.env.EXPO_PUBLIC_LS_LUCID_MONTHLY_ID ?? '',
    dreamLimit: null, // unlimited
    styleCount: 14,
    archiveDays: null, // forever
    communityAccess: true,
    symbolismEngine: true,
    priorityRendering: false,
    features: [
      'Unlimited dreams',
      'All 14 visual styles',
      'Cinematic HD rendering',
      'Unlimited archive + search',
      'Symbolism Engine',
      'Community access',
      '3-day free trial',
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle',
    monthlyPrice: 19,
    yearlyPrice: 159, // ~$13.25/mo
    lsMonthlyVariantId: process.env.EXPO_PUBLIC_LS_ORACLE_MONTHLY_ID ?? '',
    lsYearlyVariantId: process.env.EXPO_PUBLIC_LS_ORACLE_MONTHLY_ID ?? '',
    dreamLimit: null,
    styleCount: 14,
    archiveDays: null,
    communityAccess: true,
    symbolismEngine: true,
    priorityRendering: true,
    features: [
      'Everything in Lucid',
      'Priority rendering (2×faster)',
      'AI dream journal & pattern analysis',
      'Monthly dream report',
      'Private dream coach (AI)',
      'Early access features',
      '3-day free trial',
    ],
  },
];

export const PLAN_MAP: Record<string, Plan> = {
  dreamer: PLANS[0],
  lucid: PLANS[1],
  oracle: PLANS[2],
};

// Gate feature access
export function canUseCommunity(tier: string): boolean {
  return tier === 'lucid' || tier === 'oracle';
}

export function canUseSymbolism(tier: string): boolean {
  return tier === 'lucid' || tier === 'oracle';
}

export function getRemainingDreams(tier: string, monthlyCount: number): number | null {
  if (tier !== 'dreamer') return null; // unlimited
  return Math.max(0, 3 - monthlyCount);
}
