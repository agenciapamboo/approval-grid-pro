import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const approverSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .toLowerCase(),
  whatsapp: z.string()
    .trim()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "WhatsApp deve estar no formato (XX) XXXXX-XXXX")
    .optional()
    .or(z.literal("")),
  is_primary: z.boolean().default(false),
});

type ApproverFormData = z.infer<typeof approverSchema>;

interface AddApproverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function AddApproverDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: AddApproverDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ApproverFormData>({
    resolver: zodResolver(approverSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsapp: "",
      is_primary: false,
    },
  });

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const onSubmit = async (data: ApproverFormData) => {
    try {
      setLoading(true);

      // Buscar agency_id do cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("agency_id")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;

      // Verificar se email já existe para este cliente
      const { data: existing, error: checkError } = await supabase
        .from("client_approvers")
        .select("id")
        .eq("client_id", clientId)
        .eq("email", data.email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        form.setError("email", {
          message: "Já existe um aprovador com este email para este cliente",
        });
        return;
      }

      // Verificar se WhatsApp já existe (se fornecido)
      if (data.whatsapp) {
        const { data: existingWhatsApp, error: checkWhatsAppError } = await supabase
          .from("client_approvers")
          .select("id")
          .eq("client_id", clientId)
          .eq("whatsapp", data.whatsapp)
          .maybeSingle();

        if (checkWhatsAppError) throw checkWhatsAppError;

        if (existingWhatsApp) {
          form.setError("whatsapp", {
            message: "Já existe um aprovador com este WhatsApp para este cliente",
          });
          return;
        }
      }

      const { error } = await supabase.from("client_approvers").insert([{
        client_id: clientId,
        agency_id: clientData.agency_id,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp || null,
        is_primary: data.is_primary,
        is_active: true,
      }]);

      if (error) throw error;

      toast({
        title: "Aprovador adicionado",
        description: `${data.name} foi adicionado com sucesso.`,
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding approver:", error);
      toast({
        title: "Erro ao adicionar aprovador",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Aprovador</DialogTitle>
          <DialogDescription>
            Cadastre um novo aprovador para receber códigos de autenticação 2FA
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="joao@empresa.com.br"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Códigos 2FA serão enviados para este email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(35) 99999-9999"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatWhatsApp(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Códigos 2FA também podem ser enviados via WhatsApp
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Aprovador Primário</FormLabel>
                    <FormDescription>
                      Aprovadores primários têm prioridade no envio de notificações
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
