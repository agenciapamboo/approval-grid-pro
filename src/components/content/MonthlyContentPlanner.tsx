import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMonthlyContentPlan } from '@/hooks/useMonthlyContentPlan';
import { useUserData } from '@/hooks/useUserData';
import { PlanPostCard } from './PlanPostCard';
import { Loader2, Calendar, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MonthlyContentPlannerProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MonthlyContentPlanner({
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: MonthlyContentPlannerProps) {
  const { profile } = useUserData();
  const { loading, posts, generatePlan, updatePost, deletePost, generateVariation, insertPlanIntoContents } = useMonthlyContentPlan();
  const [period, setPeriod] = useState<'week' | 'fortnight' | 'month'>('month');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generationStep, setGenerationStep] = useState<'select' | 'generated'>('select');

  const handleGenerate = async () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    await generatePlan(clientId, period, startDate);
    setGenerationStep('generated');
  };

  const handleInsertPlan = async () => {
    if (!profile?.id || !profile?.agency_id) return;
    
    const success = await insertPlanIntoContents(
      clientId,
      profile.id,
      profile.agency_id,
      posts
    );

    if (success) {
      onOpenChange(false);
      setGenerationStep('select');
      onSuccess?.();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setGenerationStep('select');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planejamento Mensal de Conteúdo
          </DialogTitle>
        </DialogHeader>

        {generationStep === 'select' ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período do Planejamento</label>
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Próxima Semana</SelectItem>
                  <SelectItem value="fortnight">Próxima Quinzena</SelectItem>
                  <SelectItem value="month">Próximo Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Como funciona?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• O assistente consultará o perfil do cliente e a linha editorial</li>
                <li>• Gerará posts completos com título, data, legenda e hashtags</li>
                <li>• Você poderá editar cada post individualmente</li>
                <li>• Use o botão ✨ para gerar variações de legenda</li>
                <li>• Ao finalizar, os posts serão inseridos no planejamento</li>
              </ul>
            </div>

            {/* Prompt Personalizado (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="customPrompt" className="text-sm font-medium">
                Prompt Personalizado <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Textarea
                id="customPrompt"
                placeholder="Adicione instruções específicas para o planejamento. Ex: Foque em produtos novos, inclua mais vídeos, use tom mais profissional..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Este campo permite personalizar a geração com instruções adicionais
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando Planejamento...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Planejamento com IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {posts.length} {posts.length === 1 ? 'post gerado' : 'posts gerados'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setGenerationStep('select')}
                  disabled={loading}
                >
                  Gerar Novo
                </Button>
                <Button
                  onClick={handleInsertPlan}
                  disabled={loading || posts.length === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inserindo...
                    </>
                  ) : (
                    `Inserir ${posts.length} Posts no Planejamento`
                  )}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <PlanPostCard
                    key={post.id}
                    post={post}
                    clientId={clientId}
                    onUpdate={(updates) => post.id && updatePost(post.id, updates)}
                    onDelete={() => post.id && deletePost(post.id)}
                    onGenerateVariation={generateVariation}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
