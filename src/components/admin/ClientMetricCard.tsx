import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ClientMetricCardProps {
  title: string;
  icon: LucideIcon;
  value: number;
  total: number;
  percentage: number;
  metric: 'approval' | 'rework' | 'rejection';
}

export function ClientMetricCard({
  title,
  icon: Icon,
  value,
  total,
  percentage,
  metric,
}: ClientMetricCardProps) {
  const getLegendText = () => {
    const roundedPct = Math.round(percentage);
    
    if (metric === 'approval') {
      return `${roundedPct}% dos criativos foram aprovados`;
    } else if (metric === 'rework') {
      return `${roundedPct}% dos criativos necessitaram ajustes`;
    } else if (metric === 'rejection') {
      return `${roundedPct}% dos criativos foram rejeitados`;
    }
    return '';
  };

  const getColorAndMessage = () => {
    if (metric === 'approval') {
      if (percentage >= 70) {
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: '✅ Ótimo alinhamento com este cliente!' 
        };
      } else if (percentage >= 41) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Pode ser necessário revisar o alinhamento criativo',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Atenção! Revise briefings e expectativas do cliente',
        };
      }
    } else if (metric === 'rework') {
      if (percentage < 30) {
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: '✅ Baixo índice de retrabalho!' 
        };
      } else if (percentage <= 60) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Considere melhorar o briefing inicial',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Alto retrabalho detectado. Agende reunião de alinhamento',
        };
      }
    } else if (metric === 'rejection') {
      if (percentage < 20) {
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: '✅ Excelente! Cliente está satisfeito' 
        };
      } else if (percentage <= 40) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Índice elevado. Busque feedback detalhado',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Crítico! Reposicionamento estratégico necessário',
        };
      }
    }
    return { color: 'text-muted-foreground', bgColor: 'bg-muted', message: null };
  };

  const { color, bgColor, message } = getColorAndMessage();

  return (
    <Card className="transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', color)} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className={cn('text-2xl font-bold', color)}>
              {value}
            </div>
            <div className="text-sm text-muted-foreground">
              / {total}
            </div>
          </div>

          {total > 0 && (
            <>
              <Progress value={percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {getLegendText()}
              </p>
            </>
          )}

          {message && (
            <p className="text-xs mt-2">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
