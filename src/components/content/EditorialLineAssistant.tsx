import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EditorialLineAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onContentCreated?: () => void;
}

interface Client {
  id: string;
  name: string;
  monthly_creatives?: number;
}

interface EditorialStructure {
  editorial_line?: string;
  monthly_structure?: {
    total_creatives: number;
    weeks: Array<{
      week_number: number;
      posts: Array<{
        type: string;
        description: string;
      }>;
    }>;
  };
}

export function EditorialLineAssistant({ 
  open, 
  onOpenChange, 
  agencyId,
  onContentCreated 
}: EditorialLineAssistantProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingEditorial, setLoadingEditorial] = useState(false);
  const [editorialData, setEditorialData] = useState<EditorialStructure | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (open && agencyId) {
      loadClients();
    }
  }, [open, agencyId]);

  useEffect(() => {
    if (selectedClientId) {
      loadEditorialLine();
    } else {
      setEditorialData(null);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, monthly_creatives')
        .eq('agency_id', agencyId)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoadingClients(false);
    }
  };

  const loadEditorialLine = async () => {
    if (!selectedClientId) return;

    setLoadingEditorial(true);
    try {
      const { data, error } = await supabase
        .from('client_ai_profiles')
        .select('editorial_line, briefing_templates(template_type)')
        .eq('client_id', selectedClientId)
        .maybeSingle();

      if (error) throw error;

      if (data?.editorial_line) {
        // Tentar parsear se for JSON
        try {
          const parsed = typeof data.editorial_line === 'string' 
            ? JSON.parse(data.editorial_line) 
            : data.editorial_line;
          setEditorialData(parsed);
        } catch {
          // Se não for JSON, tratar como texto simples
          setEditorialData({ editorial_line: data.editorial_line });
        }
      } else {
        setEditorialData(null);
        toast.info("Este cliente ainda não possui linha editorial configurada");
      }
    } catch (error) {
      console.error('Error loading editorial line:', error);
      toast.error("Erro ao carregar linha editorial");
      setEditorialData(null);
    } finally {
      setLoadingEditorial(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedClientId || !editorialData?.monthly_structure || selectedWeek === null || !selectedMonth) {
      toast.error("Selecione um cliente, semana e mês");
      return;
    }

    const week = editorialData.monthly_structure.weeks.find(w => w.week_number === selectedWeek);
    if (!week) {
      toast.error("Semana não encontrada");
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calcular data da semana selecionada no mês escolhido
      const [year, month] = selectedMonth.split('-').map(Number);
      if (!year || !month) {
        throw new Error("Data inválida");
      }
      const weekStartDate = new Date(year, month - 1, 1 + (selectedWeek - 1) * 7);

      // Criar conteúdos para cada post da semana
      const createdContents = [];
      for (const post of week.posts) {
        const contentDate = new Date(weekStartDate);
        contentDate.setDate(contentDate.getDate() + (createdContents.length * 2)); // Espaçar posts em 2 dias

        const { data: content, error: contentError } = await supabase
          .from('contents')
          .insert([{
            client_id: selectedClientId,
            agency_id: agencyId,
            title: `${post.type} - ${post.description.substring(0, 50)}`,
            type: getContentTypeFromPostType(post.type),
            status: 'draft',
            date: contentDate.toISOString(),
            owner_user_id: user.id,
            is_content_plan: true,
            plan_description: `Tipo: ${post.type}\n\n${post.description}\n\nBaseado na linha editorial do cliente.`
          }])
          .select()
          .single();

        if (contentError) {
          console.error(`Error creating content for ${post.type}:`, contentError);
          continue;
        }

        createdContents.push(content);
      }

      toast.success(`${createdContents.length} conteúdo(s) criado(s) com sucesso!`);
      onContentCreated?.();
      onOpenChange(false);
      
      // Resetar seleções
      setSelectedWeek(null);
      setSelectedMonth("");
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || "Erro ao criar conteúdos");
    } finally {
      setGenerating(false);
    }
  };

  const getContentTypeFromPostType = (postType: string): "feed" | "story" | "reels" | "carousel" | "image" => {
    const typeMap: Record<string, "feed" | "story" | "reels" | "carousel" | "image"> = {
      'Carrossel História': 'carousel',
      'Venda direta': 'feed',
      'Educacional': 'feed',
      'Curiosidade': 'feed',
      'Institucional': 'feed',
      'Entretenimento': 'reels',
      'Promocional': 'feed',
      'Engajamento': 'feed',
    };
    return typeMap[postType] || 'feed';
  };

  // Gerar opções de meses (próximos 3 meses)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      options.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: format(date, 'MMMM yyyy', { locale: ptBR })
      });
    }
    return options;
  };

  const hasEditorialStructure = editorialData?.monthly_structure?.weeks?.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Assistente de IA - Linha Editorial
          </DialogTitle>
          <DialogDescription>
            Use a linha editorial do cliente para criar conteúdos automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando clientes...
              </div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.monthly_creatives && (
                        <span className="text-muted-foreground ml-2">
                          ({client.monthly_creatives} posts/mês)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Carregando linha editorial */}
          {selectedClientId && loadingEditorial && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              <span className="ml-2 text-sm text-muted-foreground">
                Carregando linha editorial...
              </span>
            </div>
          )}

          {/* Exibir estrutura semanal */}
          {selectedClientId && !loadingEditorial && hasEditorialStructure && (
            <>
              {/* Descrição geral */}
              {editorialData.editorial_line && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Linha Editorial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {typeof editorialData.editorial_line === 'string' 
                        ? editorialData.editorial_line 
                        : JSON.stringify(editorialData.editorial_line)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Estrutura semanal */}
              <div className="space-y-3">
                <Label>Selecione a semana para gerar conteúdos</Label>
                <div className="grid gap-3">
                  {editorialData.monthly_structure.weeks.map((week) => (
                    <Card 
                      key={week.week_number}
                      className={`cursor-pointer transition-all ${
                        selectedWeek === week.week_number 
                          ? 'border-green-500 border-2' 
                          : 'hover:border-green-500/50'
                      }`}
                      onClick={() => setSelectedWeek(week.week_number)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                              {week.week_number}
                            </span>
                            Semana {week.week_number}
                          </CardTitle>
                          <Badge variant="outline">
                            {week.posts.length} posts
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {week.posts.map((post, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                              <Badge variant="outline" className="shrink-0">
                                {post.type}
                              </Badge>
                              <p className="text-sm text-muted-foreground flex-1">
                                {post.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Seletor de mês */}
              {selectedWeek !== null && (
                <div className="space-y-2">
                  <Label>Mês para criar os conteúdos</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botão de gerar */}
              {selectedWeek !== null && selectedMonth && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={generating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerateContent}
                    disabled={generating}
                    className="bg-green-500 hover:bg-green-600 gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando conteúdos...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Criar Conteúdos da Semana {selectedWeek}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Mensagem quando não há estrutura */}
          {selectedClientId && !loadingEditorial && !hasEditorialStructure && (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Este cliente não possui uma linha editorial estruturada.
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure a linha editorial em: Cliente → Briefing → Linha Editorial
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

