import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ContentCaptionProps {
  contentId: string;
  version: number;
  approvalToken?: string;
  initialCaption?: string | null;
}

export function ContentCaption({ contentId, version, approvalToken, initialCaption }: ContentCaptionProps) {
  const { toast } = useToast();
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCaption = useCallback(async () => {
    // Fluxo normal autenticado (sem RPC legado)
    const { data, error } = await supabase
      .from("content_texts")
      .select("caption")
      .eq("content_id", contentId)
      .eq("version", version)
      .maybeSingle();

    if (!error && data) {
      setCaption(data.caption || "");
    }
  }, [contentId, version]);

  useEffect(() => {
    if (initialCaption !== undefined) {
      setCaption(initialCaption || "");
      return;
    }
    loadCaption();
  }, [contentId, version, initialCaption, loadCaption]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fluxo normal autenticado - criar nova versão da legenda
      const { error: insertError } = await supabase
        .from("content_texts")
        .insert({
          content_id: contentId,
          version: version + 1,
          caption: caption,
        });

      if (insertError) throw insertError;

      // Atualizar versão do conteúdo
      const { error: updateError } = await supabase
        .from("contents")
        .update({ version: version + 1 })
        .eq("id", contentId);

      if (updateError) throw updateError;

      toast({
        title: "Legenda salva",
        description: "A legenda foi atualizada com sucesso",
      });

      setEditing(false);
      if (initialCaption !== undefined) {
        setCaption(caption);
      } else {
        loadCaption();
      }
    } catch (error) {
      console.error("Erro ao salvar legenda:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a legenda",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayCaption = caption.length > 150 && !expanded 
    ? caption.substring(0, 150) + "..." 
    : caption;

  return (
    <div className="p-4 bg-muted/30">
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Digite a legenda..."
            rows={4}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setEditing(false);
                loadCaption();
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {caption ? (
            <>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">
                {displayCaption}
              </p>
              {caption.length > 150 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-primary hover:underline mt-1"
                >
                  {expanded ? "ver menos" : "ver mais"}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem legenda</p>
          )}
          <div className="mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setEditing(true)}
            >
              Editar legenda
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
