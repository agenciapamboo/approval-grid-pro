import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OperationalCost {
  id: string;
  cost_name: string;
  cost_value: number;
  is_fixed: boolean;
  cost_type?: 'operational' | 'marketing' | 'sales';
  category?: string;
  notes?: string;
}

export const useOperationalCosts = () => {
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("operational_costs")
        .select("*")
        .order("is_fixed", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCosts((data || []).map(item => ({
        ...item,
        cost_type: (item.cost_type || 'operational') as 'operational' | 'marketing' | 'sales'
      })));
    } catch (error) {
      console.error("Erro ao carregar custos:", error);
      toast.error("Erro ao carregar custos operacionais");
    } finally {
      setLoading(false);
    }
  };

  const updateCost = async (id: string, value: number) => {
    try {
      const { error } = await supabase
        .from("operational_costs")
        .update({ cost_value: value })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Custo atualizado com sucesso");
      loadCosts();
    } catch (error) {
      console.error("Erro ao atualizar custo:", error);
      toast.error("Erro ao atualizar custo");
    }
  };

  const addCustomCost = async (
    name: string, 
    value: number, 
    category?: string,
    costType: 'operational' | 'marketing' | 'sales' = 'operational'
  ) => {
    try {
      const { error } = await supabase
        .from("operational_costs")
        .insert({
          cost_name: name,
          cost_value: value,
          is_fixed: false,
          category,
          cost_type: costType,
        });

      if (error) throw error;
      
      toast.success("Custo adicionado com sucesso");
      loadCosts();
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      toast.error("Erro ao adicionar custo");
    }
  };

  const deleteCost = async (id: string) => {
    try {
      const { error } = await supabase
        .from("operational_costs")
        .delete()
        .eq("id", id)
        .eq("is_fixed", false); // Só permite deletar custos customizados

      if (error) throw error;
      
      toast.success("Custo removido com sucesso");
      loadCosts();
    } catch (error) {
      console.error("Erro ao remover custo:", error);
      toast.error("Erro ao remover custo");
    }
  };

  useEffect(() => {
    loadCosts();
  }, []);

  const totalCosts = costs.reduce((sum, cost) => sum + cost.cost_value, 0);

  // Separar custos por tipo
  const marketingCosts = costs
    .filter(c => c.cost_type === 'marketing')
    .reduce((sum, c) => sum + c.cost_value, 0);

  const salesCosts = costs
    .filter(c => c.cost_type === 'sales')
    .reduce((sum, c) => sum + c.cost_value, 0);

  const operationalCosts = costs
    .filter(c => c.cost_type === 'operational' || !c.cost_type)
    .reduce((sum, c) => sum + c.cost_value, 0);

  const cacCosts = marketingCosts + salesCosts;

  return {
    costs,
    loading,
    totalCosts,
    marketingCosts,
    salesCosts,
    operationalCosts,
    cacCosts,
    updateCost,
    addCustomCost,
    deleteCost,
    refresh: loadCosts,
  };
};
