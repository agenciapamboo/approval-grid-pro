import { useQuery } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UsePaginatedQueryOptions extends PaginationOptions {
  filters?: Record<string, any>;
  select?: string;
  enabled?: boolean;
}

export function usePaginatedQuery<T = Record<string, any>>(
  tableName: string,
  options: UsePaginatedQueryOptions = {}
) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'created_at',
    ascending = false,
    filters = {},
    select = '*',
    enabled = true,
  } = options;

  return useQuery<PaginatedResult<T>, Error>({
    queryKey: ['paginated', tableName, page, pageSize, orderBy, ascending, JSON.stringify(filters)],
    queryFn: async (): Promise<PaginatedResult<T>> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query dinamicamente
      const { data, error, count } = await (async () => {
        let queryBuilder = (supabase as any)
          .from(tableName)
          .select(select, { count: 'exact' })
          .range(from, to)
          .order(orderBy, { ascending });

        // Aplicar filtros
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryBuilder = queryBuilder.eq(key, value);
          }
        });

        return await queryBuilder;
      })();

      if (error) throw error;

      return {
        data: (data || []) as T[],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
