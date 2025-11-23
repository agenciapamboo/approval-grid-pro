import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Informações detalhadas dos planos
const PLAN_DETAILS: Record<string, {
  description: string;
  features: string[];
  metrics: {
    performance: string;
    retrabalho: string;
    rejeicao: string;
  };
}> = {
  creator: {
    description: "Ideal para influencers e criadores independentes que desejam centralizar aprovações e agendamentos básicos sem custo, conta do instagram precisa necessariamente ser pessoal ou criador de conteúdo (Contas de empresa cadastradas como criador de conteúdo não estão habilitadas neste plano).",
    metrics: {
      performance: "70%",
      retrabalho: "30%",
      rejeicao: "20%"
    },
    features: [
      "Clientes ilimitados",
      "Aprovadores ilimitados",
      "Até 80 criativos/mês",
      "80 criativos ou 30 dias de histórico",
      "Controle do consumo do contrato dos clientes",
      "Usuário por cliente para aprovação",
      "1 membro na equipe",
      "Aprovação de criativos direto na plataforma",
      "Agendamento de postagens",
      "Download de mídia pela janela de aprovação",
      "Histórico de criativos publicados",
      "Logs e histórico de aprovações",
      "Notificações por e-mail (pendente, aprovado, ajustes, nova solicitação)",
      "Agenda por cliente"
    ]
  },
  eugencia: {
    description: "Perfeito para autônomos e microagências que precisam de um fluxo criativo organizado, com solicitações e aprovações simplificadas.",
    metrics: {
      performance: "80%",
      retrabalho: "20%",
      rejeicao: "15%"
    },
    features: [
      "Todos os recursos do Creator",
      "Clientes ilimitados",
      "Aprovadores ilimitados",
      "100 criativos/mês",
      "200 criativos ou 60 dias de histórico",
      "Solicitação de criativos com briefing (clientes pedem novas peças)",
      "1 membro na equipe",
      "Agendamento de postagens automáticas",
      "Notificações automáticas por e-mail (pendente, aprovado, ajustes, nova solicitação)"
    ]
  },
  socialmidia: {
    description: "Feito para pequenas equipes e agências de social media que buscam automação e comunicação direta com seus clientes.",
    metrics: {
      performance: "85%",
      retrabalho: "15%",
      rejeicao: "10%"
    },
    features: [
      "Todos os recursos do Creator e Eugência",
      "Clientes ilimitados",
      "Aprovadores ilimitados",
      "120 postagens por mês",
      "300 criativos ou 90 dias de histórico",
      "Até 3 membros na equipe",
      "Aprovação automática pós-deadline",
      "Notificações automáticas por e-mail e WhatsApp",
      "Agenda por cliente",
      "Histórico completo de criativos publicados",
      "Download de mídias pela janela de aprovação",
      "Logs e histórico detalhado de feedbacks por versão"
    ]
  },
  fullservice: {
    description: "Projetado para agências completas e equipes multidisciplinares que gerenciam múltiplos clientes, campanhas e fornecedores com fluxo de aprovação 360°.",
    metrics: {
      performance: "95%",
      retrabalho: "5%",
      rejeicao: "5%"
    },
    features: [
      "Todos os recursos do Creator, Eugência e Social Mídia",
      "Clientes ilimitados",
      "Aprovadores ilimitados",
      "Postagens ilimitadas",
      "500 criativos ou 90 dias de histórico",
      "Membros da equipe ilimitados",
      "Aprovação automática pós-deadline",
      "Aprovação de conteúdos gráficos (PDF, Key Visuals, peças offline)",
      "Link direto para fornecedores baixarem arquivos fechados",
      "Agenda geral consolidada (todos os clientes e campanhas)",
      "Kanban da equipe",
      "Notificações internas automáticas para equipe (ajustes, novas solicitações, prazos e deadlines)",
      "Notificações externas por e-mail e WhatsApp (clientes e revisores)"
    ]
  }
};

// Step 1: Personal data
const step1Schema = z.object({
  name: z.string().trim().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres"
  }).max(100, {
    message: "O nome deve ter no máximo 100 caracteres"
  }),
  email: z.string().trim().email({
    message: "Email inválido"
  }).max(255, {
    message: "Email muito longo"
  }),
  password: z.string().min(8, {
    message: "A senha deve ter pelo menos 8 caracteres"
  }).max(72, {
    message: "A senha deve ter no máximo 72 caracteres"
  }).regex(/[A-Z]/, {
    message: "A senha deve conter pelo menos uma letra maiúscula"
  }).regex(/[a-z]/, {
    message: "A senha deve conter pelo menos uma letra minúscula"
  }).regex(/[0-9]/, {
    message: "A senha deve conter pelo menos um número"
  }).regex(/[^A-Za-z0-9]/, {
    message: "A senha deve conter pelo menos um caractere especial"
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"]
});

// Step 2: Business data - dynamic validation based on account type
const createStep2Schema = (accountType: 'agency' | 'creator') => z.object({
  accountType: z.enum(['agency', 'creator'], {
    message: "Selecione o tipo de conta"
  }),
  agencyName: z.string().trim().min(2, {
    message: "Nome da agência/creator é obrigatório"
  }),
  responsibleName: z.string().trim().min(2, {
    message: "Nome do responsável é obrigatório"
  }),
  whatsapp: z.string().trim().min(10, {
    message: "WhatsApp inválido"
  }),
  document: accountType === 'creator' ? z.string().trim().length(11, {
    message: "Creators devem usar apenas CPF (11 dígitos)"
  }) : z.string().trim().min(11, {
    message: "CPF/CNPJ inválido"
  }),
  instagramHandle: accountType === 'creator' ? z.string().trim().min(1, {
    message: "Instagram é obrigatório para creators"
  }).regex(/^@?[\w.]+$/, {
    message: "Instagram inválido (use apenas letras, números, . e _)"
  }) : z.string().optional(),
  addressZip: z.string().trim().min(8, {
    message: "CEP inválido"
  }),
  addressStreet: z.string().trim().min(3, {
    message: "Endereço é obrigatório"
  }),
  addressNumber: z.string().trim().min(1, {
    message: "Número é obrigatório"
  }),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().trim().min(2, {
    message: "Bairro é obrigatório"
  }),
  addressCity: z.string().trim().min(2, {
    message: "Cidade é obrigatória"
  }),
  addressState: z.string().trim().length(2, {
    message: "Estado inválido"
  })
});
const loginSchema = z.object({
  email: z.string().trim().email({
    message: "Email inválido"
  }),
  password: z.string().min(1, {
    message: "Senha é obrigatória"
  })
});
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  // Verificar parâmetros de URL
  const signupParam = searchParams.get('signup');
  const planParam = searchParams.get('plan') as StripePlan | null;
  const billingParam = searchParams.get('billing') as StripePriceInterval | null;
  
  const [isSignUp, setIsSignUp] = useState(signupParam === 'true');
  // Se plano pré-selecionado, começar no passo 1 (dados pessoais), senão começar no passo 1 também
  // Mas o passo 3 (seleção de planos) só aparecerá se não houver plano pré-selecionado
  const [currentStep, setCurrentStep] = useState(1);

  // Atualizar isSignUp e plano quando os parâmetros de URL mudarem
  useEffect(() => {
    const signup = searchParams.get('signup');
    const plan = searchParams.get('plan') as StripePlan | null;
    const billing = searchParams.get('billing') as StripePriceInterval | null;
    
    if (signup === 'true' && !isSignUp) {
      setIsSignUp(true);
    }
    
    if (plan && ['creator', 'eugencia', 'socialmidia', 'fullservice'].includes(plan)) {
      setSelectedPlan(plan);
    }
    
    if (billing && (billing === 'monthly' || billing === 'annual')) {
      setBillingCycle(billing);
    }
  }, [searchParams, isSignUp]);

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
  const [loadingCep, setLoadingCep] = useState(false);

  // Step 3: Plan selection (só se não houver plano pré-selecionado)
  const [selectedPlan, setSelectedPlan] = useState<StripePlan>(planParam && ['creator', 'eugencia', 'socialmidia', 'fullservice'].includes(planParam) ? planParam : 'creator');
  const [billingCycle, setBillingCycle] = useState<StripePriceInterval>(billingParam && (billingParam === 'monthly' || billingParam === 'annual') ? billingParam : 'monthly');
  
  // Determinar se o plano foi pré-selecionado
  const hasPreSelectedPlan = planParam && ['creator', 'eugencia', 'socialmidia', 'fullservice'].includes(planParam);
  
  // Número máximo de passos: 2 se plano pré-selecionado (dados pessoais + dados cadastrais), 3 se não (dados pessoais + dados cadastrais + planos)
  const maxSteps = hasPreSelectedPlan ? 2 : 3;
  const [creatingUsers, setCreatingUsers] = useState(false);
  
  // Função para buscar endereço pelo CEP usando ViaCEP
  const fetchAddressByCep = async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '');
    
    // Verifica se tem 8 dígitos
    if (cleanCep.length !== 8) {
      return;
    }
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado. Verifique e tente novamente."
        });
        return;
      }
      
      // Preenche os campos automaticamente
      if (data.logradouro) {
        setAddressStreet(data.logradouro);
      }
      if (data.bairro) {
        setAddressNeighborhood(data.bairro);
      }
      if (data.localidade) {
        setAddressCity(data.localidade);
      }
      if (data.uf) {
        setAddressState(data.uf);
      }
      
      // Se encontrou o endereço, mostra mensagem de sucesso
      if (data.logradouro || data.bairro || data.localidade) {
        toast({
          title: "Endereço encontrado",
          description: "Os dados do endereço foram preenchidos automaticamente."
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço. Por favor, preencha manualmente."
      });
    } finally {
      setLoadingCep(false);
    }
  };
  
  // Handler para o campo CEP com formatação e busca automática
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limita a 8 dígitos
    if (value.length > 8) {
      value = value.slice(0, 8);
    }
    
    // Formata como CEP (00000-000)
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    
    setAddressZip(value);
    
    // Busca automaticamente quando tem 8 dígitos
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchAddressByCep(cleanCep);
    }
  };
  
  const handleCreateUsers = async () => {
    setCreatingUsers(true);
    try {
      const result = await createInitialUsers();
      toast({
        title: "Usuários criados!",
        description: "Agora você pode fazer login com as credenciais fornecidas."
      });
      console.log('Users created:', result);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuários",
        description: error.message
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
        const validation = step1Schema.safeParse({
          name,
          email,
          password,
          confirmPassword
        });
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
          addressState
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
        description: error.message
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
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
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
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      // Handle "already registered" - try login fallback
      if (authError?.message.includes("already registered") || authError?.message.includes("User already registered")) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já possui uma conta. Redirecionando para login..."
        });

        // Try to login with credentials
        const {
          data: loginData,
          error: loginError
        } = await supabase.auth.signInWithPassword({
          email,
          password
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
            const idempotencyKey = `${crypto?.randomUUID?.() || `ck-${Date.now()}`}-${Math.random().toString(36).slice(2, 8)}`;
            console.log('[AUTH] Checkout idempotency-key:', idempotencyKey);

            // Timeout helper: 15 segundos
            const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
              return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
            };

            // Invocar create-checkout com timeout
            const {
              data: checkoutData,
              error: checkoutError
            } = await withTimeout(supabase.functions.invoke('create-checkout', {
              body: {
                plan: selectedPlan,
                billingCycle: billingCycle
              },
              headers: {
                'idempotency-key': idempotencyKey
              }
            }), 15000);
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
              description: "Complete o pagamento na janela aberta."
            });
          } catch (checkoutErr: any) {
            // Fechar janela de pagamento em caso de erro
            if (paymentWindowRef && !paymentWindowRef.closed) {
              paymentWindowRef.close();
            }
            const errorMsg = checkoutErr?.message === 'timeout' ? "A requisição demorou muito. Tente novamente." : getCheckoutErrorMessage(checkoutErr);
            throw new Error(errorMsg);
          }
          return;
        }

        // Free plan - just redirect to login
        toast({
          title: "Conta existente",
          description: "Use a opção Entrar."
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
        const {
          error: profileError
        } = await supabase.from('profiles').update({
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
          is_active: true
        }).eq('id', authData.user.id);
        if (profileError) throw profileError;
        toast({
          title: "Conta criada!",
          description: "Você já pode fazer login."
        });
        setIsSignUp(false);
        setCurrentStep(1);
      } else {
        // Para planos pagos: garantir sessão válida antes de checkout
        toast({
          title: "Preparando pagamento...",
          description: "Aguarde enquanto preparamos tudo para você."
        });

        // Fazer login explícito para garantir sessão válida
        const {
          data: loginData,
          error: loginError
        } = await supabase.auth.signInWithPassword({
          email,
          password
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
          const idempotencyKey = `${crypto?.randomUUID?.() || `ck-${Date.now()}`}-${Math.random().toString(36).slice(2, 8)}`;
          console.log('[AUTH] Checkout idempotency-key:', idempotencyKey);

          // Timeout helper: 15 segundos
          const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
            return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
          };

          // Invocar create-checkout com timeout
          const {
            data: checkoutData,
            error: checkoutError
          } = await withTimeout(supabase.functions.invoke('create-checkout', {
            body: {
              plan: selectedPlan,
              billingCycle: billingCycle
            },
            headers: {
              'idempotency-key': idempotencyKey
            }
          }), 15000);
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
            description: "Complete o pagamento na janela aberta."
          });
        } catch (checkoutErr: any) {
          // Fechar janela de pagamento em caso de erro
          if (paymentWindowRef && !paymentWindowRef.closed) {
            paymentWindowRef.close();
          }
          const errorMsg = checkoutErr?.message === 'timeout' ? "A requisição demorou muito. Tente novamente." : getCheckoutErrorMessage(checkoutErr);
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('[AUTH] Erro no signup:', error);
      const errorMsg = getErrorMessage(error);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validation = loginSchema.safeParse({
        email,
        password
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });
      if (error) {
        const errorMsg = getErrorMessage(error);
        throw new Error(errorMsg);
      }

      // Get user profile to check role
      const {
        data: profileData
      } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      toast({
        title: "Login realizado!",
        description: "Redirecionando..."
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
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex flex-col items-center justify-center relative">
      <main className={`w-full space-y-8 relative z-10 flex-grow flex flex-col justify-center px-4 ${
        !isSignUp 
          ? 'max-w-md' // Login: mais estreito
          : currentStep === 3 && !hasPreSelectedPlan
            ? 'max-w-5xl' // Passo 3 (planos): mais largo, só se não houver plano pré-selecionado
            : 'max-w-2xl' // Passos 1 e 2: tamanho médio
      }`}>
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
              {isSignUp ? `Criar conta - Passo ${currentStep} de ${maxSteps}` : "Entrar"}
            </CardTitle>
            <CardDescription>
              {isSignUp ? currentStep === 1 ? "Preencha seus dados pessoais" : currentStep === 2 ? "Dados da empresa/profissional" : "Escolha seu plano" : "Entre com suas credenciais para acessar"}
            </CardDescription>
          </CardHeader>

          {!isSignUp ? <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <div className="text-right">
                  <Link to="/auth/forgot-password" className="text-sm text-primary story-link">
                    Esqueci minha senha
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </> : "Entrar"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/auth?signup=true')} disabled={loading}>
                  Não tem conta? Criar agora
                </Button>
              </CardFooter>
            </form> : <div>
              <CardContent className="space-y-4">
                {/* Step 1: Personal Data */}
                {currentStep === 1 && <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} minLength={8} />
                      <p className="text-xs text-muted-foreground">
                        Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                      <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading} minLength={8} />
                    </div>
                  </>}

                {/* Step 2: Business Data */}
                {currentStep === 2 && <>
                    <div className="space-y-2">
                      <Label>Tipo de conta</Label>
                      <RadioGroup value={accountType} onValueChange={v => setAccountType(v as 'agency' | 'creator')}>
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
                      <Input id="agencyName" value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder={accountType === 'agency' ? 'Sua Agência' : 'Seu Nome Profissional'} required disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nome do Responsável</Label>
                      <Input id="responsibleName" value={responsibleName} onChange={e => setResponsibleName(e.target.value)} placeholder="Nome completo" required disabled={loading} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" required disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document">{accountType === 'creator' ? 'CPF' : 'CPF/CNPJ'}</Label>
                        <Input id="document" value={document} onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (accountType === 'creator' && value.length > 11) return;
                    setDocument(value);
                  }} placeholder={accountType === 'creator' ? '00000000000' : '000.000.000-00'} required disabled={loading} maxLength={accountType === 'creator' ? 11 : 14} />
                        {accountType === 'creator' && <p className="text-xs text-muted-foreground">
                            Apenas CPF (pessoa física)
                          </p>}
                      </div>
                    </div>
                    
                    {accountType === 'creator' && <div className="space-y-2">
                        <Label htmlFor="instagram">Instagram</Label>
                        <Input id="instagram" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="@seuusuario" required disabled={loading} />
                        <p className="text-xs text-muted-foreground">
                          Apenas contas pessoais ou de criador de conteúdo são aceitas (não empresas)
                        </p>
                      </div>}
                    <div className="space-y-2">
                      <Label htmlFor="addressZip">CEP</Label>
                      <div className="relative">
                        <Input 
                          id="addressZip" 
                          value={addressZip} 
                          onChange={handleCepChange}
                          placeholder="00000-000" 
                          required 
                          disabled={loading || loadingCep}
                          maxLength={9}
                        />
                        {loadingCep && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {addressZip && addressZip.replace(/\D/g, '').length === 8 && !loadingCep && (
                        <p className="text-xs text-muted-foreground">
                          Digite o CEP para buscar o endereço automaticamente
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="addressStreet">Endereço</Label>
                        <Input id="addressStreet" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Rua/Avenida" required disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressNumber">Número</Label>
                        <Input id="addressNumber" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="123" required disabled={loading} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressComplement">Complemento (opcional)</Label>
                      <Input id="addressComplement" value={addressComplement} onChange={e => setAddressComplement(e.target.value)} placeholder="Apto, Sala, etc." disabled={loading} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addressNeighborhood">Bairro</Label>
                        <Input id="addressNeighborhood" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Centro" required disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressCity">Cidade</Label>
                        <Input id="addressCity" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="São Paulo" required disabled={loading} />
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
                  </>}

                {/* Step 3: Plan Selection */}
                {currentStep === 3 && <div className="space-y-4 p-4 bg-muted/50 rounded-lg w-full">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-semibold">Selecione seu plano</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={billingCycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('monthly')}>
                          Mensal
                        </Button>
                        <Button type="button" variant={billingCycle === 'annual' ? 'default' : 'outline'} size="sm" onClick={() => setBillingCycle('annual')}>
                          Anual
                        </Button>
                      </div>
                    </div>
                    
                    <RadioGroup value={selectedPlan} onValueChange={value => setSelectedPlan(value as StripePlan)}>
                      <div className="space-y-3">
                        {PLAN_ORDER.filter(key => key !== 'unlimited').map(key => {
                    const product = STRIPE_PRODUCTS[key];
                    const isCreator = 'free' in product && product.free;
                    const price = !isCreator && 'prices' in product ? product.prices[billingCycle] : null;
                          const planDetails = PLAN_DETAILS[key];
                          const displayName = key === 'socialmidia' ? 'Social Mídia' : product.name;
                          
                          return (
                            <div 
                              key={key} 
                              className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedPlan === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} 
                              onClick={() => setSelectedPlan(key as StripePlan)}
                            >
                              <RadioGroupItem value={key} id={key} className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                <Label htmlFor={key} className="cursor-pointer font-semibold">
                                    {displayName}
                                </Label>
                                  {planDetails && (
                                    <Popover>
                                      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-1 transition-colors flex items-center justify-center h-5 w-5"
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label="Informações do plano"
                                        >
                                          <Info className="h-3 w-3" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent 
                                        className="w-[calc(100vw-2rem)] md:w-[600px] p-6 max-h-[calc(100vh-2rem)] overflow-y-auto" 
                                        align="start" 
                                        side="bottom"
                                        sideOffset={8}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-4">
                                          <h4 className="font-semibold text-base mb-4">{displayName}</h4>
                                          
                                          <div>
                                            <h5 className="font-medium text-sm mb-4">Informações do plano:</h5>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                              {planDetails.features.map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-2">
                                                  <span className="text-primary mt-1 flex-shrink-0">•</span>
                                                  <span className="text-muted-foreground">{feature}</span>
                                                </div>
                                              ))}
                                              
                                              {/* Métricas de Performance no final */}
                                              {planDetails.metrics && (
                                                <div className="mt-4 pt-4 border-t">
                                                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                                    <h5 className="text-sm font-semibold mb-3">Métricas de Performance</h5>
                                                    <div className="space-y-3">
                                                      <div className="space-y-1">
                                                        <div className="text-sm">
                                                          <span className="font-medium">Performance de Aprovação:</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                          Saiba quando seus criativos estão indo bem
                                                        </p>
                                                      </div>
                                                      <div className="space-y-1">
                                                        <div className="text-sm">
                                                          <span className="font-medium">Nível de Retrabalho:</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                          Entenda quando há mais trabalho do que o necessário
                                                        </p>
                                                      </div>
                                                      <div className="space-y-1">
                                                        <div className="text-sm">
                                                          <span className="font-medium">Índice de Rejeição:</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                          Entenda quando há alinhamentos e reposicionamentos a fazer
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{planDetails?.description || product.description}</p>
                                {price && !isCreator && (
                                  billingCycle === 'annual' && 'prices' in product && product.prices ? (
                                    (() => {
                                      const monthlyPrice = product.prices.monthly.amount;
                                      const annualPrice = product.prices.annual.amount;
                                      const monthlyPriceX12 = monthlyPrice * 12;
                                      const savings = Math.round(((monthlyPriceX12 - annualPrice) / monthlyPriceX12) * 100);
                                      // Calcular equivalente mensal: dividir por 100 (centavos para reais) e depois por 12 meses
                                      const monthlyEquivalent = (annualPrice / 100 / 12).toFixed(2).replace('.', ',');
                                      const monthlyPriceFormatted = (monthlyPrice / 100).toFixed(2).replace('.', ',');
                                      const annualPriceFormatted = (annualPrice / 100).toFixed(2).replace('.', ',');
                                      
                                      return (
                                        <div className="space-y-2 mt-2">
                                          {/* Badge de economia */}
                                          <Badge className="bg-green-600 text-white hover:bg-green-700">
                                            Economia anual de {savings}%
                                          </Badge>
                                          
                                          {/* Comparativo de preços mensais */}
                                          <div className="text-sm text-muted-foreground">
                                            de{' '}
                                            <span className="line-through">R$ {monthlyPriceFormatted}/mês</span>
                                            {' '}por{' '}
                                            <span className="font-semibold text-foreground">R$ {monthlyEquivalent}/mês</span>
                                          </div>
                                          
                                          {/* Preço anual */}
                                          <div className="text-lg font-bold">
                                            R$ {annualPriceFormatted}
                                            <span className="text-sm font-normal text-muted-foreground">/ano</span>
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <p className="text-lg font-bold mt-2">
                                      R$ {(price.amount / 100).toFixed(2).replace('.', ',')}
                                    <span className="text-sm font-normal text-muted-foreground">
                                      /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                                    </span>
                                    </p>
                                  )
                                )}
                                {isCreator && <p className="text-lg font-bold text-green-600 mt-2">Gratuito</p>}
                              </div>
                              {selectedPlan === key && <Check className="h-5 w-5 text-primary mt-1" />}
                            </div>
                          );
                  })}
                      </div>
                    </RadioGroup>
                  </div>}
              </CardContent>
              
              {/* Mostrar plano pré-selecionado se houver */}
              {hasPreSelectedPlan && isSignUp && currentStep < 3 && (
                <CardContent className="pt-0">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plano selecionado</p>
                      <p className="text-lg font-bold">{STRIPE_PRODUCTS[selectedPlan].name}</p>
                      <p className="text-sm text-muted-foreground">
                        Cobrança {billingCycle === 'monthly' ? 'mensal' : 'anual'}
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // Remover plano da URL e ir para seleção de planos
                        navigate('/auth?signup=true');
                        setSelectedPlan('creator');
                        setCurrentStep(3);
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                </CardContent>
              )}
              
              <CardFooter className="flex-col gap-4">
                <div className="w-full flex gap-2">
                  {currentStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={loading}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>}
                  
                  {currentStep < maxSteps ? <Button type="button" className="flex-1" onClick={handleNextStep} disabled={loading}>
                      {loading ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando...
                        </> : currentStep === 2 && hasPreSelectedPlan ? "Finalizar Cadastro" : "Próximo"}
                    </Button> : <Button type="button" className="flex-1" onClick={handleSignUp} disabled={loading}>
                      {loading ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </> : selectedPlan === 'creator' ? 'Criar conta gratuita' : 'Continuar para pagamento'}
                    </Button>}
                </div>
                
                <Button type="button" variant="ghost" className="w-full" onClick={() => {
              navigate('/auth');
              setIsSignUp(false);
              setCurrentStep(1);
            }} disabled={loading}>
                  Já tem uma conta? Entrar
                </Button>
              </CardFooter>
            </div>}
        
        {/* Mostrar plano pré-selecionado se houver */}
        {hasPreSelectedPlan && isSignUp && (
          <Card className="mt-4 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plano selecionado</p>
                  <p className="text-lg font-bold">{STRIPE_PRODUCTS[selectedPlan].name}</p>
                  <p className="text-sm text-muted-foreground">
                    Cobrança {billingCycle === 'monthly' ? 'mensal' : 'anual'}
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Remover plano da URL e ir para seleção de planos
                    navigate('/auth?signup=true');
                    setSelectedPlan('creator');
                    setCurrentStep(3);
                  }}
                >
                  Alterar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </Card>

        <div className="text-center mb-24">
          <p className="text-muted-foreground py-[20px] font-sans text-sm">
            Sistema profissional de aprovação de conteúdos
          </p>
        </div>
      </main>
      
      <AppFooter />
    </div>;
};
export default Auth;