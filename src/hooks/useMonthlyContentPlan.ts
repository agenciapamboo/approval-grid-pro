import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlanPost {
  id?: string;
  title: string;
  date: string;
  type: 'feed' | 'reels' | 'story' | 'carousel';
  category: string;
  caption: string;
  hashtags: string[];
  media_suggestion: string;
}

export function useMonthlyContentPlan() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PlanPost[]>([]);
  const { toast } = useToast();

  const generatePlan = async (
    clientId: string,
    period: 'week' | 'fortnight' | 'month',
    startDate: string
  ) => {
    try {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('generate-monthly-plan', {
        body: {
          clientId,
          period,
          startDate,
        },
      });

      if (error) throw error;

      const generatedPosts = (data?.posts || []).map((post: any, index: number) => ({
        ...post,
        id: `temp-${Date.now()}-${index}`,
      }));

      setPosts(generatedPosts);
      
      toast({
        title: 'Planejamento Gerado',
        description: `${generatedPosts.length} posts criados com sucesso`,
      });

      return generatedPosts;
    } catch (error: any) {
      console.error('Erro ao gerar planejamento:', error);
      toast({
        title: 'Erro ao gerar planejamento',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updatePost = (postId: string, updates: Partial<PlanPost>) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const generateVariation = async (
    clientId: string,
    originalCaption: string,
    customPrompt: string
  ): Promise<string[]> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          clientId,
          contentType: 'post',
          context: {
            title: 'Variação de legenda',
            description: `${customPrompt}\n\nLegenda original: ${originalCaption}`,
          },
        },
      });

      if (error) throw error;

      return data?.suggestions || [];
    } catch (error: any) {
      console.error('Erro ao gerar variação:', error);
      toast({
        title: 'Erro ao gerar variação',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const insertPlanIntoContents = async (
    clientId: string,
    userId: string,
    agencyId: string,
    posts: PlanPost[]
  ) => {
    try {
      setLoading(true);

      const contentsToInsert = posts.map((post) => ({
        title: post.title,
        date: post.date,
        type: post.type,
        category: post.category,
        status: 'draft' as const,
        client_id: clientId,
        owner_user_id: userId,
        agency_id: agencyId,
        is_content_plan: true,
        plan_description: post.media_suggestion,
        version: 1,
      }));

      const { data: insertedContents, error: insertError } = await supabase
        .from('contents')
        .insert(contentsToInsert)
        .select();

      if (insertError) throw insertError;

      // Inserir legendas na tabela content_texts
      if (insertedContents && insertedContents.length > 0) {
        const textsToInsert = insertedContents.map((content, index) => ({
          content_id: content.id,
          caption: posts[index].caption,
          version: 1,
        }));

        const { error: textsError } = await supabase
          .from('content_texts')
          .insert(textsToInsert);

        if (textsError) {
          console.error('Erro ao inserir legendas:', textsError);
        }
      }

      toast({
        title: 'Planejamento Inserido',
        description: `${insertedContents?.length || 0} posts adicionados ao planejamento`,
      });

      setPosts([]);
      return true;
    } catch (error: any) {
      console.error('Erro ao inserir planejamento:', error);
      toast({
        title: 'Erro ao inserir planejamento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    posts,
    generatePlan,
    updatePost,
    deletePost,
    generateVariation,
    insertPlanIntoContents,
  };
}
