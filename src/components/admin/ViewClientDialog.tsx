import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Calendar, Globe, Phone, MapPin, FileText } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  agency_id: string;
  cnpj?: string | null;
  plan_renewal_date?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  address?: string | null;
}

interface ViewClientDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewClientDialog({ client, open, onOpenChange }: ViewClientDialogProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados do Cliente
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {client.logo_url && (
            <div className="flex justify-center">
              <img src={client.logo_url} alt={client.name} className="h-16 object-contain" />
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Nome</h3>
              <p className="text-base">{client.name}</p>
            </div>

            {client.cnpj && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CNPJ
                </h3>
                <p className="text-base">{client.cnpj}</p>
              </div>
            )}

            {client.plan_renewal_date && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Vencimento
                </h3>
                <p className="text-base">
                  {new Date(client.plan_renewal_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.website && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Site
                </h3>
                <a 
                  href={client.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-base text-primary hover:underline"
                >
                  {client.website}
                </a>
              </div>
            )}

            {client.whatsapp && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </h3>
                <p className="text-base">{client.whatsapp}</p>
              </div>
            )}

            {client.address && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h3>
                <p className="text-base">{client.address}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
