import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, FileText } from "lucide-react";

interface ContentCategorySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: 'social' | 'avulso') => void;
}

export function ContentCategorySelector({ open, onOpenChange, onSelect }: ContentCategorySelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione o tipo de conteúdo</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-6">
          <Button
            variant="outline"
            onClick={() => onSelect('social')}
            className="h-32 flex flex-col gap-3 hover:bg-primary/5"
          >
            <Share2 className="h-10 w-10" />
            <span className="font-semibold">Rede social</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => onSelect('avulso')}
            className="h-32 flex flex-col gap-3 hover:bg-primary/5"
          >
            <FileText className="h-10 w-10" />
            <span className="font-semibold">Avulso</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
