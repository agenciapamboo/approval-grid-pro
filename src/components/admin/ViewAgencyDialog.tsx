import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
  created_at?: string;
}

interface ViewAgencyDialogProps {
  agency: Agency;
}

export function ViewAgencyDialog({ agency }: ViewAgencyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalhes da Agência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {agency.logo_url && (
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <img 
                src={agency.logo_url} 
                alt={agency.name}
                className="h-20 object-contain"
              />
            </div>
          )}
          
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-base">{agency.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <p className="text-base font-mono text-sm">{agency.slug}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cor Primária</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: agency.brand_primary || '#2563eb' }}
                  />
                  <p className="text-sm font-mono">{agency.brand_primary || '#2563eb'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cor Secundária</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: agency.brand_secondary || '#8b5cf6' }}
                  />
                  <p className="text-sm font-mono">{agency.brand_secondary || '#8b5cf6'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
