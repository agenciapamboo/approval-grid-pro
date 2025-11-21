import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [searchValue, setSearchValue] = useState("");

  // Busca case-insensitive em qualquer ordem
  const filteredClients = clients.filter((client) => {
    const searchLower = searchValue.toLowerCase();
    const nameLower = client.name.toLowerCase();
    
    // Permite buscar "real" para encontrar "Ótica Real"
    return nameLower.includes(searchLower);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Cliente</DialogTitle>
          <DialogDescription>
            Para qual cliente deseja criar o conteúdo?
          </DialogDescription>
        </DialogHeader>

        <Command className="rounded-lg border">
          <CommandInput 
            placeholder="Digite para buscar cliente..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredClients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.id}
                onSelect={() => {
                  onClientSelected(client.id);
                  onOpenChange(false);
                  setSearchValue("");
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.logo_url} alt={client.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {client.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="flex-1 truncate">{client.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>

        <p className="text-xs text-muted-foreground mt-2">
          💡 Dica: Digite qualquer parte do nome para filtrar (ex: "Real" para "Ótica Real")
        </p>
      </DialogContent>
    </Dialog>
  );
}
