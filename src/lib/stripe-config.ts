// Stripe Products and Prices Configuration
// Currency: BRL (Brazilian Real)
// 
// IMPORTANT: These are LIVE MODE (Production) product IDs
// Ensure STRIPE_SECRET_KEY environment variable is set to a live mode key (sk_live_...)
// Test mode products will not match these IDs

export const STRIPE_PRODUCTS = {
  creator: {
    id: "prod_TLU5r2YFEPikQ7",
    name: "Creator",
    description: "Plano gratuito",
    free: true,
  },
  eugencia: {
    id: "prod_TTKCJxFk6gkYzZ", // ✅ LIVE MODE
    name: "Eugência",
    description: "Plano Eugência",
    prices: {
      monthly: {
        price_id: "price_1SWNYOH3HtGAQtCFj91Hl1Z6",
        amount: 2970, // R$ 29,70
        interval: "month",
      },
      annual: {
        price_id: "price_1SWNYQH3HtGAQtCF8FI0ott6",
        amount: 27000, // R$ 270,00
        interval: "year",
      },
    },
  },
  socialmidia: {
    id: "prod_TTKC8IEUJaLz0Y", // ✅ LIVE MODE
    name: "Agência Social Mídia",
    description: "Plano para agências de Social Mídia",
    prices: {
      monthly: {
        price_id: "price_1SWNYSH3HtGAQtCFYg6SSdCO",
        amount: 4950, // R$ 49,50
        interval: "month",
      },
      annual: {
        price_id: "price_1SWNYUH3HtGAQtCFTHvBvgN1",
        amount: 49500, // R$ 495,00
        interval: "year",
      },
    },
  },
  fullservice: {
    id: "prod_TTKCbFG1vbhxlB", // ✅ LIVE MODE
    name: "Agência Full Service",
    description: "Plano completo para agências",
    prices: {
      monthly: {
        price_id: "price_1SWNYXH3HtGAQtCFrh2uxRkD",
        amount: 9720, // R$ 97,20
        interval: "month",
      },
      annual: {
        price_id: "price_1SWNYZH3HtGAQtCFmzJV3oKw",
        amount: 97200, // R$ 972,00
        interval: "year",
      },
    },
  },
  unlimited: {
    id: "prod_internal_unlimited",
    name: "Sem Plano (Interno)",
    description: "Plano ilimitado para equipe interna",
    free: true,
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;
export type StripePriceInterval = "monthly" | "annual";

/**
 * Ordem padronizada dos planos para exibição em toda a aplicação
 */
export const PLAN_ORDER: StripePlan[] = ["creator", "eugencia", "socialmidia", "fullservice", "unlimited"] as const;

/**
 * Nomes de exibição dos planos
 */
export const PLAN_DISPLAY_NAMES: Record<StripePlan, string> = {
  creator: "Creator",
  eugencia: "Eugência",
  socialmidia: "Social Mídia",
  fullservice: "Full Service",
  unlimited: "Sem Plano (Interno)",
} as const;

/**
 * Get price_id for a specific plan and interval
 */
export const getPriceId = (plan: StripePlan, interval: StripePriceInterval): string | null => {
  const product = STRIPE_PRODUCTS[plan];
  if ("free" in product && product.free) return null;
  if (!("prices" in product)) return null;
  return product.prices?.[interval]?.price_id || null;
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
  const product = STRIPE_PRODUCTS[plan];
  return "free" in product && product.free === true;
};
