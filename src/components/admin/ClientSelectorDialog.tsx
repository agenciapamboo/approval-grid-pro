import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Building2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  agencies: {
    name: string;
  };
}

interface ClientSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientSelectorDialog({ open, onOpenChange }: ClientSelectorDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          logo_url,
          agencies (
            name
          )
        `)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/agency/client/${clientId}/conteudos`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione um Cliente</DialogTitle>
          <DialogDescription>
            Escolha o cliente para visualizar os conteúdos
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {clients.map((client) => (
                <Button
                  key={client.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => handleClientSelect(client.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                      <AvatarFallback>
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {client.agencies.name}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
