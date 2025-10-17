import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";

const DataDeletion = () => {
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
          <h1 className="text-3xl font-bold">Instruções de Exclusão de Dados</h1>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6 text-foreground/90">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Como Solicitar a Exclusão dos Seus Dados
              </h2>
              <p className="mb-4">
                Respeitamos sua privacidade e seu direito de solicitar a exclusão dos seus dados pessoais
                de nossa plataforma. Este processo está em conformidade com a LGPD (Lei Geral de Proteção
                de Dados) e as políticas do Facebook/Meta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Dados que Coletamos do Facebook/Instagram
              </h2>
              <p className="mb-2">
                Quando você conecta sua conta do Facebook ou Instagram, coletamos:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>ID da sua conta de rede social</li>
                <li>Token de acesso para publicação de conteúdo</li>
                <li>Nome da página/perfil conectado</li>
                <li>Informações sobre contas conectadas (Facebook Page ID, Instagram Account ID)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Processo de Exclusão de Dados
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Opção 1: Exclusão Através da Plataforma</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Faça login na sua conta</li>
                    <li>Acesse as configurações do seu perfil</li>
                    <li>Vá até a seção "Contas Sociais Conectadas"</li>
                    <li>Remova as conexões com Facebook/Instagram que deseja desconectar</li>
                    <li>Para excluir completamente sua conta, entre em contato conosco</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Opção 2: Solicitação por E-mail</h3>
                  <p className="mb-2">
                    Envie um e-mail para nossa equipe de suporte solicitando a exclusão dos seus dados:
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium mb-2">Informações a incluir no e-mail:</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Seu nome completo</li>
                      <li>E-mail cadastrado na plataforma</li>
                      <li>Confirmação de que deseja excluir todos os seus dados</li>
                      <li>Especificar se deseja excluir apenas conexões sociais ou toda a conta</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                O Que Acontece Quando Você Solicita a Exclusão
              </h2>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>Confirmação:</strong> Você receberá uma confirmação de que recebemos sua solicitação
                </li>
                <li>
                  <strong>Processamento:</strong> Processaremos sua solicitação em até 30 dias
                </li>
                <li>
                  <strong>Revogação de Acessos:</strong> Todos os tokens de acesso às suas redes sociais
                  serão revogados imediatamente
                </li>
                <li>
                  <strong>Exclusão de Dados:</strong> Seus dados pessoais serão permanentemente removidos
                  de nossos servidores
                </li>
                <li>
                  <strong>Notificação:</strong> Você receberá uma confirmação quando o processo for concluído
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Dados que Podem Ser Retidos
              </h2>
              <p className="mb-2">
                Em conformidade com obrigações legais, podemos reter algumas informações por um período
                limitado para:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cumprir requisitos legais e regulatórios</li>
                <li>Resolver disputas</li>
                <li>Prevenir fraudes e garantir a segurança da plataforma</li>
                <li>Dados anonimizados para fins estatísticos (sem identificação pessoal)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Tempo de Processamento
              </h2>
              <p>
                Processaremos sua solicitação de exclusão em até <strong>30 dias</strong> a partir do
                recebimento. Em casos complexos, podemos precisar de até 90 dias, e você será notificado
                se isso acontecer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Contato
              </h2>
              <div className="bg-primary/10 p-6 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold mb-1">E-mail de Suporte</p>
                    <p className="text-sm text-muted-foreground">
                      Para solicitar a exclusão dos seus dados ou tirar dúvidas, entre em contato
                      através do e-mail fornecido nas configurações da sua conta.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">
                Desconexão do Facebook
              </h2>
              <p className="mb-2">
                Se você conectou sua conta através do Facebook, você também pode:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Acessar suas configurações do Facebook</li>
                <li>Ir para "Aplicativos e Sites"</li>
                <li>Encontrar nossa aplicação na lista</li>
                <li>Remover o acesso do aplicativo</li>
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                Nota: Isso revoga o acesso imediatamente, mas para exclusão completa dos dados de nosso
                sistema, você ainda precisa seguir as instruções acima.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
              <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              <p className="mt-2">
                Esta página está em conformidade com a LGPD e as políticas de privacidade da plataforma Meta.
              </p>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default DataDeletion;