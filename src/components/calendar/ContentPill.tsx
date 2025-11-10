import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ContentPillProps {
  content: {
    id: string;
    title: string;
    date: string;
    status: string;
    type: string;
    client_id: string;
  };
  clientColor: string;
  onClick: (contentId: string) => void;
}

export function ContentPill({ content, clientColor, onClick }: ContentPillProps) {
  return (
    <div
      className="text-xs px-2 py-1 rounded cursor-pointer truncate hover:opacity-80 transition-opacity"
      style={{ 
        backgroundColor: clientColor,
        color: 'white',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(content.id);
      }}
      title={`${format(new Date(content.date), 'HH:mm')} - ${content.title}`}
    >
      <span className="font-medium">{format(new Date(content.date), 'HH:mm')}</span>
      {' '}
      {content.title}
    </div>
  );
}
