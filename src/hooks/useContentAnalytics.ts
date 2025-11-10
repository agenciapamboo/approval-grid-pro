import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContentAnalytics {
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  topKeywords: Array<{ keyword: string; frequency: number }>;
  preferredWeekdays: Array<{ day: number; count: number }>;
  contentTypes: Array<{ type: string; count: number }>;
  usedHistoricalEvents: string[];
  approvalRate: number;
  totalContents: number;
}

export function useContentAnalytics(clientId: string | null) {
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    loadAnalytics();
  }, [clientId]);

  const loadAnalytics = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Check cache first
      const cacheKey = `analytics_${clientId}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > 1000 * 60 * 30; // 30 min
        
        if (!isExpired) {
          setAnalytics(data);
          setLoading(false);
          return;
        }
      }

      // Fetch contents from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: contents, error } = await supabase
        .from('contents')
        .select('id, title, category, type, status, date, created_at')
        .eq('client_id', clientId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!contents || contents.length === 0) {
        setAnalytics({
          topCategories: [],
          topKeywords: [],
          preferredWeekdays: [],
          contentTypes: [],
          usedHistoricalEvents: [],
          approvalRate: 0,
          totalContents: 0
        });
        setLoading(false);
        return;
      }

      // 1. Analyze categories
      const categoryCount = new Map<string, number>();
      contents.forEach(c => {
        const cat = c.category || 'social';
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });

      const topCategories = Array.from(categoryCount.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / contents.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // 2. Extract keywords from titles
      const keywords = new Map<string, number>();
      const stopWords = ['de', 'da', 'do', 'para', 'com', 'em', 'o', 'a', 'os', 'as', 'e', 'ou', 'no', 'na'];
      
      contents.forEach(c => {
        const words = c.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.includes(w));
        
        words.forEach(word => {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        });
      });

      const topKeywords = Array.from(keywords.entries())
        .map(([keyword, frequency]) => ({ keyword, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);

      // 3. Analyze preferred weekdays
      const weekdayCount = new Map<number, number>();
      contents.forEach(c => {
        const day = new Date(c.date).getDay();
        weekdayCount.set(day, (weekdayCount.get(day) || 0) + 1);
      });

      const preferredWeekdays = Array.from(weekdayCount.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      // 4. Content types
      const typeCount = new Map<string, number>();
      contents.forEach(c => {
        typeCount.set(c.type, (typeCount.get(c.type) || 0) + 1);
      });

      const contentTypes = Array.from(typeCount.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // 5. Calculate approval rate (not rejected or in draft)
      const approved = contents.filter(c => 
        c.status !== 'changes_requested' && c.status !== 'draft'
      ).length;
      
      const approvalRate = (approved / contents.length) * 100;

      // 6. Extract historical events already used
      const usedHistoricalEvents = contents
        .map(c => c.title)
        .filter(title => 
          title.toLowerCase().includes('dia') || 
          title.toLowerCase().includes('aniversário') ||
          title.toLowerCase().includes('aniversario') ||
          title.toLowerCase().includes('feriado')
        );

      const analyticsData: ContentAnalytics = {
        topCategories,
        topKeywords,
        preferredWeekdays,
        contentTypes,
        usedHistoricalEvents,
        approvalRate,
        totalContents: contents.length
      };

      setAnalytics(analyticsData);

      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data: analyticsData,
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refresh: loadAnalytics };
}
