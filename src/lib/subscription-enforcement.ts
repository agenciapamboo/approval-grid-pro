import { supabase } from "@/integrations/supabase/client";

export interface UserEntitlements {
  plan: string;
  posts_limit: number | null;
  creatives_limit: number | null;
  history_days: number;
  team_members_limit: number | null;
  whatsapp_support: boolean;
  graphics_approval: boolean;
  supplier_link: boolean;
  global_agenda: boolean;
  team_kanban: boolean;
  team_notifications: boolean;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isBlocked: boolean;
  isInGracePeriod: boolean;
  gracePeriodEnd: string | null;
  subscriptionStatus: string | null;
  plan: string;
  isPro: boolean;
  delinquent: boolean;
  entitlements: UserEntitlements | null;
  blockReason?: string;
  skipSubscriptionCheck: boolean;
}

/**
 * Get current user's subscription status and entitlements
 */
export async function getUserSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user profile with subscription data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, subscription_status, is_pro, delinquent, grace_period_end, current_period_end, skip_subscription_check')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Get entitlements for the user's plan
    const { data: entitlements, error: entitlementsError } = await supabase
      .rpc('get_user_entitlements', { user_id: user.id })
      .single();

    if (entitlementsError) {
      console.error('Error fetching entitlements:', entitlementsError);
    }

    // If user has skip_subscription_check enabled (internal/unlimited users)
    if (profile.skip_subscription_check) {
      return {
        isActive: true,
        isBlocked: false,
        isInGracePeriod: false,
        gracePeriodEnd: null,
        subscriptionStatus: profile.subscription_status,
        plan: profile.plan || 'unlimited',
        isPro: true,
        delinquent: false,
        entitlements: entitlements || null,
        skipSubscriptionCheck: true
      };
    }

    const now = new Date();
    const gracePeriodEnd = profile.grace_period_end ? new Date(profile.grace_period_end) : null;

    // Determine if user is in grace period
    const isInGracePeriod = profile.delinquent && gracePeriodEnd ? gracePeriodEnd > now : false;

    // Determine if user is blocked (ONLY for delinquency)
    let isBlocked = false;
    let blockReason: string | undefined;

    // Block ONLY if grace period has expired (delinquency)
    if (profile.delinquent && gracePeriodEnd && gracePeriodEnd < now) {
      isBlocked = true;
      blockReason = 'grace_period_expired';
    }

    // Determine if subscription is active
    const isActive = profile.subscription_status === 'active' || 
                     profile.subscription_status === 'trialing' ||
                     isInGracePeriod;

    return {
      isActive,
      isBlocked,
      isInGracePeriod,
      gracePeriodEnd: profile.grace_period_end,
      subscriptionStatus: profile.subscription_status,
      plan: profile.plan || 'creator',
      isPro: profile.is_pro || false,
      delinquent: profile.delinquent || false,
      entitlements: entitlements || null,
      blockReason,
      skipSubscriptionCheck: false
    };
  } catch (error) {
    console.error('Error in getUserSubscriptionStatus:', error);
    return null;
  }
}

/**
 * Check if user can perform a pro action
 */
export async function canPerformProAction(): Promise<{ allowed: boolean; reason?: string }> {
  const status = await getUserSubscriptionStatus();
  
  if (!status) {
    return { allowed: false, reason: 'Unable to verify subscription status' };
  }

  // Skip checks for internal/unlimited users
  if (status.skipSubscriptionCheck) {
    return { allowed: true };
  }

  if (status.isBlocked) {
    if (status.blockReason === 'grace_period_expired') {
      return { allowed: false, reason: 'Período de carência expirado. Atualize seu pagamento.' };
    }
    return { allowed: false, reason: 'Ação bloqueada. Verifique sua assinatura.' };
  }

  if (!status.isPro && status.plan === 'creator') {
    return { allowed: false, reason: 'Esta funcionalidade requer um plano pago.' };
  }

  return { allowed: true };
}

/**
 * Check if user has reached a specific limit
 */
export async function checkLimit(
  limitType: 'posts' | 'creatives' | 'team_members',
  currentCount: number
): Promise<{ withinLimit: boolean; limit: number | null; message?: string }> {
  const status = await getUserSubscriptionStatus();
  
  if (!status || !status.entitlements) {
    return { withinLimit: false, limit: null, message: 'Não foi possível verificar os limites' };
  }

  let limit: number | null = null;
  
  switch (limitType) {
    case 'posts':
      limit = status.entitlements.posts_limit;
      break;
    case 'creatives':
      limit = status.entitlements.creatives_limit;
      break;
    case 'team_members':
      limit = status.entitlements.team_members_limit;
      break;
  }

  // Null limit means unlimited
  if (limit === null) {
    return { withinLimit: true, limit: null };
  }

  const withinLimit = currentCount < limit;
  const message = withinLimit 
    ? undefined 
    : `Você atingiu o limite de ${limit} ${limitType} do seu plano ${status.plan}`;

  return { withinLimit, limit, message };
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(
  feature: 'whatsapp' | 'graphics_approval' | 'supplier_link' | 'global_agenda' | 'team_kanban' | 'team_notifications'
): Promise<{ hasAccess: boolean; reason?: string }> {
  const status = await getUserSubscriptionStatus();
  
  if (!status || !status.entitlements) {
    return { hasAccess: false, reason: 'Não foi possível verificar as permissões' };
  }

  // Skip checks for internal/unlimited users
  if (status.skipSubscriptionCheck) {
    return { hasAccess: true };
  }

  if (status.isBlocked) {
    return { hasAccess: false, reason: 'Sua conta está bloqueada. Verifique sua assinatura.' };
  }

  let hasAccess = false;
  
  switch (feature) {
    case 'whatsapp':
      hasAccess = status.entitlements.whatsapp_support;
      break;
    case 'graphics_approval':
      hasAccess = status.entitlements.graphics_approval;
      break;
    case 'supplier_link':
      hasAccess = status.entitlements.supplier_link;
      break;
    case 'global_agenda':
      hasAccess = status.entitlements.global_agenda;
      break;
    case 'team_kanban':
      hasAccess = status.entitlements.team_kanban;
      break;
    case 'team_notifications':
      hasAccess = status.entitlements.team_notifications;
      break;
  }

  const reason = hasAccess 
    ? undefined 
    : `Esta funcionalidade não está disponível no plano ${status.plan}`;

  return { hasAccess, reason };
}
