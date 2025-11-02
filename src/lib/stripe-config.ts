// Stripe Products and Prices Configuration
// Currency: BRL (Brazilian Real)

export const STRIPE_PRODUCTS = {
  creator: {
    id: 'prod_TLU5r2YFEPikQ7',
    name: 'Creator',
    description: 'Plano gratuito',
    free: true,
  },
  eugencia: {
    id: 'prod_TLUHBx7ZnfIvX7',
    name: 'Eugência',
    description: 'Plano Eugência',
    prices: {
      monthly: {
        lookup_key: 'plano_eugencia_mensal',
        amount: 2970, // R$ 29,70
        interval: 'month',
      },
      annual: {
        lookup_key: 'plano_eugencia_anual',
        amount: 27000, // R$ 270,00
        interval: 'year',
      },
    },
  },
  socialMidia: {
    id: 'prod_TLUSSunwc1e3z3',
    name: 'Agência Social Mídia',
    description: 'Plano para agências de Social Mídia',
    prices: {
      monthly: {
        lookup_key: 'plano_mensal_socialmidia',
        amount: 4950, // R$ 49,50
        interval: 'month',
      },
      annual: {
        lookup_key: 'plano_anual_socialmidia',
        amount: 49500, // R$ 495,00
        interval: 'year',
      },
    },
  },
  fullService: {
    id: 'prod_TLXZljt4VYKjyA',
    name: 'Agência Full Service',
    description: 'Plano completo para agências',
    prices: {
      monthly: {
        lookup_key: 'plano_agencia_mensal',
        amount: 9720, // R$ 97,20
        interval: 'month',
      },
      annual: {
        lookup_key: 'plano_agencia_anual',
        amount: 97200, // R$ 972,00
        interval: 'year',
      },
    },
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;
export type StripePriceInterval = 'monthly' | 'annual';

/**
 * Get lookup_key for a specific plan and interval
 */
export const getPriceLookupKey = (plan: StripePlan, interval: StripePriceInterval): string | null => {
  const product = STRIPE_PRODUCTS[plan];
  if (!product || product.free) return null;
  return (product.prices as any)?.[interval]?.lookup_key || null;
};

/**
 * Get product ID for a plan
 */
export const getProductId = (plan: StripePlan): string => {
  return STRIPE_PRODUCTS[plan].id;
};

/**
 * Check if a plan is free
 */
export const isFreePlan = (plan: StripePlan): boolean => {
  return STRIPE_PRODUCTS[plan].free === true;
};
