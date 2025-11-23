import { useAIUsageLimit } from "@/hooks/useAIUsageLimit";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AIUsageBadge() {
  const { canUse, currentUsage, limit, remaining, percentage, isUnlimited, isLoading } = useAIUsageLimit();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-2">
        <Sparkles className="h-3 w-3 animate-pulse text-green-500" />
        <span className="text-xs">Carregando...</span>
      </Badge>
    );
  }

  if (isUnlimited) {
    return (
      <Badge variant="outline" className="gap-2 bg-green-500/10 border-green-500/20">
        <Sparkles className="h-3 w-3 text-green-500" />
        <span className="text-xs font-medium">IA: Ilimitado</span>
      </Badge>
    );
  }

  // Cores baseadas no percentual de uso
  const getStatusColor = () => {
    if (percentage >= 91) return { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-700" };
    if (percentage >= 71) return { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-700" };
    return { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-700" };
  };

  const colors = getStatusColor();

  // Link para upgrade se atingir 100%
  if (percentage >= 100) {
    return (
      <Link to="/pricing">
        <Badge 
          variant="outline" 
          className={cn("gap-2 cursor-pointer hover:opacity-80 transition-opacity", colors.bg, colors.border)}
        >
          <TrendingUp className={cn("h-3 w-3", colors.text)} />
          <span className={cn("text-xs font-medium", colors.text)}>
            IA: Limite atingido - Fazer upgrade
          </span>
        </Badge>
      </Link>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-2", colors.bg, colors.border)}
    >
      <Sparkles className={cn("h-3 w-3", colors.text)} />
      <span className={cn("text-xs font-medium", colors.text)}>
        IA: {remaining}/{limit} usos
      </span>
    </Badge>
  );
}