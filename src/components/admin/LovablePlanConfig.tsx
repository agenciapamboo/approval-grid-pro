import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, RotateCcw, AlertCircle, Database, HardDrive, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlanConfig {
  id: string;
  plan_name: string;
  database_quota_mb: number;
  storage_quota_gb: number;
  egress_quota_gb: number;
  database_overage_cost_per_gb_month: number;
  storage_overage_cost_per_gb: number;
  egress_overage_cost_per_gb: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function LovablePlanConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PlanConfig | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lovable_plan_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;

      setConfig(data);
      setOriginalConfig(data);
    } catch (error: any) {
      console.error('Error loading plan config:', error);
      toast({
        title: "Erro ao carregar configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('lovable_plan_config')
        .update({
          plan_name: config.plan_name,
          database_quota_mb: config.database_quota_mb,
          storage_quota_gb: config.storage_quota_gb,
          egress_quota_gb: config.egress_quota_gb,
          database_overage_cost_per_gb_month: config.database_overage_cost_per_gb_month,
          storage_overage_cost_per_gb: config.storage_overage_cost_per_gb,
          egress_overage_cost_per_gb: config.egress_overage_cost_per_gb,
          notes: config.notes,
        })
        .eq('id', config.id);

      if (error) throw error;

      setOriginalConfig(config);
      toast({
        title: "Sucesso",
        description: "Configuração do plano atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error saving plan config:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig);
    }
  };

  const hasChanges = config && originalConfig && 
    JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma configuração de plano encontrada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Plano Lovable</CardTitle>
        <CardDescription>
          Configure as quotas e custos de over-usage do seu plano Lovable Cloud.
          Valores baseados no Supabase Pro até confirmação oficial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Estes valores são baseados nas quotas do Supabase Pro Plan.
            Atualize conforme necessário quando obtiver confirmação oficial do Lovable.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="plan_name">Nome do Plano</Label>
            <Input
              id="plan_name"
              value={config.plan_name}
              onChange={(e) => setConfig({ ...config, plan_name: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="database_quota_mb" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Quota (MB)
              </Label>
              <Input
                id="database_quota_mb"
                type="number"
                value={config.database_quota_mb}
                onChange={(e) => setConfig({ ...config, database_quota_mb: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Atual: {(config.database_quota_mb / 1024).toFixed(2)} GB
              </p>
            </div>

            <div>
              <Label htmlFor="storage_quota_gb" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage Quota (GB)
              </Label>
              <Input
                id="storage_quota_gb"
                type="number"
                value={config.storage_quota_gb}
                onChange={(e) => setConfig({ ...config, storage_quota_gb: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="egress_quota_gb" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Bandwidth Quota (GB/mês)
              </Label>
              <Input
                id="egress_quota_gb"
                type="number"
                value={config.egress_quota_gb}
                onChange={(e) => setConfig({ ...config, egress_quota_gb: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="db_cost">Custo Over DB (R$/GB/mês)</Label>
              <Input
                id="db_cost"
                type="number"
                step="0.0001"
                value={config.database_overage_cost_per_gb_month}
                onChange={(e) => setConfig({ ...config, database_overage_cost_per_gb_month: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="storage_cost">Custo Over Storage (R$/GB)</Label>
              <Input
                id="storage_cost"
                type="number"
                step="0.0001"
                value={config.storage_overage_cost_per_gb}
                onChange={(e) => setConfig({ ...config, storage_overage_cost_per_gb: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="egress_cost">Custo Over Bandwidth (R$/GB)</Label>
              <Input
                id="egress_cost"
                type="number"
                step="0.0001"
                value={config.egress_overage_cost_per_gb}
                onChange={(e) => setConfig({ ...config, egress_overage_cost_per_gb: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas / Documentação</Label>
            <Textarea
              id="notes"
              value={config.notes || ''}
              onChange={(e) => setConfig({ ...config, notes: e.target.value })}
              placeholder="Adicione notas sobre a origem dos valores, atualizações, etc."
              rows={4}
            />
          </div>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
