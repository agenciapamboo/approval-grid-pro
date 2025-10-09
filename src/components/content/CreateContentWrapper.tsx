import { useState } from "react";
import { ContentCategorySelector } from "./ContentCategorySelector";
import { CreateContentCard } from "./CreateContentCard";
import { CreateAvulsoCard } from "./CreateAvulsoCard";

interface CreateContentWrapperProps {
  clientId: string;
  onContentCreated: () => void;
}

export function CreateContentWrapper({ clientId, onContentCreated }: CreateContentWrapperProps) {
  const [showSelector, setShowSelector] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'social' | 'avulso' | null>(null);

  const handleCategorySelect = (category: 'social' | 'avulso') => {
    setSelectedCategory(category);
    setShowSelector(false);
  };

  const handleContentCreated = () => {
    setSelectedCategory(null);
    setShowSelector(true);
    onContentCreated();
  };

  if (showSelector) {
    return (
      <ContentCategorySelector
        open={showSelector}
        onOpenChange={setShowSelector}
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
      />
    );
  }

  if (selectedCategory === 'avulso') {
    return (
      <CreateAvulsoCard
        clientId={clientId}
        onContentCreated={handleContentCreated}
      />
    );
  }

  return null;
}
