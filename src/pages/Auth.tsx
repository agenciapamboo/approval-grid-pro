import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Instagram } from "lucide-react";
import { createInitialUsers } from "@/lib/createUsers";

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
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Verifique seu e-mail para confirmar o cadastro.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

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
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-accent to-tertiary flex items-center justify-center shadow-2xl animate-pulse">
              <Instagram className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-tertiary bg-clip-text text-transparent">
              Social Approval
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Sistema de aprovação de conteúdos para redes sociais
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
                  minLength={6}
                />
              </div>
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
  );
};

export default Auth;
