import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, Check, Search } from "lucide-react";
import { createPlatformNotification } from "@/lib/platform-notifications";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  name: string;
  type: 'client' | 'team_member' | 'approver' | 'agency';
  clientName?: string; // Para aprovadores
  agencyName?: string; // Para clientes e team_members no super_admin
}

export const NotificationSender = () => {
  const { role, profile, agency } = useUserData();
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  
  // Estados para opções específicas
  const [targetType, setTargetType] = useState<"all_agencies" | "all_clients" | "all_team" | "approvers_by_client" | "team_by_agency" | "individual">("all_clients");
  const [selectedClientForApprovers, setSelectedClientForApprovers] = useState<string>("");
  const [selectedAgencyForTeam, setSelectedAgencyForTeam] = useState<string>("");
  
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
  const [availableClients, setAvailableClients] = useState<Array<{ id: string; name: string }>>([]);
  const [availableAgencies, setAvailableAgencies] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Carregar dados iniciais baseado no role
  useEffect(() => {
    if (role === 'super_admin' || role === 'agency_admin') {
      loadInitialData();
    }
  }, [role, profile?.agency_id]);

  const loadInitialData = async () => {
    setLoadingRecipients(true);
    try {
      if (role === 'super_admin') {
        // Super admin: carregar agências e clientes
        const [agenciesResult, clientsResult] = await Promise.all([
          supabase
            .from('agencies')
            .select('id, name')
            .order('name'),
          supabase
            .from('clients')
            .select('id, name, agency_id, agencies!inner(name)')
            .order('name')
        ]);

        setAvailableAgencies(agenciesResult.data || []);
        
        // Clientes com nome da agência
        const clients = (clientsResult.data || []).map((c: any) => ({
          id: c.id,
          name: `${c.name} (${c.agencies.name})`,
          agencyName: c.agencies.name,
          agencyId: c.agency_id
        }));
        setAvailableClients(clients);

        // Carregar destinatários individuais
        await loadIndividualRecipients();
      } else if (role === 'agency_admin' && profile?.agency_id) {
        // Agency admin: carregar clientes da agência
        const clientsResult = await supabase
          .from('clients')
          .select('id, name')
          .eq('agency_id', profile.agency_id)
          .order('name');

        setAvailableClients(clientsResult.data || []);
        
        // Carregar destinatários individuais
        await loadIndividualRecipients();
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadIndividualRecipients = async () => {
    setLoadingRecipients(true);
    try {
      if (role === 'super_admin') {
        // Super admin: agências, todos os clientes, team_members e aprovadores
        const [agenciesResult, clientsResult, teamMembersResult, approversResult] = await Promise.all([
          supabase
            .from('agencies')
            .select('id, name')
            .order('name'),
          
          supabase
            .from('clients')
            .select('id, name, agency_id, agencies!inner(name)')
            .order('name'),
          
          supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'team_member'),
          
          supabase
            .from('client_approvers')
            .select('id, name, client_id, clients!inner(name, agency_id, agencies!inner(name))')
            .eq('is_active', true)
        ]);

        // Agências
        const agencies: Recipient[] = (agenciesResult.data || []).map(a => ({
          id: a.id,
          name: a.name,
          type: 'agency' as const
        }));

        // Clientes com agência
        const clients: Recipient[] = (clientsResult.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: 'client' as const,
          agencyName: c.agencies.name
        }));

        // Team members com agência
        const teamMemberIds = teamMembersResult.data?.map(r => r.user_id) || [];
        let teamMembers: Recipient[] = [];
        
        if (teamMemberIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, agency_id, agencies!inner(name)')
            .in('id', teamMemberIds);
          
          teamMembers = (profiles || []).map((p: any) => ({
            id: p.id,
            name: p.name || 'Sem nome',
            type: 'team_member' as const,
            agencyName: p.agencies?.name
          }));
        }

        // Aprovadores com cliente
        const approvers: Recipient[] = (approversResult.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          type: 'approver' as const,
          clientName: a.clients.name,
          agencyName: a.clients.agencies?.name
        }));

        setAvailableRecipients([...agencies, ...clients, ...teamMembers, ...approvers]);
      } else if (role === 'agency_admin' && profile?.agency_id) {
        // Agency admin: clientes, team_members e aprovadores da agência
        const [clientsResult, teamMembersResult, approversResult] = await Promise.all([
          supabase
            .from('clients')
            .select('id, name')
            .eq('agency_id', profile.agency_id)
            .order('name'),
          
          supabase
            .from('profiles')
            .select('id, name')
            .eq('agency_id', profile.agency_id),
          
          supabase
            .from('client_approvers')
            .select('id, name, client_id, clients!inner(name)')
            .eq('agency_id', profile.agency_id)
            .eq('is_active', true)
        ]);

        // Clientes
        const clients: Recipient[] = (clientsResult.data || []).map(c => ({
          id: c.id,
          name: c.name,
          type: 'client' as const
        }));

        // Team members
        const profileIds = teamMembersResult.data?.map(p => p.id) || [];
        let teamMembers: Recipient[] = [];
        
        if (profileIds.length > 0) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('user_id', profileIds)
            .eq('role', 'team_member');
          
          const teamMemberIds = new Set(roles?.map(r => r.user_id) || []);
          teamMembers = (teamMembersResult.data || [])
            .filter(p => teamMemberIds.has(p.id))
            .map(p => ({
              id: p.id,
              name: p.name || 'Sem nome',
              type: 'team_member' as const
            }));
        }

        // Aprovadores com cliente
        const approvers: Recipient[] = (approversResult.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          type: 'approver' as const,
          clientName: a.clients.name
        }));

        setAvailableRecipients([...clients, ...teamMembers, ...approvers]);
      }
    } catch (error) {
      console.error('Erro ao carregar destinatários:', error);
      toast.error('Erro ao carregar destinatários');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const filteredRecipients = availableRecipients.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.agencyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!message.trim() || !title.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }

    setLoading(true);
    try {
      if (role === 'agency_admin') {
        // Agency Admin
        if (targetType === 'all_clients') {
          // Enviar para todos os clientes da agência
          if (!profile?.agency_id) {
            toast.error("Erro: Agência não encontrada");
            return;
          }
          
          const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .eq('agency_id', profile.agency_id);
          
          for (const client of clients || []) {
            await createPlatformNotification({
              notificationType: "system_update",
              title,
              message,
              targetType: 'client_user',
              targetId: client.id,
              sendEmail: true,
              sendWhatsApp: false,
              sendInApp: true,
              priority: "normal",
            });
          }
        } else if (targetType === 'all_team') {
          // Enviar para todos os membros da equipe
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('agency_id', profile.agency_id);
          
          const profileIds = profiles?.map(p => p.id) || [];
          if (profileIds.length > 0) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('user_id')
              .in('user_id', profileIds)
              .eq('role', 'team_member');
            
            for (const role of roles || []) {
              await createPlatformNotification({
                notificationType: "system_update",
                title,
                message,
                targetType: 'team_member',
                targetId: role.user_id,
                sendEmail: true,
                sendWhatsApp: false,
                sendInApp: true,
                priority: "normal",
              });
            }
          }
        } else if (targetType === 'approvers_by_client') {
          // Enviar para aprovadores de um cliente específico
          if (!selectedClientForApprovers) {
            toast.error("Selecione um cliente");
            return;
          }
          
          const { data: approvers } = await supabase
            .from('client_approvers')
            .select('id')
            .eq('client_id', selectedClientForApprovers)
            .eq('is_active', true);
          
          // Nota: Aprovadores não têm targetType específico no sistema atual
          // Será necessário criar uma função que busque usuários aprovadores de um cliente
          // Por enquanto, vamos enviar para client_user do cliente
          await createPlatformNotification({
            notificationType: "system_update",
            title,
            message,
            targetType: 'client_user',
            targetId: selectedClientForApprovers,
            sendEmail: true,
            sendWhatsApp: false,
            sendInApp: true,
            priority: "normal",
            payload: { approvers_only: true, approver_ids: approvers?.map(a => a.id) || [] }
          });
        } else if (targetType === 'individual') {
          // Enviar para destinatários individuais
          for (const recipient of selectedRecipients) {
            if (recipient.type === 'client') {
              await createPlatformNotification({
                notificationType: "system_update",
                title,
                message,
                targetType: 'client_user',
                targetId: recipient.id,
                sendEmail: true,
                sendWhatsApp: false,
                sendInApp: true,
                priority: "normal",
              });
            } else if (recipient.type === 'team_member') {
              await createPlatformNotification({
                notificationType: "system_update",
                title,
                message,
                targetType: 'team_member',
                targetId: recipient.id,
                sendEmail: true,
                sendWhatsApp: false,
                sendInApp: true,
                priority: "normal",
              });
            } else if (recipient.type === 'approver') {
              // Para aprovadores, enviar via client_user do cliente associado
              const { data: approver } = await supabase
                .from('client_approvers')
                .select('client_id')
                .eq('id', recipient.id)
                .single();
              
              if (approver) {
                await createPlatformNotification({
                  notificationType: "system_update",
                  title,
                  message,
                  targetType: 'client_user',
                  targetId: approver.client_id,
                  sendEmail: true,
                  sendWhatsApp: false,
                  sendInApp: true,
                  priority: "normal",
                  payload: { approver_id: recipient.id }
                });
              }
            }
          }
        }
      } else if (role === 'super_admin') {
        // Super Admin
        if (targetType === 'all_agencies') {
          // Enviar para todas as agências (todos os clientes de todas as agências)
          const { data: clients } = await supabase
            .from('clients')
            .select('id');
          
          for (const client of clients || []) {
            await createPlatformNotification({
              notificationType: "system_update",
              title,
              message,
              targetType: 'client_user',
              targetId: client.id,
              sendEmail: true,
              sendWhatsApp: false,
              sendInApp: true,
              priority: "normal",
            });
          }
        } else if (targetType === 'all_clients') {
          // Enviar para todos os clientes
          const { data: clients } = await supabase
            .from('clients')
            .select('id');
          
          for (const client of clients || []) {
            await createPlatformNotification({
              notificationType: "system_update",
              title,
              message,
              targetType: 'client_user',
              targetId: client.id,
              sendEmail: true,
              sendWhatsApp: false,
              sendInApp: true,
              priority: "normal",
            });
          }
        } else if (targetType === 'all_team') {
          // Enviar para todas as equipes (todos os team_members)
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'team_member');
          
          for (const role of roles || []) {
            await createPlatformNotification({
              notificationType: "system_update",
              title,
              message,
              targetType: 'team_member',
              targetId: role.user_id,
              sendEmail: true,
              sendWhatsApp: false,
              sendInApp: true,
              priority: "normal",
            });
          }
        } else if (targetType === 'team_by_agency') {
          // Enviar para membros da equipe de uma agência específica
          if (!selectedAgencyForTeam) {
            toast.error("Selecione uma agência");
            return;
          }
          
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('agency_id', selectedAgencyForTeam);
          
          const profileIds = profiles?.map(p => p.id) || [];
          if (profileIds.length > 0) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('user_id')
              .in('user_id', profileIds)
              .eq('role', 'team_member');
            
            for (const role of roles || []) {
              await createPlatformNotification({
                notificationType: "system_update",
                title,
                message,
                targetType: 'team_member',
                targetId: role.user_id,
                sendEmail: true,
                sendWhatsApp: false,
                sendInApp: true,
                priority: "normal",
              });
            }
          }
        } else if (targetType === 'approvers_by_client') {
          // Enviar para aprovadores de um cliente específico
          if (!selectedClientForApprovers) {
            toast.error("Selecione um cliente");
            return;
          }
          
          await createPlatformNotification({
            notificationType: "system_update",
            title,
            message,
            targetType: 'client_user',
            targetId: selectedClientForApprovers,
            sendEmail: true,
            sendWhatsApp: false,
            sendInApp: true,
            priority: "normal",
            payload: { approvers_only: true }
          });
        } else if (targetType === 'individual') {
          // Enviar para destinatários individuais
          for (const recipient of selectedRecipients) {
            if (recipient.type === 'agency') {
              // Enviar para todos os clientes da agência
              const { data: clients } = await supabase
                .from('clients')
                .select('id')
                .eq('agency_id', recipient.id);
              
              for (const client of clients || []) {
                await createPlatformNotification({
                  notificationType: "system_update",
                  title,
                  message,
                  targetType: 'client_user',
                  targetId: client.id,
                  sendEmail: true,
                  sendWhatsApp: false,
                  sendInApp: true,
                  priority: "normal",
                });
              }
            } else if (recipient.type === 'client') {
              await createPlatformNotification({
                notificationType: "system_update",
                title,
                message,
                targetType: 'client_user',
                targetId: recipient.id,
                sendEmail: true,
                sendWhatsApp: false,
                sendInApp: true,
                priority: "normal",
              });
            } else if (recipient.type === 'team_member') {
      await createPlatformNotification({
        notificationType: "system_update",
        title,
        message,
                targetType: 'team_member',
                targetId: recipient.id,
        sendEmail: true,
        sendWhatsApp: false,
        sendInApp: true,
        priority: "normal",
      });
            } else if (recipient.type === 'approver') {
              const { data: approver } = await supabase
                .from('client_approvers')
                .select('client_id')
                .eq('id', recipient.id)
                .single();
              
              if (approver) {
                await createPlatformNotification({
                  notificationType: "system_update",
                  title,
                  message,
                  targetType: 'client_user',
                  targetId: approver.client_id,
                  sendEmail: true,
                  sendWhatsApp: false,
                  sendInApp: true,
                  priority: "normal",
                  payload: { approver_id: recipient.id }
                });
              }
            }
          }
        }
      }

      toast.success("Notificação enviada com sucesso!");
      setMessage("");
      setTitle("");
      setTargetType("all_clients");
      setSelectedRecipients([]);
      setSelectedClientForApprovers("");
      setSelectedAgencyForTeam("");
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (recipient: Recipient) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === recipient.id && r.type === recipient.type);
      if (exists) {
        return prev.filter(r => !(r.id === recipient.id && r.type === recipient.type));
      } else {
        return [...prev, recipient];
      }
    });
  };

  const removeRecipient = (recipient: Recipient) => {
    setSelectedRecipients(prev =>
      prev.filter(r => !(r.id === recipient.id && r.type === recipient.type))
    );
  };

  const isSelected = (recipient: Recipient) => {
    return selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type);
  };

  if (!role || (role !== 'super_admin' && role !== 'agency_admin')) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título da Notificação</Label>
        <Input
          id="title"
          placeholder="Ex: Atualização do sistema"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          placeholder="Digite a mensagem da notificação..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-4">
        <Label>Destinatários</Label>
        
        {role === 'agency_admin' ? (
          // AGENCY ADMIN - Opções específicas
          <>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all-clients"
                  name="target"
                  checked={targetType === 'all_clients'}
                  onChange={() => {
                    setTargetType('all_clients');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="all-clients" className="font-normal cursor-pointer">
                  Todos os Clientes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all-team"
                  name="target"
                  checked={targetType === 'all_team'}
                  onChange={() => {
                    setTargetType('all_team');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="all-team" className="font-normal cursor-pointer">
                  Toda a Equipe
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="approvers-by-client"
                  name="target"
                  checked={targetType === 'approvers_by_client'}
                  onChange={() => {
                    setTargetType('approvers_by_client');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="approvers-by-client" className="font-normal cursor-pointer">
                  Aprovadores do cliente
                </Label>
              </div>
              
              {targetType === 'approvers_by_client' && (
                <div className="ml-6 mt-2">
                  <Select value={selectedClientForApprovers} onValueChange={setSelectedClientForApprovers}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="individual"
                  name="target"
                  checked={targetType === 'individual'}
                  onChange={() => setTargetType('individual')}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="individual" className="font-normal cursor-pointer">
                  Selecionar individualmente
                </Label>
              </div>
            </div>

            {targetType === 'individual' && (
              <div className="space-y-2 ml-6">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      onClick={() => setSearchOpen(!searchOpen)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar destinatários...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por nome..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {loadingRecipients ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : filteredRecipients.length === 0 ? (
                          <CommandEmpty>Nenhum destinatário encontrado</CommandEmpty>
                        ) : (
                          <>
                            <CommandGroup heading="Clientes">
                              {filteredRecipients
                                .filter(r => r.type === 'client')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`client-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {recipient.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Membros de Equipe">
                              {filteredRecipients
                                .filter(r => r.type === 'team_member')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`team-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {recipient.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Aprovadores">
                              {filteredRecipients
                                .filter(r => r.type === 'approver')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`approver-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.clientName && (
                                        <span className="text-xs text-muted-foreground">
                                          Cliente: {recipient.clientName}
                                        </span>
                                      )}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRecipients.map((recipient) => (
                      <Badge
                        key={`${recipient.type}-${recipient.id}`}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <span>
                          {recipient.name}
                          {recipient.clientName && ` (${recipient.clientName})`}
                        </span>
                        <button
                          onClick={() => removeRecipient(recipient)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // SUPER ADMIN - Opções específicas
          <>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all-agencies"
                  name="target"
                  checked={targetType === 'all_agencies'}
                  onChange={() => {
                    setTargetType('all_agencies');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="all-agencies" className="font-normal cursor-pointer">
                  Todas Agências
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all-clients"
                  name="target"
                  checked={targetType === 'all_clients'}
                  onChange={() => {
                    setTargetType('all_clients');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="all-clients" className="font-normal cursor-pointer">
                  Todos Clientes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all-team"
                  name="target"
                  checked={targetType === 'all_team'}
                  onChange={() => {
                    setTargetType('all_team');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="all-team" className="font-normal cursor-pointer">
                  Todas Equipes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="team-by-agency"
                  name="target"
                  checked={targetType === 'team_by_agency'}
                  onChange={() => {
                    setTargetType('team_by_agency');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="team-by-agency" className="font-normal cursor-pointer">
                  Membros da equipe
                </Label>
              </div>
              
              {targetType === 'team_by_agency' && (
                <div className="ml-6 mt-2">
                  <Select value={selectedAgencyForTeam} onValueChange={setSelectedAgencyForTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma agência" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="approvers-by-client"
                  name="target"
                  checked={targetType === 'approvers_by_client'}
                  onChange={() => {
                    setTargetType('approvers_by_client');
                    setSelectedRecipients([]);
                  }}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="approvers-by-client" className="font-normal cursor-pointer">
                  Aprovadores do cliente
                </Label>
              </div>
              
              {targetType === 'approvers_by_client' && (
                <div className="ml-6 mt-2">
                  <Select value={selectedClientForApprovers} onValueChange={setSelectedClientForApprovers}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
                      {availableClients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
          </SelectContent>
        </Select>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="individual"
                  name="target"
                  checked={targetType === 'individual'}
                  onChange={() => setTargetType('individual')}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="individual" className="font-normal cursor-pointer">
                  Selecionar individualmente
                </Label>
              </div>
            </div>

            {targetType === 'individual' && (
              <div className="space-y-2 ml-6">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      onClick={() => setSearchOpen(!searchOpen)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar destinatários...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por nome, agência ou cliente..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {loadingRecipients ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : filteredRecipients.length === 0 ? (
                          <CommandEmpty>Nenhum destinatário encontrado</CommandEmpty>
                        ) : (
                          <>
                            <CommandGroup heading="Agências">
                              {filteredRecipients
                                .filter(r => r.type === 'agency')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`agency-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {recipient.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Clientes">
                              {filteredRecipients
                                .filter(r => r.type === 'client')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`client-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.agencyName && (
                                        <span className="text-xs text-muted-foreground">
                                          Agência: {recipient.agencyName}
                                        </span>
                                      )}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Membros de Equipe">
                              {filteredRecipients
                                .filter(r => r.type === 'team_member')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`team-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.agencyName && (
                                        <span className="text-xs text-muted-foreground">
                                          Agência: {recipient.agencyName}
                                        </span>
                                      )}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="Aprovadores">
                              {filteredRecipients
                                .filter(r => r.type === 'approver')
                                .map((recipient) => (
                                  <CommandItem
                                    key={`approver-${recipient.id}`}
                                    value={recipient.id}
                                    onSelect={() => toggleRecipient(recipient)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected(recipient) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex flex-col">
                                      <span>{recipient.name}</span>
                                      {recipient.clientName && (
                                        <span className="text-xs text-muted-foreground">
                                          Cliente: {recipient.clientName}
                                        </span>
                                      )}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRecipients.map((recipient) => (
                      <Badge
                        key={`${recipient.type}-${recipient.id}`}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <span>
                          {recipient.name}
                          {recipient.clientName && ` (Cliente: ${recipient.clientName})`}
                          {recipient.agencyName && ` (Agência: ${recipient.agencyName})`}
                        </span>
                        <button
                          onClick={() => removeRecipient(recipient)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Button onClick={handleSend} disabled={loading} className="w-full">
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Enviando..." : "Enviar Notificação"}
      </Button>
    </div>
  );
};
