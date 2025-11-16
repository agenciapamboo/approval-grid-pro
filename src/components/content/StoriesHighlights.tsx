import { useState } from "react";
import { FileText } from "lucide-react";
import { StoriesViewer } from "./StoriesViewer";

interface Content {
  id: string;
  title: string;
  status: string;
  media_path?: string | null;
  created_at: string;
  date: string;
  type: string;
  channels?: string[];
  caption?: string | null;
  client_id: string;
}

interface StoriesHighlightsProps {
  contents: Content[];
  onUpdate: () => void;
}

export function StoriesHighlights({ contents, onUpdate }: StoriesHighlightsProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<'pending' | 'approved' | 'published'>('pending');

  // FILTRAR APENAS STORIES (type = 'story')
  const storyContents = contents.filter(c => c.type === 'story');

  // Se não houver stories, não renderizar nada
  if (storyContents.length === 0) {
    return null;
  }

  const getPending = () => {
    return storyContents
      .filter(c => c.status === 'draft' || c.status === 'in_review')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };
  
  const getApproved = () => {
    return storyContents
      .filter(c => c.status === 'approved')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };
  
  const getPublished = () => {
    return storyContents
      .filter(c => c.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const stories = [
    { 
      label: 'Pendentes', 
      content: getPending(), 
      gradient: 'from-orange-400 to-orange-600',
      category: 'pending' as const
    },
    { 
      label: 'Aprovados', 
      content: getApproved(), 
      gradient: 'from-green-400 to-green-600',
      category: 'approved' as const
    },
    { 
      label: 'Publicados', 
      content: getPublished(), 
      gradient: 'from-blue-400 to-blue-600',
      category: 'published' as const
    },
  ];

  const handleClick = (category: 'pending' | 'approved' | 'published', hasContent: boolean) => {
    if (!hasContent) return;
    setInitialCategory(category);
    setViewerOpen(true);
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 px-1">Stories</h3>
      
      <div className="flex gap-4 overflow-x-auto pb-4 mb-6 px-1 scrollbar-hide">
        {stories.map((story) => (
          <button
            key={story.label}
            onClick={() => handleClick(story.category, !!story.content)}
            disabled={!story.content}
            className="flex flex-col items-center gap-2 min-w-fit disabled:opacity-50"
          >
            {/* Círculo com gradient estilo Instagram */}
            <div className={`w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr ${story.gradient} ${!story.content && 'opacity-30'}`}>
              <div className="w-full h-full rounded-full border-[3px] border-background overflow-hidden bg-background">
                {story.content?.media_path ? (
                  <img 
                    src={story.content.media_path}
                    alt={story.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Label */}
            <span className="text-xs text-center max-w-[80px] truncate font-medium text-foreground">
              {story.label}
            </span>
          </button>
        ))}
      </div>

      {/* Visualizador de Stories */}
      <StoriesViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        initialCategory={initialCategory}
        contents={storyContents}
        onUpdate={() => {
          onUpdate();
          setViewerOpen(false);
        }}
      />
    </div>
  );
}
