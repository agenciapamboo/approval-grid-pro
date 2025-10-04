import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MonthSelectorDialogProps {
  clientId: string;
  clientSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthSelectorDialog({ clientId, clientSlug, open, onOpenChange }: MonthSelectorDialogProps) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const months = [
    { name: "Única", value: 0 },
    { name: "Janeiro", value: 1 },
    { name: "Fevereiro", value: 2 },
    { name: "Março", value: 3 },
    { name: "Abril", value: 4 },
    { name: "Maio", value: 5 },
    { name: "Junho", value: 6 },
    { name: "Julho", value: 7 },
    { name: "Agosto", value: 8 },
    { name: "Setembro", value: 9 },
    { name: "Outubro", value: 10 },
    { name: "Novembro", value: 11 },
    { name: "Dezembro", value: 12 },
  ];

  const handleMonthSelect = (month: number) => {
    const year = currentYear;
    navigate(`/${clientSlug}?month=${month}&year=${year}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Selecione o Mês
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-3 py-4">
          {months.map((month) => (
            <Button
              key={month.value}
              variant="outline"
              onClick={() => handleMonthSelect(month.value)}
              className="h-auto py-4"
            >
              {month.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
