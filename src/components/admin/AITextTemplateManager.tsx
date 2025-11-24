import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Video } from "lucide-react";

interface Template {
  id: string;
  template_name: string;
  template_type: 'caption' | 'script';
  template_content: string;
  category: string | null;
  tone: string[] | null;
  text_structure: string | null;
  example: string | null;
  structure_link: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AITextTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    template_name: "",
    template_type: "caption" as 'caption' | 'script',
    template_content: "",
    category: "",
    tone: [] as string[],
    text_structure: "",
    example: "",
    structure_link: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Verificar role do usuário para filtrar templates
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.id });
      
      let query = supabase
        .from("ai_text_templates")
        .select("*");
      
      // Se não for super_admin, filtrar por agency_id
      // Super admin vê todos os templates (da agência + globais)
      if (roleData !== 'super_admin') {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", user.id)
          .single();
        
        if (profile?.agency_id) {
          // Agency admin vê templates da própria agência + globais
          query = query.or(`agency_id.eq.${profile.agency_id},agency_id.is.null`);
        }
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as Template[]);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.template_name || !formData.template_content) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome e conteúdo são obrigatórios",
          variant: "destructive",
        });
        return;
      }

      // Validar URL se fornecida
      if (formData.structure_link && !formData.structure_link.match(/^https?:\/\/.+/)) {
        toast({
          title: "Link inválido",
          description: "O link deve começar com http:// ou https://",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se é super_admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin"]);

      const isSuperAdmin = roles && roles.length > 0;

      // Buscar agency_id apenas se não for super_admin
      let agencyId: string | null = null;
      if (!isSuperAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", user.id)
          .single();

        if (!profile?.agency_id) {
          throw new Error("Agência não encontrada. Apenas super admins podem criar templates sem agência.");
        }
        agencyId = profile.agency_id;
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from("ai_text_templates")
          .update({
            template_name: formData.template_name,
            template_content: formData.template_content,
            category: formData.category || null,
            tone: formData.tone.length > 0 ? formData.tone : null,
            text_structure: formData.text_structure || null,
            example: formData.example || null,
            structure_link: formData.structure_link || null,
          })
          .eq("id", editingTemplate.id);

        if (error) {
          console.error("Erro detalhado ao atualizar template:", error);
          throw error;
        }
      } else {
        const insertData: any = {
          template_name: formData.template_name,
          template_type: formData.template_type,
          template_content: formData.template_content,
          category: formData.category || null,
          tone: formData.tone.length > 0 ? formData.tone : null,
          text_structure: formData.text_structure || null,
          example: formData.example || null,
          structure_link: formData.structure_link || null,
          created_by: user.id,
        };

        // Incluir agency_id apenas se não for super_admin (super_admin pode ter NULL)
        if (agencyId) {
          insertData.agency_id = agencyId;
        }

        const { error } = await supabase
          .from("ai_text_templates")
          .insert(insertData);

        if (error) {
          console.error("Erro detalhado ao criar template:", error);
          throw error;
        }
      }

      toast({
        title: editingTemplate ? "Template atualizado" : "Template criado",
        description: "O template foi salvo com sucesso",
      });

      setShowDialog(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      const errorMessage = error?.message || error?.error_description || "Erro desconhecido";
      toast({
        title: "Erro ao salvar",
        description: errorMessage || "Não foi possível salvar o template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este template?")) return;

    try {
      const { error } = await supabase
        .from("ai_text_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Template excluído",
        description: "O template foi removido com sucesso",
      });

      loadTemplates();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o template",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      template_content: template.template_content,
      category: template.category || "",
      tone: template.tone || [],
      text_structure: template.text_structure || "",
      example: template.example || "",
      structure_link: template.structure_link || "",
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      template_type: "caption",
      template_content: "",
      category: "",
      tone: [],
      text_structure: "",
      example: "",
      structure_link: "",
    });
    setEditingTemplate(null);
  };

  const captionTemplates = templates.filter(t => t.template_type === 'caption');
  const scriptTemplates = templates.filter(t => t.template_type === 'script');

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Texto e Roteiros</h1>
          <p className="text-muted-foreground">Gerencie estruturas para a IA utilizar como base</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Tabs defaultValue="captions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="captions">
            <FileText className="mr-2 h-4 w-4" />
            Legendas ({captionTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="scripts">
            <Video className="mr-2 h-4 w-4" />
            Roteiros ({scriptTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="captions">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Legendas</CardTitle>
              <CardDescription>Estruturas que a IA usará para gerar legendas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : captionTemplates.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum template de legenda cadastrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tom</TableHead>
                      <TableHead>Escopo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {captionTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.template_name}</TableCell>
                        <TableCell>{template.category || "-"}</TableCell>
                        <TableCell>
                          {template.tone && template.tone.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {template.tone.map(t => (
                                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "success" : "outline"}>
                            {template.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Roteiros</CardTitle>
              <CardDescription>Estruturas que a IA usará para gerar roteiros</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : scriptTemplates.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum template de roteiro cadastrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tom</TableHead>
                      <TableHead>Escopo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scriptTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.template_name}</TableCell>
                        <TableCell>{template.category || "-"}</TableCell>
                        <TableCell>
                          {template.tone && template.tone.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {template.tone.map(t => (
                                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={!template.agency_id ? "default" : "outline"} className="text-xs">
                            {!template.agency_id ? "Global" : "Agência"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "success" : "outline"}>
                            {template.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de criação/edição */}
        <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Altere as informações do template" : "Crie um novo template para a IA utilizar"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="Ex: Legenda promocional"
              />
            </div>

            {!editingTemplate && (
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={formData.template_type} onValueChange={(value: 'caption' | 'script') => setFormData({ ...formData, template_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caption">Legenda</SelectItem>
                    <SelectItem value="script">Roteiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Categoria/Formato</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: social, promocional, educacional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text_structure">Estrutura de Texto</Label>
              <Textarea
                id="text_structure"
                value={formData.text_structure}
                onChange={(e) => setFormData({ ...formData, text_structure: e.target.value })}
                placeholder="Ex: Introdução + Problema + Solução + Call-to-Action"
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Defina a estrutura que o texto deve seguir
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="example">Exemplo</Label>
              <Textarea
                id="example"
                value={formData.example}
                onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                placeholder="Digite um exemplo prático de como o template seria aplicado..."
                className="min-h-[150px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo concreto de texto seguindo este template
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="structure_link">Link de Estrutura Aplicada (opcional)</Label>
              <Input
                id="structure_link"
                type="url"
                value={formData.structure_link}
                onChange={(e) => setFormData({ ...formData, structure_link: e.target.value })}
                placeholder="https://exemplo.com/referencia-estrutura"
              />
              <p className="text-xs text-muted-foreground">
                Link de referência para a estrutura (opcional)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo do Template *</Label>
              <Textarea
                id="content"
                value={formData.template_content}
                onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                placeholder="Digite a estrutura/exemplo que a IA deverá usar como base..."
                className="min-h-[200px] font-mono"
              />
              <p className="text-xs text-muted-foreground">
                A IA usará este template como referência ao gerar conteúdo
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? "Salvar Alterações" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
