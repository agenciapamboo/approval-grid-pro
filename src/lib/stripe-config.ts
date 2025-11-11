// Stripe Products and Prices Configuration
// Currency: BRL (Brazilian Real)

export const STRIPE_PRODUCTS = {
  creator: {
    id: "prod_TLU5r2YFEPikQ7",
    name: "Creator",
    description: "Plano gratuito",
    free: true,
  },
  eugencia: {
    id: "prod_TOmNQqnBSOTgC6",
    name: "Eugência",
    description: "Plano Eugência",
    prices: {
      monthly: {
        lookup_key: "plano_eugencia_mensal",
        amount: 2970, // R$ 29,70
        interval: "month",
      },
      annual: {
        lookup_key: "plano_eugencia_anual",
        amount: 27000, // R$ 270,00
        interval: "year",
      },
    },
  },
  socialmidia: {
    id: "prod_TOmOccSkOPId3E",
    name: "Agência Social Mídia",
    description: "Plano para agências de Social Mídia",
    prices: {
      monthly: {
        lookup_key: "plano_socialmidia_mensal",
        amount: 4950, // R$ 49,50
        interval: "month",
      },
      annual: {
        lookup_key: "plano_socialmidia_anual",
        amount: 49500, // R$ 495,00
        interval: "year",
      },
    },
  },
  fullservice: {
    id: "prod_TOmS1DcVAM4lUE",
    name: "Agência Full Service",
    description: "Plano completo para agências",
    prices: {
      monthly: {
        lookup_key: "plano_agencia_mensal",
        amount: 9720, // R$ 97,20
        interval: "month",
      },
      annual: {
        lookup_key: "plano_agencia_anual",
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
 * Get lookup_key for a specific plan and interval
 */
export const getPriceLookupKey = (plan: StripePlan, interval: StripePriceInterval): string | null => {
  const product = STRIPE_PRODUCTS[plan];
  if ("free" in product && product.free) return null;
  if (!("prices" in product)) return null;
  return product.prices?.[interval]?.lookup_key || null;
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
