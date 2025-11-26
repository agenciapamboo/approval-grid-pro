import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-4xl p-8">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6 text-foreground/90">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">1. Informações que Coletamos</h2>
              <p className="mb-2">
                Coletamos informações que você nos fornece diretamente ao criar uma conta e usar nosso aplicativo:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nome e endereço de e-mail</li>
                <li>Informações de perfil profissional</li>
                <li>Conteúdos criativos que você cria ou aprova</li>
                <li>Dados de uso e interação com a plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">2. Como Usamos suas Informações</h2>
              <p className="mb-2">
                Utilizamos as informações coletadas para:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Fornecer, manter e melhorar nossos serviços</li>
                <li>Processar solicitações e transações</li>
                <li>Enviar notificações e comunicações relacionadas ao serviço</li>
                <li>Personalizar sua experiência</li>
                <li>Garantir a segurança e prevenir fraudes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">3. Compartilhamento de Informações</h2>
              <p className="mb-2">
                Não vendemos suas informações pessoais. Podemos compartilhar informações apenas nas seguintes situações:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Com sua agência ou clientes, conforme necessário para o serviço</li>
                <li>Com prestadores de serviços que nos ajudam a operar a plataforma</li>
                <li>Quando exigido por lei ou para proteger nossos direitos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">4. Integração com Redes Sociais</h2>
              <p className="mb-2">
                Ao conectar suas contas de redes sociais (Facebook, Instagram):
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Solicitamos apenas as permissões necessárias para publicar conteúdo</li>
                <li>Não armazenamos senhas de redes sociais</li>
                <li>Você pode revogar o acesso a qualquer momento</li>
                <li>Tokens de acesso são armazenados de forma segura e criptografada</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">5. Segurança dos Dados</h2>
              <p>
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra
                acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia de dados
                sensíveis e controles de acesso rigorosos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">6. Seus Direitos</h2>
              <p className="mb-2">
                De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar consentimento</li>
                <li>Portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">7. Cookies e Tecnologias Similares</h2>
              <p>
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da
                plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de cookies nas
                configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">8. Retenção de Dados</h2>
              <p>
                Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir as finalidades
                descritas nesta política, a menos que um período de retenção mais longo seja exigido ou
                permitido por lei.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">9. Alterações nesta Política</h2>
              <p>
                Podemos atualizar esta política de privacidade periodicamente. Notificaremos você sobre
                alterações significativas publicando a nova política nesta página e atualizando a data de
                "última atualização".
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">10. Contato</h2>
              <p>
                Se você tiver dúvidas sobre esta política de privacidade ou sobre como tratamos seus dados,
                entre em contato conosco através do e-mail de suporte fornecido em sua conta.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
              <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
