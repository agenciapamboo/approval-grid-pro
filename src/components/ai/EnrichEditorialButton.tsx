import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { EnrichEditorialDialog } from "./EnrichEditorialDialog";

interface EnrichEditorialButtonProps {
  clientId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  onSuccess?: () => void;
}

export function EnrichEditorialButton({
  clientId,
  variant = "default",
  size = "default",
  onSuccess,
}: EnrichEditorialButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const buttonClasses = useMemo(() => {
    const base = variant === "default" ? "bg-green-500 hover:bg-green-600" : "";
    return `${base} gap-2`.trim();
  }, [variant]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={!clientId}
        onClick={() => setDialogOpen(true)}
        className={buttonClasses}
      >
        <Sparkles className="h-4 w-4" />
        Enriquecer Linha Editorial
      </Button>

      <EnrichEditorialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        onSuccess={onSuccess}
      />
    </>
  );
}
