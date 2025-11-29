import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CarouselSlide {
  order: number;
  headline: string; // Frase de impacto curta para o slide
  text: string; // Texto explicativo do slide
}

interface PlanPost {
  id?: string;
  title: string;
  date: string;
  type: 'feed' | 'reels' | 'story' | 'carousel';
  category: string;
  caption: string;
  hashtags: string[];
  media_suggestion: string;
  slides?: CarouselSlide[]; // Para carrosséis: textos de cada slide
  slideCount?: number; // Número de slides do carrossel
}

export function useMonthlyContentPlan() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PlanPost[]>([]);
  const { toast } = useToast();

  const generatePlan = async (
    clientId: string,
    period: 'week' | 'fortnight' | 'month',
    startDate: string,
    carouselSlideCount: number = 5
  ) => {
    try {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Sessão não encontrada');
      }

      // Buscar dados do cliente para calcular número de posts
      const { data: clientData } = await supabase
        .from('clients')
        .select('monthly_creatives')
        .eq('id', clientId)
        .single();

      let postsCount = clientData?.monthly_creatives || 12;
      if (period === 'week') postsCount = Math.ceil(postsCount / 4);
      if (period === 'fortnight') postsCount = Math.ceil(postsCount / 2);

      console.log(`📅 Gerando ${postsCount} posts para ${period}`);

      // Gerar estrutura básica dos posts localmente
      const basicPosts = [];
      const startDateObj = new Date(startDate);
      
      for (let i = 0; i < postsCount; i++) {
        const postDate = new Date(startDateObj);
        postDate.setDate(postDate.getDate() + (i * 2)); // Espaçar 2 dias entre posts
        
        const types: ('feed' | 'reels' | 'story' | 'carousel')[] = ['feed', 'reels', 'carousel'];
        const randomType = types[i % types.length];
        
        basicPosts.push({
          id: `temp-${Date.now()}-${i}`,
          title: `Post ${i + 1}`,
          date: postDate.toISOString().split('T')[0],
          type: randomType,
          category: 'social',
        });
      }

      console.log(`📝 Estrutura básica criada, gerando legendas via generate-caption...`);

      // Gerar legendas usando generate-caption para cada post
      const postsWithCaptions = await Promise.all(
        basicPosts.map(async (post, index) => {
          try {
            console.log(`🤖 Gerando legenda para post ${index + 1}/${postsCount}...`);
            
            // Se for carrossel, gerar textos para cada slide
            if (post.type === 'carousel') {
              console.log(`🎠 Gerando carrossel com ${carouselSlideCount} slides...`);
              
              // Gerar legenda principal do carrossel
              const { data: captionData, error: captionError } = await supabase.functions.invoke('generate-caption', {
                body: {
                  clientId,
                  contentType: 'carousel',
                  context: {
                    title: `Carrossel para o dia ${post.date}`,
                    description: `Crie uma legenda completa e envolvente para este carrossel de redes sociais com ${carouselSlideCount} slides.`,
                  },
                },
              });

              if (captionError) {
                console.error(`❌ Erro ao gerar legenda do carrossel ${index + 1}:`, captionError);
                throw captionError;
              }

              const suggestions = captionData?.suggestions || [];
              const caption = suggestions[0] || 'Legenda não gerada';
              
              // Extrair hashtags da legenda
              const hashtagMatches = caption.match(/#\w+/g) || [];
              const hashtags = hashtagMatches.slice(0, 10);

              // Gerar textos para cada slide
              const slides: CarouselSlide[] = [];
              for (let slideIndex = 0; slideIndex < carouselSlideCount; slideIndex++) {
                try {
                  console.log(`  📄 Gerando texto para slide ${slideIndex + 1}/${carouselSlideCount}...`);
                  
                  const { data: slideData, error: slideError } = await supabase.functions.invoke('generate-caption', {
                    body: {
                      clientId,
                      contentType: 'carousel',
                      context: {
                        title: `Slide ${slideIndex + 1} de ${carouselSlideCount} do carrossel para ${post.date}`,
                        description: `Gere um texto conciso e direto para o slide ${slideIndex + 1} de um carrossel com ${carouselSlideCount} slides. O texto deve ser curto (idealmente 1-2 linhas) e complementar a legenda principal do carrossel. Cada slide deve ter um foco específico.`,
                      },
                    },
                  });

                  if (slideError) {
                    console.error(`❌ Erro ao gerar texto do slide ${slideIndex + 1}:`, slideError);
                    slides.push({
                      order: slideIndex,
                      headline: `Headline ${slideIndex + 1}`,
                      text: `Texto do slide ${slideIndex + 1} não gerado`,
                    });
                  } else {
                    const slideSuggestions = slideData?.suggestions || [];
                    const slideText = slideSuggestions[0] || `Texto do slide ${slideIndex + 1}`;
                    slides.push({
                      order: slideIndex,
                      headline: `Headline do Slide ${slideIndex + 1}`,
                      text: slideText,
                    });
                  }
                } catch (slideError: any) {
                  console.error(`❌ Erro ao gerar slide ${slideIndex + 1}:`, slideError);
                  slides.push({
                    order: slideIndex,
                    headline: `Headline ${slideIndex + 1}`,
                    text: `Texto do slide ${slideIndex + 1} não gerado`,
                  });
                }
              }

              return {
                ...post,
                caption,
                hashtags,
                media_suggestion: `Carrossel com ${carouselSlideCount} imagens`,
                slides,
                slideCount: carouselSlideCount,
              };
            } else {
              // Para outros tipos de post, gerar apenas a legenda principal
              const { data: captionData, error: captionError } = await supabase.functions.invoke('generate-caption', {
                body: {
                  clientId,
                  contentType: post.type,
                  context: {
                    title: `Post de ${post.type} para o dia ${post.date}`,
                    description: `Crie uma legenda completa e envolvente para este post de redes sociais.`,
                  },
                },
              });

              if (captionError) {
                console.error(`❌ Erro ao gerar legenda para post ${index + 1}:`, captionError);
                throw captionError;
              }

              const suggestions = captionData?.suggestions || [];
              const caption = suggestions[0] || 'Legenda não gerada';
              
              // Extrair hashtags da legenda
              const hashtagMatches = caption.match(/#\w+/g) || [];
              const hashtags = hashtagMatches.slice(0, 10);

              return {
                ...post,
                caption,
                hashtags,
                media_suggestion: `Imagem ou vídeo para ${post.type}`,
              };
            }
          } catch (error: any) {
            console.error(`❌ Erro no post ${index + 1}:`, error);
            return {
              ...post,
              caption: 'Erro ao gerar legenda',
              hashtags: [],
              media_suggestion: `Imagem ou vídeo para ${post.type}`,
            };
          }
        })
      );

      console.log(`✅ ${postsWithCaptions.length} posts gerados com legendas!`);

      setPosts(postsWithCaptions);
      
      toast({
        title: 'Planejamento Gerado',
        description: `${postsWithCaptions.length} posts criados com sucesso`,
      });

      return postsWithCaptions;
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

      const contentsToInsert = posts.map((post) => {
        // Se for carrossel com slides, armazenar informações dos slides no plan_description como JSON
        let planDescription = post.media_suggestion;
        if (post.type === 'carousel' && post.slides && post.slides.length > 0) {
          const slidesInfo = {
            slideCount: post.slideCount || post.slides.length,
            slides: post.slides.map(s => ({ order: s.order, text: s.text })),
          };
          planDescription = JSON.stringify({
            media_suggestion: post.media_suggestion,
            carousel_slides: slidesInfo,
          });
        }

        return {
          title: post.title,
          date: post.date,
          type: post.type,
          category: post.category,
          status: 'draft' as const,
          client_id: clientId,
          owner_user_id: userId,
          agency_id: agencyId,
          is_content_plan: true,
          plan_description: planDescription,
          version: 1,
        };
      });

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
