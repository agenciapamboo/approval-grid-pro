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
  const getLegendText = () => {
    if (limit === null) return null;
    
    const roundedPct = Math.round(percentage);
    
    if (metric === 'usage') {
      return `Você já usou ${roundedPct}% da sua cota disponível`;
    } else if (metric === 'approval') {
      return `${roundedPct}% dos criativos foram aprovados pelos clientes`;
    } else if (metric === 'rework') {
      return `${roundedPct}% dos criativos necessitaram ajustes`;
    } else if (metric === 'rejection') {
      return `${roundedPct}% dos criativos foram rejeitados`;
    }
    return null;
  };

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
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: (
            <div className="space-y-1">
              <div className="font-semibold">✅ Bom trabalho!</div>
              <div className="text-xs">A agência está com alta eficiência criativa. A maior parte das entregas está sendo aprovada de primeira, indicando processos bem ajustados, comunicação clara e consistência no padrão de qualidade.</div>
            </div>
          )
        };
      } else if (percentage >= 41) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">⚠️ Atenção!</div>
              <div className="text-xs">A média geral mostra variação significativa nas aprovações. Pode haver falhas pontuais de briefing, expectativas diferentes entre contas ou inconsistências nos processos criativos. Vale revisar rituais de alinhamento.</div>
            </div>
          ),
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">🔴 Menos de 40%</div>
              <div className="text-xs">A média baixa de aprovação geralmente indica desalinhamento global: problemas no fluxo, comunicação falha com vários clientes ou falta de padronização nas entregas. É necessário reavaliar processos, calibrar o time e reforçar o alinhamento estratégico.</div>
            </div>
          ),
        };
      }
    } else if (metric === 'rework') {
      if (percentage < 30) {
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: (
            <div className="space-y-1">
              <div className="font-semibold">✅ Bom trabalho!</div>
              <div className="text-xs">O índice reduzido de solicitações de ajuste indica que o time está acertando bem os briefings e mantendo um fluxo de criativos eficiente.</div>
            </div>
          )
        };
      } else if (percentage <= 60) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">⚠️ Atenção!</div>
              <div className="text-xs">Pode ser necessário alinhamento com os clientes. O aumento nas refações pode sugerir diferenças de expectativa dos clientes, falhas na comunicação, ajustes de posicionamento ou necessidade de melhorar o direcionamento dos criativos.</div>
            </div>
          ),
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">⚠️ Muita Atenção!</div>
              <div className="text-xs">Alto nível de retrabalho pode apontar para desalinhamentos e falta de compreensão. Alinhamento estratégico, visual e uma revisão profunda de briefing e objetivos pode ajudar a estabilizar o processo.</div>
            </div>
          ),
        };
      }
    } else if (metric === 'rejection') {
      if (percentage < 20) {
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-100', 
          message: (
            <div className="space-y-1">
              <div className="font-semibold">✅ Bom trabalho!</div>
              <div className="text-xs">O índice reduzido de rejeições indica que o time está acertando bem os briefings e mantendo um fluxo de criativos eficiente.</div>
            </div>
          )
        };
      } else if (percentage <= 50) {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">⚠️ Atenção!</div>
              <div className="text-xs">Pode ser necessário alinhamento com os clientes. O aumento nas rejeições pode sugerir diferenças de expectativa dos clientes, falhas na comunicação, ajustes de posicionamento ou necessidade de melhorar o direcionamento dos criativos.</div>
            </div>
          ),
        };
      } else {
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          message: (
            <div className="space-y-1">
              <div className="font-semibold">⚠️ Muita Atenção!</div>
              <div className="text-xs">Alto nível de retrabalho pode apontar para desalinhamentos e falta de compreensão. Alinhamento estratégico, visual e uma revisão profunda de briefing e objetivos pode ajudar a estabilizar o processo.</div>
            </div>
          ),
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
            <>
              <Progress value={percentage} className="h-2" />
              {getLegendText() && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getLegendText()}
                </p>
              )}
            </>
          )}

          {message && (
            <div className="text-xs mt-2">{message}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
