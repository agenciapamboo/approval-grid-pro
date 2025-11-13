import { useState, useEffect, useRef } from "react";
import { ContentCard } from "./ContentCard";
import { ContentCardSkeleton } from "./ContentCardSkeleton";

interface Content {
  id: string;
  title: string;
  date: string;
  deadline?: string;
  type: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  channels?: string[];
  client_id: string;
  owner_user_id: string;
  auto_publish?: boolean;
  published_at?: string | null;
  supplier_link?: string | null;
  is_content_plan?: boolean;
  plan_description?: string | null;
}

interface VirtualizedContentGridProps {
  contents: Content[];
  mediaUrls: Map<string, string>;
  isResponsible: boolean;
  isAgencyView?: boolean;
  isPublicApproval?: boolean;
  sessionToken?: string;
  onUpdate: () => void;
  blockSize?: number;
}

export function VirtualizedContentGrid({
  contents,
  mediaUrls,
  isResponsible,
  isAgencyView = false,
  isPublicApproval = false,
  sessionToken,
  onUpdate,
  blockSize = 9,
}: VirtualizedContentGridProps) {
  const [visibleBlocks, setVisibleBlocks] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleBlocks * blockSize < contents.length) {
          setVisibleBlocks((prev) => prev + 1);
        }
      },
      {
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [visibleBlocks, blockSize, contents.length]);

  // Reset quando contents mudar
  useEffect(() => {
    setVisibleBlocks(1);
  }, [contents]);

  const visibleContents = contents.slice(0, visibleBlocks * blockSize);
  const hasMore = visibleContents.length < contents.length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleContents.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            mediaUrls={mediaUrls}
            isResponsible={isResponsible}
            isAgencyView={isAgencyView}
            isPublicApproval={isPublicApproval}
            sessionToken={sessionToken}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      {/* Sentinela para Intersection Observer */}
      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: Math.min(blockSize, contents.length - visibleContents.length) }).map((_, i) => (
              <ContentCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
