import { useState } from "react";
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

  const handleCategorySelect = (category: 'social' | 'avulso') => {
    setSelectedCategory(category);
  };

  const handleContentCreated = () => {
    setSelectedCategory(null);
    onContentCreated();
  };

  const handleCancel = () => {
    setSelectedCategory(null);
    onContentCreated();
  };

  if (!selectedCategory) {
    return (
      <ContentCategorySelector
        open={true}
        onOpenChange={(open) => !open && onContentCreated()}
        onSelect={handleCategorySelect}
      />
    );
  }

  if (selectedCategory === 'social') {
    return (
      <CreateContentCard
        clientId={clientId}
        onContentCreated={handleContentCreated}
        category="social"
        initialDate={initialDate}
        initialTitle={initialTitle}
      />
    );
  }

  if (selectedCategory === 'avulso') {
    return (
      <CreateAvulsoCard
        clientId={clientId}
        onContentCreated={handleContentCreated}
        initialDate={initialDate}
        initialTitle={initialTitle}
      />
    );
  }

  return null;
}
