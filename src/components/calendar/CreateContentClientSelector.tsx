import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Client {
  id: string;
  name: string;
  logo_url?: string;
}

interface CreateContentClientSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onClientSelected: (clientId: string) => void;
}

export function CreateContentClientSelector({ 
  open, 
  onOpenChange, 
  clients, 
  onClientSelected 
}: CreateContentClientSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Cliente</DialogTitle>
          <DialogDescription>
            Para qual cliente deseja criar o conteúdo?
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="p-4 cursor-pointer hover:bg-accent/50 hover:scale-[1.02] transition-all"
                onClick={() => onClientSelected(client.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.logo_url} alt={client.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {client.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      {client.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Clique para selecionar
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
