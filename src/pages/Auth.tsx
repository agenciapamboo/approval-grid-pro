import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Check, ChevronLeft } from "lucide-react";
import { createInitialUsers } from "@/lib/createUsers";
import { z } from "zod";
import { AppFooter } from "@/components/layout/AppFooter";
import { STRIPE_PRODUCTS, StripePlan, StripePriceInterval, PLAN_ORDER } from "@/lib/stripe-config";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage, getCheckoutErrorMessage } from "@/lib/error-messages";

// Step 1: Personal data
const step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "O nome deve ter no máximo 100 caracteres" }),
  email: z
    .string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email muito longo" }),
  password: z
    .string()
    .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
    .max(72, { message: "A senha deve ter no máximo 72 caracteres" })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula" })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número" })
    .regex(/[^A-Za-z0-9]/, { message: "A senha deve conter pelo menos um caractere especial" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Step 2: Business data - dynamic validation based on account type
const createStep2Schema = (accountType: 'agency' | 'creator') => z.object({
  accountType: z.enum(['agency', 'creator'], { message: "Selecione o tipo de conta" }),
  agencyName: z.string().trim().min(2, { message: "Nome da agência/creator é obrigatório" }),
  responsibleName: z.string().trim().min(2, { message: "Nome do responsável é obrigatório" }),
  whatsapp: z.string().trim().min(10, { message: "WhatsApp inválido" }),
  document: accountType === 'creator' 
    ? z.string().trim().length(11, { message: "Creators devem usar apenas CPF (11 dígitos)" })
    : z.string().trim().min(11, { message: "CPF/CNPJ inválido" }),
  instagramHandle: accountType === 'creator'
    ? z.string().trim().min(1, { message: "Instagram é obrigatório para creators" })
        .regex(/^@?[\w.]+$/, { message: "Instagram inválido (use apenas letras, números, . e _)" })
    : z.string().optional(),
  addressZip: z.string().trim().min(8, { message: "CEP inválido" }),
  addressStreet: z.string().trim().min(3, { message: "Endereço é obrigatório" }),
  addressNumber: z.string().trim().min(1, { message: "Número é obrigatório" }),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().trim().min(2, { message: "Bairro é obrigatório" }),
  addressCity: z.string().trim().min(2, { message: "Cidade é obrigatória" }),
  addressState: z.string().trim().length(2, { message: "Estado inválido" }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Personal data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  
  // Step 2: Business data
  const [accountType, setAccountType] = useState<'agency' | 'creator'>('agency');
  const [agencyName, setAgencyName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [document, setDocument] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  
  // Step 3: Plan selection
  const [selectedPlan, setSelectedPlan] = useState<StripePlan>('creator');
  const [billingCycle, setBillingCycle] = useState<StripePriceInterval>('monthly');
  
  const [creatingUsers, setCreatingUsers] = useState(false);

  const handleCreateUsers = async () => {
    setCreatingUsers(true);
    try {
      const result = await createInitialUsers();
      toast({
        title: "Usuários criados!",
        description: "Agora você pode fazer login com as credenciais fornecidas.",
      });
      console.log('Users created:', result);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuários",
        description: error.message,
      });
    } finally {
      setCreatingUsers(false);
    }
  };

  const handleNextStep = async () => {
    if (!isSignUp) return;
    
    setLoading(true);
    try {
      if (currentStep === 1) {
        const validation = step1Schema.safeParse({ name, email, password, confirmPassword });
        if (!validation.success) {
          throw new Error(validation.error.errors[0].message);
        }
        setCurrentStep(2);
      } else if (currentStep === 2) {
        const step2Schema = createStep2Schema(accountType);
        const validation = step2Schema.safeParse({
          accountType,
          agencyName,
          responsibleName,
          whatsapp,
          document,
          instagramHandle,
          addressZip,
          addressStreet,
          addressNumber,
          addressComplement,
          addressNeighborhood,
          addressCity,
          addressState,
        });
        if (!validation.success) {
          throw new Error(validation.error.errors[0].message);
        }
        setCurrentStep(3);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // Normalize document
      const normalizedDocument = document.replace(/\D/g, '');

      // Determine correct accountType (force 'agency' if paid plan)
      const finalAccountType = selectedPlan !== 'creator' ? 'agency' : accountType;

      // Create user account with metadata for webhook
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            accountType: finalAccountType,
            agencyName,
            selectedPlan,
            billingCycle
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      // Handle "already registered" - try login fallback
      if (authError?.message.includes("already registered") || authError?.message.includes("User already registered")) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já possui uma conta. Redirecionando para login...",
        });

        // Try to login with credentials
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          const errorMsg = getErrorMessage(loginError);
          throw new Error(errorMsg);
        }

        // Login successful, use this session for checkout
        if (loginData.user && selectedPlan !== 'creator') {
          // Aguardar 500ms para garantir propagação da sessão
          await new Promise(resolve => setTimeout(resolve, 500));

          let paymentWindowRef: Window | null = null;
          
          try {
            // Abrir janela em branco sem noopener/noreferrer para manter controle
            paymentWindowRef = window.open('about:blank', '_blank');
            
            if (paymentWindowRef) {
              // Escrever HTML de loading direto na janela
              paymentWindowRef.document.write(`
                <html><head><title>Preparando pagamento...</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <style>
                    body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui}
                    .spinner{
                      width:48px;height:48px;border-radius:50%;
                      border:4px solid #E5E7EB;border-top-color:#10B981;animation:spin 1s linear infinite}
                    @keyframes spin{to{transform:rotate(360deg)}}
                    .txt{margin-top:16px;color:#374151;text-align:center}
                  </style>
                </head><body>
                  <div style="display:flex;flex-direction:column;align-items:center">
                    <div class="spinner"></div>
                    <div class="txt">
                      <h2 style="margin:12px 0 6px;font-size:20px">Preparando pagamento...</h2>
                      <p style="margin:0;color:#6B7280">Aguarde enquanto redirecionamos você ao checkout</p>
                    </div>
                  </div>
                </body></html>
              `);
              paymentWindowRef.document.close();
            }

            // Gerar idempotency-key para evitar duplicação
            const idempotencyKey = `${crypto?.randomUUID?.() || `ck-${Date.now()}`}-${Math.random().toString(36).slice(2,8)}`;
            console.log('[AUTH] Checkout idempotency-key:', idempotencyKey);

            // Timeout helper: 15 segundos
            const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
              return Promise.race([
                promise,
                new Promise<T>((_, reject) => 
                  setTimeout(() => reject(new Error('timeout')), ms)
                )
              ]);
            };

            // Invocar create-checkout com timeout
            const { data: checkoutData, error: checkoutError } = await withTimeout(
              supabase.functions.invoke('create-checkout', {
                body: {
                  plan: selectedPlan,
                  billingCycle: billingCycle,
                },
                headers: {
                  'idempotency-key': idempotencyKey,
                }
              }),
              15000
            );

            if (checkoutError) {
              throw checkoutError;
            }

            if (!checkoutData?.url) {
              throw new Error("URL de checkout não recebida");
            }

            console.log('[AUTH] Checkout URL recebida, redirecionando...');

            // Redirecionar a janela de pagamento ou fallback para mesma aba
            if (paymentWindowRef && !paymentWindowRef.closed) {
              paymentWindowRef.location.href = checkoutData.url;
            } else {
              // Fallback se popup foi bloqueado
              window.location.href = checkoutData.url;
            }

            toast({
              title: "Redirecionando para pagamento",
              description: "Complete o pagamento na janela aberta.",
            });

          } catch (checkoutErr: any) {
            // Fechar janela de pagamento em caso de erro
            if (paymentWindowRef && !paymentWindowRef.closed) {
              paymentWindowRef.close();
            }

            const errorMsg = checkoutErr?.message === 'timeout'
              ? "A requisição demorou muito. Tente novamente."
              : getCheckoutErrorMessage(checkoutErr);
            
            throw new Error(errorMsg);
          }
          
          return;
        }

        // Free plan - just redirect to login
        toast({
          title: "Conta existente",
          description: "Use a opção Entrar.",
        });
        setIsSignUp(false);
        return;
      }

      if (authError) {
        const errorMsg = getErrorMessage(authError);
        throw new Error(errorMsg);
      }

      if (!authData.user) {
        throw new Error("Erro ao criar conta");
      }

      // If free plan, finish registration
      if (selectedPlan === 'creator') {
        // Save minimal profile data for free plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            account_type: finalAccountType,
            agency_name: agencyName,
            responsible_name: responsibleName,
            whatsapp,
            document: normalizedDocument,
            instagram_handle: instagramHandle ? instagramHandle.replace('@', '') : null,
            address_zip: addressZip,
            address_street: addressStreet,
            address_number: addressNumber,
            address_complement: addressComplement,
            address_neighborhood: addressNeighborhood,
            address_city: addressCity,
            address_state: addressState,
            selected_plan: selectedPlan,
            plan: selectedPlan,
            billing_cycle: billingCycle,
            is_active: true,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
        toast({
          title: "Conta criada!",
          description: "Você já pode fazer login.",
        });
        setIsSignUp(false);
        setCurrentStep(1);
      } else {
        // Para planos pagos: garantir sessão válida antes de checkout
        toast({
          title: "Preparando pagamento...",
          description: "Aguarde enquanto preparamos tudo para você.",
        });

        // Fazer login explícito para garantir sessão válida
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          throw new Error("Não foi possível autenticar. Tente fazer login manualmente.");
        }

        if (!loginData.session?.access_token) {
          throw new Error("Sessão não foi criada. Tente fazer login novamente.");
        }

        // Aguardar 500ms para garantir propagação da sessão
        await new Promise(resolve => setTimeout(resolve, 500));

        let paymentWindowRef: Window | null = null;
        
        try {
          // Abrir janela em branco sem noopener/noreferrer para manter controle
          paymentWindowRef = window.open('about:blank', '_blank');
          
          if (paymentWindowRef) {
            // Escrever HTML de loading direto na janela
            paymentWindowRef.document.write(`
              <html><head><title>Preparando pagamento...</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                  body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui}
                  .spinner{
                    width:48px;height:48px;border-radius:50%;
                    border:4px solid #E5E7EB;border-top-color:#10B981;animation:spin 1s linear infinite}
                  @keyframes spin{to{transform:rotate(360deg)}}
                  .txt{margin-top:16px;color:#374151;text-align:center}
                </style>
              </head><body>
                <div style="display:flex;flex-direction:column;align-items:center">
                  <div class="spinner"></div>
                  <div class="txt">
                    <h2 style="margin:12px 0 6px;font-size:20px">Preparando pagamento...</h2>
                    <p style="margin:0;color:#6B7280">Aguarde enquanto redirecionamos você ao checkout</p>
                  </div>
                </div>
              </body></html>
            `);
            paymentWindowRef.document.close();
          }

          // Gerar idempotency-key para evitar duplicação
          const idempotencyKey = `${crypto?.randomUUID?.() || `ck-${Date.now()}`}-${Math.random().toString(36).slice(2,8)}`;
          console.log('[AUTH] Checkout idempotency-key:', idempotencyKey);

          // Timeout helper: 15 segundos
          const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
            return Promise.race([
              promise,
              new Promise<T>((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), ms)
              )
            ]);
          };

          // Invocar create-checkout com timeout
          const { data: checkoutData, error: checkoutError } = await withTimeout(
            supabase.functions.invoke('create-checkout', {
              body: {
                plan: selectedPlan,
                billingCycle: billingCycle,
              },
              headers: {
                'idempotency-key': idempotencyKey,
              }
            }),
            15000
          );

          if (checkoutError) {
            throw checkoutError;
          }

          if (!checkoutData?.url) {
            throw new Error("URL de checkout não recebida");
          }

          console.log('[AUTH] Checkout URL recebida, redirecionando...');

          // Redirecionar a janela de pagamento ou fallback para mesma aba
          if (paymentWindowRef && !paymentWindowRef.closed) {
            paymentWindowRef.location.href = checkoutData.url;
          } else {
            // Fallback se popup foi bloqueado
            window.location.href = checkoutData.url;
          }

          toast({
            title: "Redirecionando para pagamento",
            description: "Complete o pagamento na janela aberta.",
          });

        } catch (checkoutErr: any) {
          // Fechar janela de pagamento em caso de erro
          if (paymentWindowRef && !paymentWindowRef.closed) {
            paymentWindowRef.close();
          }

          const errorMsg = checkoutErr?.message === 'timeout'
            ? "A requisição demorou muito. Tente novamente."
            : getCheckoutErrorMessage(checkoutErr);
          
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('[AUTH] Erro no signup:', error);
      const errorMsg = getErrorMessage(error);
      
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        const errorMsg = getErrorMessage(error);
        throw new Error(errorMsg);
      }

      // Get user profile to check role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });

      // Redirect based on role
      if (profileData?.role === 'super_admin') {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error('[AUTH] Erro no login:', error);
      const errorMsg = getErrorMessage(error);
      
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      <main className="w-full max-w-md space-y-8 relative z-10 flex-grow flex flex-col justify-center px-4">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#00B878] flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight font-poppins">
              Aprova Criativos
            </h1>
            <p className="text-muted-foreground text-lg">
              Automatize o fluxo de aprovação de criativos.
            </p>
          </div>
        </div>

        <Card className="shadow-2xl border-2 backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle>
              {isSignUp ? `Criar conta - Passo ${currentStep} de 3` : "Entrar"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? currentStep === 1
                  ? "Preencha seus dados pessoais"
                  : currentStep === 2
                  ? "Dados da empresa/profissional"
                  : "Escolha seu plano"
                : "Entre com suas credenciais para acessar"}
            </CardDescription>
          </CardHeader>

          {!isSignUp ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="text-right">
                  <Link to="/auth/forgot-password" className="text-sm text-primary story-link">
                    Esqueci minha senha
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsSignUp(true)}
                  disabled={loading}
                >
                  Não tem conta? Criar agora
                </Button>
              </CardFooter>
            </form>
          ) : (
            <div>
              <CardContent className="space-y-4">
                {/* Step 1: Personal Data */}
                {currentStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={8}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={8}
                      />
                    </div>
                  </>
                )}

                {/* Step 2: Business Data */}
                {currentStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de conta</Label>
                      <RadioGroup value={accountType} onValueChange={(v) => setAccountType(v as 'agency' | 'creator')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="agency" id="agency" />
                          <Label htmlFor="agency" className="cursor-pointer">Agência</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="creator" id="creator-type" />
                          <Label htmlFor="creator-type" className="cursor-pointer">Influencer ou Creator</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">
                        {accountType === 'agency' ? 'Nome da Agência' : 'Nome Profissional'}
                      </Label>
                      <Input
                        id="agencyName"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        placeholder={accountType === 'agency' ? 'Sua Agência' : 'Seu Nome Profissional'}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nome do Responsável</Label>
                      <Input
                        id="responsibleName"
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        placeholder="Nome completo"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="(00) 00000-0000"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document">{accountType === 'creator' ? 'CPF' : 'CPF/CNPJ'}</Label>
                        <Input
                          id="document"
                          value={document}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (accountType === 'creator' && value.length > 11) return;
                            setDocument(value);
                          }}
                          placeholder={accountType === 'creator' ? '00000000000' : '000.000.000-00'}
                          required
                          disabled={loading}
                          maxLength={accountType === 'creator' ? 11 : 14}
                        />
                        {accountType === 'creator' && (
                          <p className="text-xs text-muted-foreground">
                            Apenas CPF (pessoa física)
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {accountType === 'creator' && (
                      <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input
                          id="instagram"
                          value={instagramHandle}
                          onChange={(e) => setInstagramHandle(e.target.value)}
                          placeholder="@seuusuario"
                          required
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Apenas contas pessoais ou de criador de conteúdo são aceitas (não empresas)
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="addressZip">CEP</Label>
                      <Input
                        id="addressZip"
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        placeholder="00000-000"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="addressStreet">Endereço</Label>
                        <Input
                          id="addressStreet"
                          value={addressStreet}
                          onChange={(e) => setAddressStreet(e.target.value)}
                          placeholder="Rua/Avenida"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressNumber">Número</Label>
                        <Input
                          id="addressNumber"
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                          placeholder="123"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressComplement">Complemento (opcional)</Label>
                      <Input
                        id="addressComplement"
                        value={addressComplement}
                        onChange={(e) => setAddressComplement(e.target.value)}
                        placeholder="Apto, Sala, etc."
                        disabled={loading}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addressNeighborhood">Bairro</Label>
                        <Input
                          id="addressNeighborhood"
                          value={addressNeighborhood}
                          onChange={(e) => setAddressNeighborhood(e.target.value)}
                          placeholder="Centro"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressCity">Cidade</Label>
                        <Input
                          id="addressCity"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          placeholder="São Paulo"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressState">Estado</Label>
                      <Select value={addressState} onValueChange={setAddressState}>
                        <SelectTrigger disabled={loading}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AC">AC</SelectItem>
                          <SelectItem value="AL">AL</SelectItem>
                          <SelectItem value="AP">AP</SelectItem>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="BA">BA</SelectItem>
                          <SelectItem value="CE">CE</SelectItem>
                          <SelectItem value="DF">DF</SelectItem>
                          <SelectItem value="ES">ES</SelectItem>
                          <SelectItem value="GO">GO</SelectItem>
                          <SelectItem value="MA">MA</SelectItem>
                          <SelectItem value="MT">MT</SelectItem>
                          <SelectItem value="MS">MS</SelectItem>
                          <SelectItem value="MG">MG</SelectItem>
                          <SelectItem value="PA">PA</SelectItem>
                          <SelectItem value="PB">PB</SelectItem>
                          <SelectItem value="PR">PR</SelectItem>
                          <SelectItem value="PE">PE</SelectItem>
                          <SelectItem value="PI">PI</SelectItem>
                          <SelectItem value="RJ">RJ</SelectItem>
                          <SelectItem value="RN">RN</SelectItem>
                          <SelectItem value="RS">RS</SelectItem>
                          <SelectItem value="RO">RO</SelectItem>
                          <SelectItem value="RR">RR</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="SP">SP</SelectItem>
                          <SelectItem value="SE">SE</SelectItem>
                          <SelectItem value="TO">TO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Step 3: Plan Selection */}
                {currentStep === 3 && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-semibold">Selecione seu plano</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBillingCycle('monthly')}
                        >
                          Mensal
                        </Button>
                        <Button
                          type="button"
                          variant={billingCycle === 'annual' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBillingCycle('annual')}
                        >
                          Anual
                        </Button>
                      </div>
                    </div>
                    
                    <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as StripePlan)}>
                      <div className="space-y-3">
                        {PLAN_ORDER.map((key) => {
                          const product = STRIPE_PRODUCTS[key];
                          const isCreator = 'free' in product && product.free;
                          const price = !isCreator && 'prices' in product ? product.prices[billingCycle] : null;
                          
                          return (
                            <div
                              key={key}
                              className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                selectedPlan === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedPlan(key as StripePlan)}
                            >
                              <RadioGroupItem value={key} id={key} />
                              <div className="flex-1">
                                <Label htmlFor={key} className="cursor-pointer font-semibold">
                                  {product.name}
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                                {price && (
                                  <p className="text-lg font-bold mt-2">
                                    R$ {(price.amount / 100).toFixed(2)}
                                    <span className="text-sm font-normal text-muted-foreground">
                                      /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                                    </span>
                                  </p>
                                )}
                                {isCreator && (
                                  <p className="text-lg font-bold text-success mt-2">Gratuito</p>
                                )}
                              </div>
                              {selectedPlan === key && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex-col gap-4">
                <div className="w-full flex gap-2">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      disabled={loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>
                  )}
                  
                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleNextStep}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando...
                        </>
                      ) : (
                        "Próximo"
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleSignUp}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : selectedPlan === 'creator' ? (
                        'Criar conta gratuita'
                      ) : (
                        'Continuar para pagamento'
                      )}
                    </Button>
                  )}
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsSignUp(false);
                    setCurrentStep(1);
                  }}
                  disabled={loading}
                >
                  Já tem uma conta? Entrar
                </Button>
              </CardFooter>
            </div>
          )}
        </Card>

        <div className="text-center mb-24">
          <p className="text-sm text-muted-foreground">
            Sistema profissional de aprovação de conteúdos
          </p>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Auth;
