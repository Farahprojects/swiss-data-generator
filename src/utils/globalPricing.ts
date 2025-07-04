// Global pricing fallback data
// This ensures the UI never breaks due to pricing fetch errors

export interface PricingData {
  id: string;
  unit_price_usd: number;
  name: string;
  description: string;
  report_type?: string;
}

export const GLOBAL_PRICING_FALLBACK: PricingData[] = [
  {
    id: 'essence_personal',
    unit_price_usd: 19.99,
    name: 'Personal Essence Report',
    description: 'Deep self-awareness and unlock your authentic potential',
    report_type: 'essence'
  },
  {
    id: 'essence_professional',
    unit_price_usd: 19.99,
    name: 'Professional Essence Report',
    description: 'Career mastery and unlock your professional strengths',
    report_type: 'essence'
  },
  {
    id: 'essence_relational',
    unit_price_usd: 19.99,
    name: 'Relational Essence Report',
    description: 'Master connections and deepen your relationship',
    report_type: 'essence'
  },
  {
    id: 'sync_personal',
    unit_price_usd: 29.99,
    name: 'Personal Compatibility Report',
    description: 'Romantic chemistry and build deeper personal bonds',
    report_type: 'sync'
  },
  {
    id: 'sync_professional',
    unit_price_usd: 29.99,
    name: 'Professional Compatibility Report',
    description: 'Unlock powerful collaboration dynamics with a team',
    report_type: 'sync'
  },
  {
    id: 'focus',
    unit_price_usd: 14.99,
    name: 'Focus Snapshot Report',
    description: 'Optimal timing insights for peak productivity and clarity',
    report_type: 'focus'
  },
  {
    id: 'monthly',
    unit_price_usd: 16.99,
    name: 'Monthly Energy Report',
    description: 'Your personal energy forecast and monthly momentum guide',
    report_type: 'monthly'
  },
  {
    id: 'mindset',
    unit_price_usd: 15.99,
    name: 'Mindset Report',
    description: 'Mental clarity insights and unlock your cognitive patterns',
    report_type: 'mindset'
  },
  {
    id: 'essence',
    unit_price_usd: 4.99,
    name: 'The Self - Astro Data',
    description: 'Raw ephemeris data - instant calculations',
    report_type: 'essence'
  },
  {
    id: 'sync',
    unit_price_usd: 4.99,
    name: 'Compatibility - Astro Data',
    description: 'Raw ephemeris data - instant calculations',
    report_type: 'sync'
  }
];

export const getGlobalPricing = (id: string): PricingData | null => {
  return GLOBAL_PRICING_FALLBACK.find(item => item.id === id) || null;
};

export const getGlobalPricingByReportType = (reportType: string): PricingData | null => {
  return GLOBAL_PRICING_FALLBACK.find(item => item.report_type === reportType) || null;
};