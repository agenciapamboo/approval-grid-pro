import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, ShieldCheck, ArrowLeft } from "lucide-react";
import { z } from "zod";

// Validação de inputs
const identifierSchema = z.string()
  .trim()
  .min(1, { message: "Email ou WhatsApp é obrigatório" })
  .max(255, { message: "Identificador muito longo" });

const codeSchema = z.string()
  .trim()
  .length(6, { message: "Código deve ter 6 dígitos" })
  .regex(/^\d{6}$/, { message: "Código deve conter apenas números" });

// Função para normalizar WhatsApp (aceita (XX) XXXXX-XXXX)
const formatWhatsApp = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export default function ClientApproval() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'identifier' | 'code'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [identifierType, setIdentifierType] = useState<'email' | 'whatsapp' | null>(null);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Permitir digitação livre - detectar tipo apenas visualmente
    if (value.includes('@')) {
      // É email - não formatar
      setIdentifier(value);
      setIdentifierType('email');
    } else if (value.match(/^\d/)) {
      // Começou com número - é WhatsApp - formatar
      setIdentifier(formatWhatsApp(value));
      setIdentifierType('whatsapp');
    } else {
      // Ainda não sabemos - permitir digitação livre
      setIdentifier(value);
      setIdentifierType(null);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      identifierSchema.parse(identifier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { identifier },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setIdentifierType(data.identifier_type);
      toast.success(data.message || 'Código enviado com sucesso!');
      setStep('code');
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast.error(error.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      codeSchema.parse(code);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { identifier, code },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data.success) {
        toast.error('Código inválido ou expirado');
        return;
      }

      // Salvar token no localStorage
      localStorage.setItem('client_session_token', data.session_token);
      localStorage.setItem('client_session_expires', data.expires_at);

      toast.success(`Bem-vindo, ${data.approver?.name || 'Aprovador'}!`);

      // Redirecionar para página do cliente
      const clientSlug = data.client?.slug;
      if (clientSlug) {
        // Precisamos buscar o slug da agência também
        const { data: clientData } = await supabase
          .from('clients')
          .select('agency_id, agencies!inner(slug)')
          .eq('id', data.client.id)
          .single();

        const agencySlug = (clientData?.agencies as any)?.slug;

        if (agencySlug && clientSlug) {
          navigate(`/${agencySlug}/${clientSlug}?session=${data.session_token}`);
        } else {
          toast.error('Erro ao carregar dados do cliente');
        }
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error(error.message || 'Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('identifier');
    setCode('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Área de Aprovação
          </h1>
          <p className="text-muted-foreground text-sm">
            Aprove conteúdos de forma segura
          </p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              {step === 'identifier' ? (
                <>
                  <Mail className="h-5 w-5 text-primary" />
                  Identificação
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Código de Verificação
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === 'identifier' 
                ? 'Digite seu email ou WhatsApp cadastrado'
                : 'Digite o código enviado para você'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'identifier' ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email ou WhatsApp</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="exemplo@email.com ou (XX) XXXXX-XXXX"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    disabled={loading}
                    className="h-12"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Use o email ou WhatsApp cadastrado como aprovador
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={loading || !identifier}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    'Enviar código de verificação'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código de 6 dígitos</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(value);
                    }}
                    disabled={loading}
                    className="h-12 text-center text-2xl font-mono tracking-widest"
                    autoFocus
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Verifique seu {identifierType === 'email' ? 'email' : 'WhatsApp'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium"
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      'Validar código'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStep('identifier');
                      setCode('');
                      toast.info('Solicite um novo código');
                    }}
                    disabled={loading}
                  >
                    Não recebeu o código? Solicitar novamente
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Sistema seguro de autenticação • 
            <a 
              href="https://aprovacriativos.com.br" 
              className="text-primary hover:underline ml-1"
            >
              aprovacriativos.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
