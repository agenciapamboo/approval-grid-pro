import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getUserSubscriptionStatus, 
  canPerformProAction, 
  checkLimit, 
  hasFeatureAccess,
  type SubscriptionStatus 
} from '../subscription-enforcement';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    rpc: vi.fn(() => ({
      single: vi.fn(),
    })),
  },
}));

describe('Subscription Enforcement - Internal Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return active status for internal users with skip_subscription_check', async () => {
    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    // Mock profile with skip_subscription_check
    const mockProfile = {
      id: 'test-user-id',
      plan: 'unlimited',
      skip_subscription_check: true,
      is_pro: true,
      delinquent: false,
      subscription_status: null,
      grace_period_end: null,
      entitlements: {
        posts_limit: null,
        creatives_limit: null,
        history_days: null,
        team_members_limit: null,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: true,
        global_agenda: true,
        team_kanban: true,
        team_notifications: true,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const status = await getUserSubscriptionStatus();

    expect(status).toBeDefined();
    expect(status?.skipSubscriptionCheck).toBe(true);
    expect(status?.isActive).toBe(true);
    expect(status?.isBlocked).toBe(false);
    expect(status?.isPro).toBe(true);
    expect(status?.plan).toBe('unlimited');
  });

  it('should allow all pro actions for internal users even when delinquent', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'unlimited',
      skip_subscription_check: true,
      is_pro: true,
      delinquent: true,
      grace_period_end: new Date(Date.now() - 86400000).toISOString(), // Expired grace period
      subscription_status: 'canceled',
      entitlements: {
        posts_limit: null,
        creatives_limit: null,
        history_days: null,
        team_members_limit: null,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: true,
        global_agenda: true,
        team_kanban: true,
        team_notifications: true,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const result = await canPerformProAction();
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should grant access to all features for internal users', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'unlimited',
      skip_subscription_check: true,
      is_pro: true,
      delinquent: false,
      subscription_status: null,
      grace_period_end: null,
      entitlements: {
        posts_limit: null,
        creatives_limit: null,
        history_days: null,
        team_members_limit: null,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: true,
        global_agenda: true,
        team_kanban: true,
        team_notifications: true,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const features = ['whatsapp', 'graphics_approval', 'supplier_link', 'global_agenda', 'team_kanban', 'team_notifications'] as const;
    
    for (const feature of features) {
      const result = await hasFeatureAccess(feature);
      expect(result.hasAccess).toBe(true);
    }
  });
});

describe('Subscription Enforcement - Delinquent Users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not block user in active grace period', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'eugencia',
      skip_subscription_check: false,
      is_pro: true,
      delinquent: true,
      grace_period_end: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days in future
      subscription_status: 'past_due',
      entitlements: {
        posts_limit: 50,
        creatives_limit: 100,
        history_days: 90,
        team_members_limit: 3,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: false,
        global_agenda: false,
        team_kanban: false,
        team_notifications: false,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const status = await getUserSubscriptionStatus();

    expect(status?.isBlocked).toBe(false);
    expect(status?.isInGracePeriod).toBe(true);
    expect(status?.isActive).toBe(true);
    expect(status?.gracePeriodEnd).toBeDefined();
  });

  it('should block user with expired grace period', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'eugencia',
      skip_subscription_check: false,
      is_pro: true,
      delinquent: true,
      grace_period_end: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      subscription_status: 'past_due',
      entitlements: {
        posts_limit: 50,
        creatives_limit: 100,
        history_days: 90,
        team_members_limit: 3,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: false,
        global_agenda: false,
        team_kanban: false,
        team_notifications: false,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const status = await getUserSubscriptionStatus();

    expect(status?.isBlocked).toBe(true);
    expect(status?.blockReason).toBe('grace_period_expired');
    expect(status?.isInGracePeriod).toBe(false);
  });

  it('should not block user with canceled subscription but no delinquency', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'creator',
      skip_subscription_check: false,
      is_pro: false,
      delinquent: false,
      grace_period_end: null,
      subscription_status: 'canceled',
      entitlements: {
        posts_limit: 10,
        creatives_limit: 20,
        history_days: 30,
        team_members_limit: 0,
        whatsapp_support: false,
        graphics_approval: false,
        supplier_link: false,
        global_agenda: false,
        team_kanban: false,
        team_notifications: false,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const status = await getUserSubscriptionStatus();

    expect(status?.isBlocked).toBe(false);
    expect(status?.isActive).toBe(false);
    expect(status?.plan).toBe('creator');
  });
});

describe('Plan Limits - Check Limit Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return within limit when count is below limit', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'eugencia',
      skip_subscription_check: false,
      is_pro: true,
      delinquent: false,
      subscription_status: 'active',
      grace_period_end: null,
      entitlements: {
        posts_limit: 50,
        creatives_limit: 100,
        history_days: 90,
        team_members_limit: 3,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: false,
        global_agenda: false,
        team_kanban: false,
        team_notifications: false,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const result = await checkLimit('posts', 25);

    expect(result.withinLimit).toBe(true);
    expect(result.limit).toBe(50);
  });

  it('should return not within limit when count equals or exceeds limit', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'eugencia',
      skip_subscription_check: false,
      is_pro: true,
      delinquent: false,
      subscription_status: 'active',
      grace_period_end: null,
      entitlements: {
        posts_limit: 50,
        creatives_limit: 100,
        history_days: 90,
        team_members_limit: 3,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: false,
        global_agenda: false,
        team_kanban: false,
        team_notifications: false,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const result = await checkLimit('posts', 50);

    expect(result.withinLimit).toBe(false);
    expect(result.limit).toBe(50);
    expect(result.message).toContain('limite');
  });

  it('should always return within limit for null limits (unlimited)', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    } as any);

    const mockProfile = {
      id: 'test-user-id',
      plan: 'unlimited',
      skip_subscription_check: true,
      is_pro: true,
      delinquent: false,
      subscription_status: null,
      grace_period_end: null,
      entitlements: {
        posts_limit: null,
        creatives_limit: null,
        history_days: null,
        team_members_limit: null,
        whatsapp_support: true,
        graphics_approval: true,
        supplier_link: true,
        global_agenda: true,
        team_kanban: true,
        team_notifications: true,
      },
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    } as any);

    vi.mocked(supabase.rpc).mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: mockProfile.entitlements,
        error: null,
      }),
    } as any);

    const result = await checkLimit('posts', 999999);

    expect(result.withinLimit).toBe(true);
    expect(result.limit).toBeNull();
  });
});
