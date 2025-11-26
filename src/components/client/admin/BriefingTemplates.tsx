import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Edit, Trash2, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AccessGate from "@/components/auth/AccessGate";
import { BriefingTemplateEditor } from "@/components/admin/BriefingTemplateEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BriefingTemplates() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<'client_profile' | 'editorial_line'>('client_profile');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<any>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['briefing-templates', selectedType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('briefing_templates')
        .select('*')
        .eq('template_type', selectedType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleToggleActive = async (template: any) => {
    try {
      const { error } = await supabase
        .from('briefing_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      
      if (error) throw error;
      
      toast.success(template.is_active ? 'Template desativado' : 'Template ativado');
      queryClient.invalidateQueries({ queryKey: ['briefing-templates'] });
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    
    try {
      const { error } = await supabase
        .from('briefing_templates')
        .delete()
        .eq('id', deletingTemplate.id);
      
      if (error) throw error;
      
      toast.success('Template deletado');
      queryClient.invalidateQueries({ queryKey: ['briefing-templates'] });
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao deletar template');
    }
  };

  return (
    <AccessGate allow={['super_admin', 'agency_admin']}>
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Templates de Briefing</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie formulários personalizados de briefing
                </p>
              </div>
            </div>
            <Dialog open={editorOpen} onOpenChange={(open) => {
              setEditorOpen(open);
              if (!open) setEditingTemplate(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
                  </DialogTitle>
                </DialogHeader>
                <BriefingTemplateEditor
                  templateId={editingTemplate?.id}
                  onSaved={() => {
                    setEditorOpen(false);
                    setEditingTemplate(null);
                    queryClient.invalidateQueries({ queryKey: ['briefing-templates'] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="client_profile" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Perfil de Cliente
              </TabsTrigger>
              <TabsTrigger value="editorial_line" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Linha Editorial
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="space-y-4 mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !templates || templates.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground mb-2">
                      Nenhum template encontrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Crie seu primeiro template de {selectedType === 'client_profile' ? 'perfil de cliente' : 'linha editorial'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="glass">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle>{template.name}</CardTitle>
                              <Badge variant={template.is_active ? "default" : "outline"}>
                                {template.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <CardDescription>{template.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={template.is_active}
                              onCheckedChange={() => handleToggleActive(template)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingTemplate(template);
                                setEditorOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingTemplate(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {(template.fields as any)?.fields?.length || 0} campos
                          </span>
                          <span>•</span>
                          <span>
                            Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar Template</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja deletar o template "{deletingTemplate?.name}"?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingTemplate(null)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AppLayout>
    </AccessGate>
  );
}