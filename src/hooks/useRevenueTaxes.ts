import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RevenueTax {
  id: string;
  tax_name: string;
  tax_rate: number; // Percentual (ex: 6.00 para 6%)
  is_fixed: boolean;
  applies_to: 'gross_revenue' | 'net_revenue';
  category?: string;
  notes?: string;
}

export const useRevenueTaxes = () => {
  const [taxes, setTaxes] = useState<RevenueTax[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("revenue_taxes")
        .select("*")
        .order("is_fixed", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTaxes((data || []).map(item => ({
        ...item,
        applies_to: (item.applies_to || 'gross_revenue') as 'gross_revenue' | 'net_revenue'
      })));
    } catch (error) {
      console.error("Erro ao carregar taxas:", error);
      toast.error("Erro ao carregar taxas sobre receita");
    } finally {
      setLoading(false);
    }
  };

  const updateTax = async (id: string, rate: number) => {
    try {
      const { error } = await supabase
        .from("revenue_taxes")
        .update({ tax_rate: rate })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Taxa atualizada com sucesso");
      loadTaxes();
    } catch (error) {
      console.error("Erro ao atualizar taxa:", error);
      toast.error("Erro ao atualizar taxa");
    }
  };

  const addCustomTax = async (
    name: string, 
    rate: number, 
    appliesTo: 'gross_revenue' | 'net_revenue' = 'gross_revenue',
    category?: string
  ) => {
    try {
      const { error } = await supabase
        .from("revenue_taxes")
        .insert({
          tax_name: name,
          tax_rate: rate,
          is_fixed: false,
          applies_to: appliesTo,
          category,
        });

      if (error) throw error;
      
      toast.success("Taxa adicionada com sucesso");
      loadTaxes();
    } catch (error) {
      console.error("Erro ao adicionar taxa:", error);
      toast.error("Erro ao adicionar taxa");
    }
  };

  const deleteTax = async (id: string) => {
    try {
      const { error } = await supabase
        .from("revenue_taxes")
        .delete()
        .eq("id", id)
        .eq("is_fixed", false);

      if (error) throw error;
      
      toast.success("Taxa removida com sucesso");
      loadTaxes();
    } catch (error) {
      console.error("Erro ao remover taxa:", error);
      toast.error("Erro ao remover taxa");
    }
  };

  useEffect(() => {
    loadTaxes();
  }, []);

  // Calcular total de taxas aplicadas sobre a receita
  const calculateTaxAmount = (grossRevenue: number): number => {
    return taxes.reduce((total, tax) => {
      if (tax.applies_to === 'gross_revenue') {
        return total + (grossRevenue * (tax.tax_rate / 100));
      }
      return total;
    }, 0);
  };

  const totalTaxRate = taxes
    .filter(t => t.applies_to === 'gross_revenue')
    .reduce((sum, tax) => sum + tax.tax_rate, 0);

  return {
    taxes,
    loading,
    totalTaxRate,
    calculateTaxAmount,
    updateTax,
    addCustomTax,
    deleteTax,
    refresh: loadTaxes,
  };
};
