import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Save } from "lucide-react";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  agency_id: string;
}

interface ClientManagerProps {
  client: Client;
  agencySlug: string;
  onUpdate: () => void;
}

export function ClientManager({ client, agencySlug, onUpdate }: ClientManagerProps) {
  const [slug, setSlug] = useState(client.slug);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const clientUrl = `${window.location.origin}/${agencySlug}/${slug}`;

  const handleSaveSlug = async () => {
    if (slug === client.slug) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ slug })
        .eq("id", client.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Slug atualizado com sucesso!",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar slug",
        variant: "destructive",
      });
      setSlug(client.slug);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{client.name}</CardTitle>
            {client.logo_url && (
              <img src={client.logo_url} alt={client.name} className="h-8 mt-2 object-contain" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`slug-${client.id}`}>Slug (URL)</Label>
          <div className="flex gap-2">
            <Input
              id={`slug-${client.id}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="slug-do-cliente"
            />
            <Button 
              onClick={handleSaveSlug} 
              disabled={saving || slug === client.slug}
              size="icon"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Link do Cliente</Label>
          <div className="flex gap-2">
            <Input 
              value={clientUrl} 
              readOnly 
              className="bg-muted"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.open(clientUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
