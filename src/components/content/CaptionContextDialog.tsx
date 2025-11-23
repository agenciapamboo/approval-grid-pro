import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CaptionContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contentType: 'post' | 'reels' | 'stories';
  initialTitle?: string;
  onGenerate: (context: CaptionContext) => void;
  loading: boolean;
}

export interface CaptionContext {
  title: string;
  objective: string;
  toneOfVoice: string;
  expectedAction: string;
}

export function CaptionContextDialog({ 
  open, 
  onOpenChange, 
  clientId,
  contentType,
  initialTitle = "",
  onGenerate,
  loading 
}: CaptionContextDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [expectedAction, setExpectedAction] = useState("");
  const [brandTone, setBrandTone] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    
    const loadBrandTone = async () => {
      setLoadingProfile(true);
      try {
        const { data } = await supabase
          .from('client_ai_profiles')
          .select('tone_of_voice')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data?.tone_of_voice?.length > 0) {
          setBrandTone(data.tone_of_voice.join(', '));
        }
      } catch (error) {
        console.error('Error loading brand tone:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadBrandTone();
    setTitle(initialTitle);
  }, [open, clientId, initialTitle]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Por favor, preencha o título da peça");
      return;
    }

    onGenerate({
      title,
      objective,
      toneOfVoice,
      expectedAction,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-500 rounded p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Contextualizar Geração de {contentType === 'post' ? 'Legenda' : 'Roteiro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da Peça *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lançamento Produto X, Dia das Mães, Promo Black Friday"
            />
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo da Peça</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger id="objective">
                <SelectValue placeholder="Selecione o objetivo principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">Engajamento (curtidas, comentários)</SelectItem>
                <SelectItem value="awareness">Awareness (reconhecimento de marca)</SelectItem>
                <SelectItem value="traffic">Tráfego (cliques para site/loja)</SelectItem>
                <SelectItem value="conversion">Conversão (vendas diretas)</SelectItem>
                <SelectItem value="education">Educação (informar, ensinar)</SelectItem>
                <SelectItem value="entertainment">Entretenimento (diversão)</SelectItem>
                <SelectItem value="community">Comunidade (fortalecer relacionamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tom de Voz */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom de Voz</Label>
            {loadingProfile ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando tom da marca...
              </div>
            ) : (
              <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Selecione o tom de voz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="professional">Profissional/Séria</SelectItem>
                  <SelectItem value="institutional">Institucional</SelectItem>
                  {brandTone && (
                    <SelectItem value="brand">
                      Da Marca ({brandTone})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Ação Esperada */}
          <div className="space-y-2">
            <Label htmlFor="action">Ação Esperada do Público</Label>
            <Textarea
              id="action"
              value={expectedAction}
              onChange={(e) => setExpectedAction(e.target.value)}
              placeholder="Ex: Curtir, Comentar com opinião, Clicar no link, Marcar amigos, Salvar para depois, Compartilhar, Comprar no site"
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Sugestões
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
