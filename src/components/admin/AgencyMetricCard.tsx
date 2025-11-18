import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AgencyMetricCardProps {
  title: string;
  icon: LucideIcon;
  value: number;
  limit: number | null;
  percentage: number;
  onClick?: () => void;
  metric?: 'usage' | 'approval' | 'rework' | 'rejection';
}

export function AgencyMetricCard({
  title,
  icon: Icon,
  value,
  limit,
  percentage,
  onClick,
  metric = 'usage',
}: AgencyMetricCardProps) {
  // Determinar cor e mensagem com base no tipo de métrica
  const getColorAndMessage = () => {
    if (metric === 'usage') {
      if (percentage < 56) {
        return { color: 'text-green-600', bgColor: 'bg-green-100', message: null };
      } else if (percentage <= 80) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Você está próximo do limite da sua cota',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: (
            <span>
              🔴 Faça o <Link to="/pricing" className="underline">upgrade do seu plano</Link> para aumentar seu limite
            </span>
          ),
        };
      }
    } else if (metric === 'approval') {
      if (percentage >= 70) {
        return { color: 'text-green-600', bgColor: 'bg-green-100', message: '✅ Bom trabalho!' };
      } else if (percentage >= 41) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Pode ser necessário alinhamento com o cliente',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Alguma providência precisa ser tomada na gestão deste cliente',
        };
      }
    } else if (metric === 'rework') {
      if (percentage < 30) {
        return { color: 'text-green-600', bgColor: 'bg-green-100', message: '✅ Bom trabalho!' };
      } else if (percentage <= 60) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Pode ser necessário alinhamento com o cliente',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Alguma providência precisa ser tomada na gestão deste cliente',
        };
      }
    } else if (metric === 'rejection') {
      if (percentage < 20) {
        return { color: 'text-green-600', bgColor: 'bg-green-100', message: '✅ Bom trabalho!' };
      } else if (percentage <= 40) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: '⚠️ Pode ser necessário alinhamento com o cliente',
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: '🔴 Alguma providência precisa ser tomada na gestão deste cliente',
        };
      }
    }
    return { color: 'text-muted-foreground', bgColor: 'bg-muted', message: null };
  };

  const { color, bgColor, message } = getColorAndMessage();

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-105'
      )}
      onClick={onClick}
    >
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
            {limit !== null && (
              <div className="text-sm text-muted-foreground">
                / {limit}
              </div>
            )}
          </div>

          {limit !== null && (
            <Progress value={percentage} className="h-2" />
          )}

          {message && (
            <p className="text-xs mt-2">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
