import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, Check, Trash2, GripVertical, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanColumn {
  id: string;
  agency_id: string;
  column_id: string;
  column_name: string;
  column_color: string;
  column_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface KanbanColumnManagerProps {
  agencyId: string;
  onColumnsChanged?: () => void;
}

interface SortableColumnProps {
  column: KanbanColumn;
  onUpdate: (column: KanbanColumn) => void;
  onDelete: (columnId: string) => void;
}

function SortableColumn({ column, onUpdate, onDelete }: SortableColumnProps) {
  const [editedName, setEditedName] = useState(column.column_name);
  const [editedColor, setEditedColor] = useState(column.column_color);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    setHasChanges(
      editedName !== column.column_name || editedColor !== column.column_color
    );
  }, [editedName, editedColor, column]);

  const handleSave = () => {
    onUpdate({
      ...column,
      column_name: editedName,
      column_color: editedColor,
    });
    setHasChanges(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4 mb-2 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Color Preview */}
          <div
            className="w-8 h-8 rounded-md border-2 border-border flex-shrink-0"
            style={{ backgroundColor: editedColor }}
          />

          {/* Color Picker */}
          <input
            type="color"
            value={editedColor}
            onChange={(e) => setEditedColor(e.target.value)}
            disabled={column.is_system}
            className="w-12 h-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Escolher cor"
          />

          {/* Name Input */}
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            disabled={column.is_system}
            className="flex-1"
            placeholder="Nome da coluna"
          />

          {/* System Badge */}
          {column.is_system && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              <Lock className="h-3 w-3" />
              Sistema
            </div>
          )}

          {/* Save Button */}
          {hasChanges && !column.is_system && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}

          {/* Delete Button */}
          {!column.is_system && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(column.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export function KanbanColumnManager({
  agencyId,
  onColumnsChanged,
}: KanbanColumnManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      loadColumns();
    }
  }, [open, agencyId]);

  const loadColumns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        .eq("agency_id", agencyId)
        .order("column_order", { ascending: true });

      if (error) throw error;
      setColumns(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar colunas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as colunas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = columns.findIndex((col) => col.id === active.id);
    const newIndex = columns.findIndex((col) => col.id === over.id);

    const reorderedColumns = arrayMove(columns, oldIndex, newIndex);

    // Atualizar ordem local imediatamente
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      column_order: index + 1,
    }));
    setColumns(updatedColumns);

    // Salvar no banco
    try {
      const updates = updatedColumns.map((col) =>
        supabase
          .from("kanban_columns")
          .update({ column_order: col.column_order })
          .eq("id", col.id)
      );

      await Promise.all(updates);

      toast({
        title: "Ordem atualizada",
        description: "A ordem das colunas foi salva com sucesso",
      });

      onColumnsChanged?.();
    } catch (error: any) {
      console.error("Erro ao salvar ordem:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a ordem das colunas",
        variant: "destructive",
      });
      // Recarregar para restaurar ordem original
      loadColumns();
    }
  };

  const addColumn = async () => {
    try {
      const maxOrder = Math.max(...columns.map((c) => c.column_order), 0);
      const newColumn = {
        agency_id: agencyId,
        column_id: `custom_${Date.now()}`,
        column_name: "Nova Coluna",
        column_color: "#3B82F6",
        column_order: maxOrder + 1,
        is_system: false,
      };

      const { data, error } = await supabase
        .from("kanban_columns")
        .insert(newColumn)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Coluna adicionada",
        description: "Nova coluna criada com sucesso",
      });

      loadColumns();
      onColumnsChanged?.();
    } catch (error: any) {
      console.error("Erro ao adicionar coluna:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar nova coluna",
        variant: "destructive",
      });
    }
  };

  const updateColumn = async (column: KanbanColumn) => {
    try {
      const { error } = await supabase
        .from("kanban_columns")
        .update({
          column_name: column.column_name,
          column_color: column.column_color,
        })
        .eq("id", column.id);

      if (error) throw error;

      toast({
        title: "Coluna atualizada",
        description: "As alterações foram salvas com sucesso",
      });

      loadColumns();
      onColumnsChanged?.();
    } catch (error: any) {
      console.error("Erro ao atualizar coluna:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from("kanban_columns")
        .delete()
        .eq("id", columnId)
        .eq("is_system", false);

      if (error) throw error;

      toast({
        title: "Coluna removida",
        description: "A coluna foi excluída com sucesso",
      });

      loadColumns();
      onColumnsChanged?.();
    } catch (error: any) {
      console.error("Erro ao deletar coluna:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover coluna",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configurar Colunas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Colunas do Kanban</DialogTitle>
          <DialogDescription>
            Personalize as colunas do seu quadro Kanban. Arraste para reordenar,
            edite cores e nomes. Colunas do sistema não podem ser removidas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista de Colunas com Drag and Drop */}
            <div>
              <Label className="mb-3 block">
                Colunas ({columns.length})
              </Label>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {columns.map((column) => (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        onUpdate={updateColumn}
                        onDelete={deleteColumn}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Botão Adicionar Coluna */}
            <Button onClick={addColumn} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Coluna Customizada
            </Button>

            {/* Informação sobre colunas do sistema */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Colunas do Sistema:</strong>{" "}
                  As colunas marcadas como "Sistema" são essenciais para o
                  funcionamento do Kanban e não podem ser removidas. Você pode
                  alterar apenas suas cores.
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
