import { useState } from "react";
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

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={variant === "default" ? "bg-green-500 hover:bg-green-600" : ""}
      >
        <Sparkles className="h-4 w-4 mr-2" />
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
