import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LGPDConsentProps {
  onAccept: () => void;
}

export function LGPDConsent({ onAccept }: LGPDConsentProps) {
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");

  useEffect(() => {
    loadLGPDPages();
  }, []);

  const loadLGPDPages = async () => {
    const { data, error } = await supabase
      .from("lgpd_pages")
      .select("*");

    if (!error && data) {
      const terms = data.find(p => p.page_type === "terms");
      const privacy = data.find(p => p.page_type === "privacy");
      
      if (terms) setTermsContent(terms.content);
      if (privacy) setPrivacyContent(privacy.content);
    }
  };

  const handleAccept = async () => {
    if (!accepted) {
      toast({
        title: "Aceite necessário",
        description: "Você precisa aceitar os termos e a política de privacidade para continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Registrar consentimento
      const { error: consentError } = await supabase
        .from("consents")
        .insert({
          user_id: user.id,
          legal_basis: "contract",
          ip: await fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip)
            .catch(() => null),
        });

      if (consentError) throw consentError;

      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ accepted_terms_at: new Date().toISOString() })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast({
        title: "Termos aceitos",
        description: "Bem-vindo ao sistema!",
      });

      onAccept();
    } catch (error) {
      console.error("Erro ao aceitar termos:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar o aceite. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>
            Para continuar, você precisa aceitar nossos termos de uso e política de privacidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="terms" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
              <TabsTrigger value="privacy">Política de Privacidade</TabsTrigger>
            </TabsList>
            <TabsContent value="terms">
              <ScrollArea className="h-96 w-full rounded-md border p-4">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(termsContent) }}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="privacy">
              <ScrollArea className="h-96 w-full rounded-md border p-4">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(privacyContent) }}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox 
              id="accept" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label
              htmlFor="accept"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Li e aceito os Termos de Uso e a Política de Privacidade
            </label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleAccept} 
            disabled={!accepted || loading}
            className="w-full"
          >
            {loading ? "Processando..." : "Aceitar e Continuar"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
