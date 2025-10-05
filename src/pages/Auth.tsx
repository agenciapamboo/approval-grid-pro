import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createInitialUsers } from "@/lib/createUsers";
import { z } from "zod";

const authSchema = z.object({
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
  name: z
    .string()
    .trim()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "O nome deve ter no máximo 100 caracteres" })
    .optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validation = authSchema.safeParse({
        email,
        password,
        name: isSignUp ? name : undefined,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: firstError.message,
        });
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            data: { name: validation.data.name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Provide user-friendly error messages
          if (error.message.includes("already registered")) {
            throw new Error("Este email já está cadastrado. Tente fazer login.");
          } else if (error.message.includes("invalid")) {
            throw new Error("Dados inválidos. Verifique suas informações.");
          }
          throw error;
        }

        toast({
          title: "Conta criada!",
          description: "Você já pode fazer login.",
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (error) {
          // Provide user-friendly error messages without exposing system details
          if (error.message.includes("Invalid") || error.message.includes("credentials")) {
            throw new Error("Email ou senha incorretos.");
          }
          throw new Error("Erro ao fazer login. Tente novamente.");
        }

        toast({
          title: "Login realizado!",
          description: "Redirecionando...",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="font-poppins text-4xl font-bold tracking-tight">
                Aprova Criativos
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Automatize o fluxo de aprovação de criativos.
              </p>
            </div>
          </div>

        <Card className="shadow-2xl border-2 backdrop-blur-sm bg-card/95">
          <CardHeader>
            <CardTitle>{isSignUp ? "Criar conta" : "Entrar"}</CardTitle>
            <CardDescription>
              {isSignUp
                ? "Preencha os dados para criar sua conta"
                : "Entre com suas credenciais para acessar"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              {isSignUp && (
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
              )}
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
              </div>
              {!isSignUp && (
                <div className="text-right">
                  <Link to="/auth/forgot-password" className="text-sm text-primary story-link">
                    Esqueci minha senha
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : isSignUp ? (
                  "Criar conta"
                ) : (
                  "Entrar"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
              >
                {isSignUp
                  ? "Já tem uma conta? Entrar"
                  : "Não tem conta? Criar agora"}
              </Button>
            </CardFooter>
          </form>
        </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Sistema profissional de aprovação de conteúdos
            </p>
          </div>
        </div>
      </div>
      
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center font-poppins text-sm">
            <span className="font-normal">Desenvolvido com </span>
            <span className="text-[#FFD700]">💛</span>
            <span className="font-normal"> por </span>
            <a 
              href="https://agenciapamboo.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold hover:underline"
            >
              Pamboo Criativos
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Auth;
