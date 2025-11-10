import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ContentCategorySelector } from "./ContentCategorySelector";
import { CreateContentCard } from "./CreateContentCard";
import { CreateAvulsoCard } from "./CreateAvulsoCard";

interface CreateContentWrapperProps {
  clientId: string;
  onContentCreated: () => void;
  initialDate?: Date;
  initialTitle?: string;
}

export function CreateContentWrapper({ clientId, onContentCreated, initialDate, initialTitle }: CreateContentWrapperProps) {
  const [selectedCategory, setSelectedCategory] = useState<'social' | 'avulso' | null>(null);
  const [open, setOpen] = useState(true);

  const handleCategorySelect = (category: 'social' | 'avulso') => {
    setSelectedCategory(category);
  };

  const handleContentCreated = () => {
    setSelectedCategory(null);
    setOpen(false);
    onContentCreated();
  };

  const handleClose = () => {
    setOpen(false);
    onContentCreated();
  };

  if (!selectedCategory) {
    return (
      <ContentCategorySelector
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
        onSelect={handleCategorySelect}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
    }}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-6"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {selectedCategory === 'social' && (
          <CreateContentCard
            clientId={clientId}
            onContentCreated={handleContentCreated}
            category="social"
            initialDate={initialDate}
            initialTitle={initialTitle}
          />
        )}
        
        {selectedCategory === 'avulso' && (
          <CreateAvulsoCard
            clientId={clientId}
            onContentCreated={handleContentCreated}
            initialDate={initialDate}
            initialTitle={initialTitle}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
