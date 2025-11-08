import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getClientPlanLimits, 
  checkMonthlyPostsLimit, 
  checkCreativesStorageLimit 
} from '../plan-limits';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            eq: vi.fn(),
          })),
        })),
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
      count: vi.fn(),
    })),
  },
}));

describe('Plan Limits - Get Client Plan Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return plan limits for a client', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'eugencia',
    };

    const mockEntitlements = {
      plan: 'eugencia',
      posts_limit: 50,
      creatives_limit: 100,
      history_days: 90,
      team_members_limit: 3,
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const limits = await getClientPlanLimits('client-id');

    expect(limits).toEqual({
      postsLimit: 50,
      creativesLimit: 100,
      historyDays: 90,
      teamMembersLimit: 3,
    });
  });

  it('should return null when client not found', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    } as any);

    const limits = await getClientPlanLimits('invalid-id');

    expect(limits).toBeNull();
  });
});

describe('Plan Limits - Check Monthly Posts Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return within limit when posts are below limit', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'eugencia',
    };

    const mockEntitlements = {
      plan: 'eugencia',
      posts_limit: 50,
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'contents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    count: 25,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          count: vi.fn(),
        } as any;
      }
      return {} as any;
    });

    const result = await checkMonthlyPostsLimit('client-id');

    expect(result.withinLimit).toBe(true);
    expect(result.currentCount).toBe(25);
    expect(result.limit).toBe(50);
  });

  it('should return not within limit when posts equal or exceed limit', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'eugencia',
    };

    const mockEntitlements = {
      plan: 'eugencia',
      posts_limit: 50,
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'contents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    count: 50,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          count: vi.fn(),
        } as any;
      }
      return {} as any;
    });

    const result = await checkMonthlyPostsLimit('client-id');

    expect(result.withinLimit).toBe(false);
    expect(result.currentCount).toBe(50);
    expect(result.limit).toBe(50);
    expect(result.message).toContain('limite');
  });

  it('should always return within limit for unlimited plans', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'unlimited',
    };

    const mockEntitlements = {
      plan: 'unlimited',
      posts_limit: null,
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'contents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    count: 999999,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          count: vi.fn(),
        } as any;
      }
      return {} as any;
    });

    const result = await checkMonthlyPostsLimit('client-id');

    expect(result.withinLimit).toBe(true);
    expect(result.limit).toBeNull();
  });
});

describe('Plan Limits - Check Creatives Storage Limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return within limit when creatives are below limit', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'socialmidia',
    };

    const mockEntitlements = {
      plan: 'socialmidia',
      creatives_limit: 150,
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'contents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    count: 75,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          count: vi.fn(),
        } as any;
      }
      return {} as any;
    });

    const result = await checkCreativesStorageLimit('client-id');

    expect(result.withinLimit).toBe(true);
    expect(result.currentCount).toBe(75);
    expect(result.limit).toBe(150);
  });

  it('should return oldest content title when limit exceeded', async () => {
    const mockClient = {
      id: 'client-id',
      agency_id: 'agency-id',
    };

    const mockAgency = {
      id: 'agency-id',
      plan: 'socialmidia',
    };

    const mockEntitlements = {
      plan: 'socialmidia',
      creatives_limit: 150,
    };

    const mockOldestContent = {
      title: 'Oldest Creative Content',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockClient,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'agencies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgency,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'plan_entitlements') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEntitlements,
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'contents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [mockOldestContent],
                    count: 150,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          count: vi.fn(),
        } as any;
      }
      return {} as any;
    });

    const result = await checkCreativesStorageLimit('client-id');

    expect(result.withinLimit).toBe(false);
    expect(result.currentCount).toBe(150);
    expect(result.limit).toBe(150);
    expect(result.oldestContentTitle).toBe('Oldest Creative Content');
  });
});
