import { Loader2 } from "lucide-react";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Preparando pagamento...</h2>
          <p className="text-muted-foreground">
            Aguarde enquanto redirecionamos você para o checkout
          </p>
        </div>
      </div>
    </div>
  );
}
