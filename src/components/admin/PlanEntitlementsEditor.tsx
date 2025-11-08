import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Package } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PlanEntitlement {
  id: string;
  plan: string;
  posts_limit: number | null;
  creatives_limit: number | null;
  history_days: number;
  team_members_limit: number | null;
  whatsapp_support: boolean;
  graphics_approval: boolean;
  supplier_link: boolean;
  global_agenda: boolean;
  team_kanban: boolean;
  team_notifications: boolean;
}

export const PlanEntitlementsEditor = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanEntitlement[]>([]);
  const [editingPlan, setEditingPlan] = useState<Record<string, PlanEntitlement>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("plan_entitlements")
        .select("*")
        .order("plan");

      if (error) throw error;

      setPlans(data || []);
      const editMap: Record<string, PlanEntitlement> = {};
      (data || []).forEach((plan) => {
        editMap[plan.plan] = { ...plan };
      });
      setEditingPlan(editMap);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os planos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSavePlan = async (planKey: string) => {
    setSaving({ ...saving, [planKey]: true });
    try {
      const planData = editingPlan[planKey];
      
      const { error } = await supabase
        .from("plan_entitlements")
        .update({
          posts_limit: planData.posts_limit,
          creatives_limit: planData.creatives_limit,
          history_days: planData.history_days,
          team_members_limit: planData.team_members_limit,
          whatsapp_support: planData.whatsapp_support,
          graphics_approval: planData.graphics_approval,
          supplier_link: planData.supplier_link,
          global_agenda: planData.global_agenda,
          team_kanban: planData.team_kanban,
          team_notifications: planData.team_notifications,
        })
        .eq("plan", planKey);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: `O plano ${getPlanLabel(planKey)} foi atualizado com sucesso.`,
      });

      await loadPlans();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o plano.",
      });
    } finally {
      setSaving({ ...saving, [planKey]: false });
    }
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      creator: "Creator (Gratuito)",
      eugencia: "Eugência",
      socialmidia: "Social Mídia",
      fullservice: "Full Service",
      unlimited: "Sem Plano (Interno)",
    };
    return labels[plan] || plan;
  };

  const updatePlanField = (planKey: string, field: keyof PlanEntitlement, value: any) => {
    setEditingPlan({
      ...editingPlan,
      [planKey]: {
        ...editingPlan[planKey],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Editor de Planos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Editor de Planos
        </CardTitle>
        <CardDescription>
          Configure os limites e recursos de cada plano
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {plans.map((plan) => (
            <AccordionItem key={plan.plan} value={plan.plan}>
              <AccordionTrigger className="text-lg font-semibold">
                {getPlanLabel(plan.plan)}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  {/* Limites Numéricos */}
                  <div>
                    <h4 className="text-sm font-medium mb-4">Limites Numéricos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Posts Limit */}
                      <div className="space-y-2">
                        <Label>Posts por mês</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingPlan[plan.plan]?.posts_limit || ""}
                            onChange={(e) =>
                              updatePlanField(plan.plan, "posts_limit", e.target.value ? parseInt(e.target.value) : null)
                            }
                            disabled={editingPlan[plan.plan]?.posts_limit === null}
                            placeholder="Limite"
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editingPlan[plan.plan]?.posts_limit === null}
                              onCheckedChange={(checked) =>
                                updatePlanField(plan.plan, "posts_limit", checked ? null : 0)
                              }
                            />
                            <span className="text-sm">Ilimitado</span>
                          </div>
                        </div>
                      </div>

                      {/* Creatives Limit */}
                      <div className="space-y-2">
                        <Label>Criativos por mês</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingPlan[plan.plan]?.creatives_limit || ""}
                            onChange={(e) =>
                              updatePlanField(plan.plan, "creatives_limit", e.target.value ? parseInt(e.target.value) : null)
                            }
                            disabled={editingPlan[plan.plan]?.creatives_limit === null}
                            placeholder="Limite"
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editingPlan[plan.plan]?.creatives_limit === null}
                              onCheckedChange={(checked) =>
                                updatePlanField(plan.plan, "creatives_limit", checked ? null : 0)
                              }
                            />
                            <span className="text-sm">Ilimitado</span>
                          </div>
                        </div>
                      </div>

                      {/* History Days */}
                      <div className="space-y-2">
                        <Label>Histórico em dias</Label>
                        <Input
                          type="number"
                          value={editingPlan[plan.plan]?.history_days || ""}
                          onChange={(e) =>
                            updatePlanField(plan.plan, "history_days", parseInt(e.target.value))
                          }
                          placeholder="Dias"
                        />
                      </div>

                      {/* Team Members Limit */}
                      <div className="space-y-2">
                        <Label>Membros do time</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={editingPlan[plan.plan]?.team_members_limit || ""}
                            onChange={(e) =>
                              updatePlanField(plan.plan, "team_members_limit", e.target.value ? parseInt(e.target.value) : null)
                            }
                            disabled={editingPlan[plan.plan]?.team_members_limit === null}
                            placeholder="Limite"
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editingPlan[plan.plan]?.team_members_limit === null}
                              onCheckedChange={(checked) =>
                                updatePlanField(plan.plan, "team_members_limit", checked ? null : 0)
                              }
                            />
                            <span className="text-sm">Ilimitado</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recursos Booleanos */}
                  <div>
                    <h4 className="text-sm font-medium mb-4">Recursos Disponíveis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.whatsapp_support || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "whatsapp_support", checked)
                          }
                        />
                        <Label>Suporte via WhatsApp</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.graphics_approval || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "graphics_approval", checked)
                          }
                        />
                        <Label>Aprovação de Artes</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.supplier_link || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "supplier_link", checked)
                          }
                        />
                        <Label>Link de Fornecedor</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.global_agenda || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "global_agenda", checked)
                          }
                        />
                        <Label>Agenda Global</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.team_kanban || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "team_kanban", checked)
                          }
                        />
                        <Label>Kanban de Equipe</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={editingPlan[plan.plan]?.team_notifications || false}
                          onCheckedChange={(checked) =>
                            updatePlanField(plan.plan, "team_notifications", checked)
                          }
                        />
                        <Label>Notificações de Equipe</Label>
                      </div>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleSavePlan(plan.plan)}
                      disabled={saving[plan.plan]}
                      className="flex items-center gap-2"
                    >
                      {saving[plan.plan] ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => loadPlans()}
                      disabled={saving[plan.plan]}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};