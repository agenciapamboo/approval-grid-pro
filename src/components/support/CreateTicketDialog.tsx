import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets, TicketCategory, TicketPriority } from "@/hooks/useSupportTickets";
import { useEffect } from "react";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: TicketCategory;
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  'suporte': 'Suporte Técnico',
  'duvidas': 'Dúvidas',
  'financeiro': 'Financeiro',
  'agencia': 'Comunicação com Agência',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  'low': 'Baixa',
  'normal': 'Normal',
  'high': 'Alta',
  'urgent': 'Urgente',
};

export function CreateTicketDialog({ open, onOpenChange, defaultCategory }: CreateTicketDialogProps) {
  const [category, setCategory] = useState<TicketCategory>(defaultCategory || 'suporte');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [availableCategories, setAvailableCategories] = useState<TicketCategory[]>([]);
  
  const { createTicket, loading, getAvailableCategories } = useSupportTickets();

  useEffect(() => {
    const loadCategories = async () => {
      const categories = await getAvailableCategories();
      setAvailableCategories(categories);
      
      // Se a categoria padrão não está disponível, usar a primeira disponível
      if (defaultCategory && !categories.includes(defaultCategory)) {
        setCategory(categories[0]);
      }
    };
    
    if (open) {
      loadCategories();
    }
  }, [open, defaultCategory, getAvailableCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      return;
    }

    const result = await createTicket(category, subject, description, priority);
    
    if (result.success) {
      setSubject('');
      setDescription('');
      setPriority('normal');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Abrir Novo Ticket</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para abrir um ticket de atendimento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as TicketCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as TicketPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Descreva brevemente o assunto"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva em detalhes sua solicitação ou problema"
              required
              rows={6}
              maxLength={2000}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
