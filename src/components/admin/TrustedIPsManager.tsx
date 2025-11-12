import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrustedIP {
  id: string;
  ip_address: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  added_by: string | null;
}

interface Props {
  trustedIPs: TrustedIP[];
  onRefresh: () => void;
}

export function TrustedIPsManager({ trustedIPs, onRefresh }: Props) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIP, setEditingIP] = useState<TrustedIP | null>(null);
  
  // Formulário
  const [ipAddress, setIpAddress] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setIpAddress("");
    setLabel("");
    setDescription("");
    setEditingIP(null);
  };

  const validateIP = (ip: string): boolean => {
    // Validação básica de IPv4 e IPv6
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return ipv6Pattern.test(ip);
  };

  const handleAdd = async () => {
    if (!ipAddress.trim() || !label.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o IP e o rótulo.",
        variant: "destructive",
      });
      return;
    }

    if (!validateIP(ipAddress.trim())) {
      toast({
        title: "IP inválido",
        description: "Por favor, insira um endereço IP válido (IPv4 ou IPv6).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('trusted_ips')
        .insert({
          ip_address: ipAddress.trim(),
          label: label.trim(),
          description: description.trim() || null,
          added_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Este IP já está na lista de confiáveis');
        }
        throw error;
      }

      toast({
        title: "IP adicionado com sucesso",
        description: `${ipAddress} foi adicionado à whitelist.`,
      });

      resetForm();
      setIsAddDialogOpen(false);
      onRefresh();

    } catch (error: any) {
      console.error('Erro ao adicionar IP:', error);
      toast({
        title: "Erro ao adicionar IP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingIP) return;

    if (!label.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O rótulo não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('trusted_ips')
        .update({
          label: label.trim(),
          description: description.trim() || null,
        })
        .eq('id', editingIP.id);

      if (error) throw error;

      toast({
        title: "IP atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });

      resetForm();
      onRefresh();

    } catch (error: any) {
      console.error('Erro ao atualizar IP:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (ip: TrustedIP) => {
    try {
      const { error } = await supabase
        .from('trusted_ips')
        .update({ is_active: !ip.is_active })
        .eq('id', ip.id);

      if (error) throw error;

      toast({
        title: ip.is_active ? "IP desativado" : "IP ativado",
        description: `${ip.ip_address} foi ${ip.is_active ? 'desativado' : 'ativado'}.`,
      });

      onRefresh();

    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, ipAddress: string) => {
    try {
      const { error } = await supabase
        .from('trusted_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "IP removido",
        description: `${ipAddress} foi removido da whitelist.`,
      });

      onRefresh();

    } catch (error: any) {
      console.error('Erro ao remover IP:', error);
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (ip: TrustedIP) => {
    setEditingIP(ip);
    setLabel(ip.label);
    setDescription(ip.description || "");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              IPs Confiáveis (Whitelist)
            </CardTitle>
            <CardDescription className="mt-1">
              IPs que nunca serão bloqueados, mesmo com múltiplas tentativas falhadas
            </CardDescription>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar IP Confiável</DialogTitle>
                <DialogDescription>
                  Adicione um endereço IP que nunca será bloqueado pelo sistema 2FA
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ip">Endereço IP *</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.1 ou 2001:0db8::1"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="label">Rótulo *</Label>
                  <Input
                    id="label"
                    placeholder="Ex: Escritório São Paulo"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Informações adicionais sobre este IP..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd} disabled={isSubmitting}>
                    {isSubmitting ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Rótulo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustedIPs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum IP confiável cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                trustedIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono font-medium">{ip.ip_address}</TableCell>
                    <TableCell>
                      {editingIP?.id === ip.id ? (
                        <Input
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          className="max-w-[200px]"
                        />
                      ) : (
                        ip.label
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIP?.id === ip.id ? (
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                          className="max-w-[300px]"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {ip.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ip.is_active}
                          onCheckedChange={() => handleToggleActive(ip)}
                        />
                        <Badge variant={ip.is_active ? "default" : "outline"}>
                          {ip.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(ip.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingIP?.id === ip.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleUpdate}
                              disabled={isSubmitting}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={resetForm}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(ip)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover IP Confiável?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover <strong>{ip.ip_address}</strong> da whitelist?
                                    Este IP voltará a estar sujeito aos bloqueios de segurança.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(ip.id, ip.ip_address)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
