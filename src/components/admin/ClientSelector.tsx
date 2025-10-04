import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
}

export function ClientSelector({ clients, selectedClientId, onClientSelect }: ClientSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Selecione o Cliente *</Label>
      <Select value={selectedClientId || ""} onValueChange={onClientSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um cliente" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
