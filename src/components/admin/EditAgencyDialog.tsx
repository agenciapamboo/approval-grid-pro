import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string;
  brand_secondary?: string;
  logo_url?: string;
}

interface EditAgencyDialogProps {
  agency: Agency;
  onAgencyUpdated: () => void;
}

export function EditAgencyDialog({ agency, onAgencyUpdated }: EditAgencyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: agency.name,
    slug: agency.slug,
    brand_primary: agency.brand_primary || "#2563eb",
    brand_secondary: agency.brand_secondary || "#8b5cf6",
    logo_url: agency.logo_url || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          name: formData.name,
          slug: formData.slug,
          brand_primary: formData.brand_primary,
          brand_secondary: formData.brand_secondary,
          logo_url: formData.logo_url || null,
        })
        .eq("id", agency.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Agência atualizada com sucesso.",
      });

      setOpen(false);
      onAgencyUpdated();
    } catch (error) {
      console.error("Error updating agency:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a agência.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Agência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Agência</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador único)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              pattern="[a-z0-9-]+"
              title="Apenas letras minúsculas, números e hífens"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_primary">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="brand_primary"
                  type="color"
                  value={formData.brand_primary}
                  onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={formData.brand_primary}
                  onChange={(e) => setFormData({ ...formData, brand_primary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_secondary">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="brand_secondary"
                  type="color"
                  value={formData.brand_secondary}
                  onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={formData.brand_secondary}
                  onChange={(e) => setFormData({ ...formData, brand_secondary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">URL do Logo (opcional)</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
