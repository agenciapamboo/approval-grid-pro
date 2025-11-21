import { format } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface ContentPillProps {
  content: {
    id: string;
    title: string;
    date: string;
    status: string;
    type: string;
    client_id: string;
    itemType?: 'content' | 'creative_request' | 'adjustment_request';
  };
  clientColor: string;
  onClick: (contentId: string) => void;
  isDragging?: boolean;
}

export function ContentPill({ content, clientColor, onClick, isDragging = false }: ContentPillProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: content.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isCurrentlyDragging ? 0.5 : 1,
  } : undefined;

  const isRequest = content.itemType === 'creative_request' || content.itemType === 'adjustment_request';

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: clientColor,
        color: 'white',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }}
      className={cn(
        "text-xs px-2 py-1 rounded cursor-move truncate hover:opacity-80 transition-opacity touch-none",
        isCurrentlyDragging && "opacity-50",
        isRequest && "ring-2 ring-offset-1 ring-yellow-500"
      )}
      onClick={(e) => {
        if (!isCurrentlyDragging) {
          e.stopPropagation();
          onClick(content.id);
        }
      }}
      title={content.title}
      {...attributes}
      {...listeners}
    >
      {content.itemType === 'creative_request' && '📋 '}
      {content.itemType === 'adjustment_request' && '🔧 '}
      {content.itemType === 'content' && (
        <span className="font-medium">{format(new Date(content.date), 'HH:mm')}</span>
      )}
      {' '}
      {content.title}
    </div>
  );
}
