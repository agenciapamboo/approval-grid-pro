import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Mail, BookOpen, Building2, UserCircle, LifeBuoy, HelpCircle, CreditCard, MessageSquare } from "lucide-react";
import { AppFooter } from "@/components/layout/AppFooter";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { useNavigate } from "react-router-dom";
import { TicketCategory } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";

const HelpCenter = () => {
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('suporte');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleOpenTicket = (category: TicketCategory) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedCategory(category);
    setTicketDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Central de Ajuda</h1>
          <p className="text-muted-foreground text-lg">
            Encontre respostas para suas dúvidas e aprenda a usar o sistema
          </p>
        </div>

        {/* Ticket Section - Only for logged users */}
        {user && (
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5" />
                Precisa de Ajuda? Abra um Ticket
              </CardTitle>
              <CardDescription>
                Selecione o setor apropriado para sua solicitação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-primary/5"
                  onClick={() => handleOpenTicket('suporte')}
                >
                  <LifeBuoy className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Suporte Técnico</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Relativo a defeitos e erros do sistema
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-primary/5"
                  onClick={() => handleOpenTicket('duvidas')}
                >
                  <HelpCircle className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Dúvidas</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Dúvidas de qualquer natureza
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-primary/5"
                  onClick={() => handleOpenTicket('financeiro')}
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Financeiro</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Erros de pagamento e vencimento
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 hover:bg-primary/5"
                  onClick={() => handleOpenTicket('agencia')}
                >
                  <MessageSquare className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Comunicação</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Comunicações com a agência
                  </span>
                </Button>
              </div>

              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/meus-tickets')}
                >
                  Ver Meus Tickets →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Entre em Contato
            </CardTitle>
            <CardDescription>
              Nossa equipe está sempre disponível para ajudar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <p className="font-semibold mb-2">SAC - Atendimento ao Cliente</p>
                <a 
                  href="mailto:sac@aprovacriativos.com.br" 
                  className="text-primary hover:underline"
                >
                  sac@aprovacriativos.com.br
                </a>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <p className="font-semibold mb-2">Suporte Técnico</p>
                <a 
                  href="mailto:suporte@aprovacriativos.com.br" 
                  className="text-primary hover:underline"
                >
                  suporte@aprovacriativos.com.br
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Perguntas Frequentes
            </CardTitle>
            <CardDescription>
              Respostas rápidas para as dúvidas mais comuns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>Como funciona a assinatura do serviço?</AccordionTrigger>
                <AccordionContent>
                  Nossa plataforma oferece diferentes planos de assinatura adaptados às suas necessidades. 
                  Você pode escolher entre planos mensais ou anuais, com diferentes níveis de recursos e 
                  número de usuários. O pagamento é processado de forma segura via Stripe.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger>Posso cancelar minha assinatura a qualquer momento?</AccordionTrigger>
                <AccordionContent>
                  Sim, você pode cancelar sua assinatura a qualquer momento através do painel de configurações. 
                  Seu acesso permanecerá ativo até o final do período já pago. Não há taxas de cancelamento.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger>Quantos clientes posso gerenciar?</AccordionTrigger>
                <AccordionContent>
                  O número de clientes que você pode gerenciar depende do seu plano de assinatura. 
                  Planos básicos permitem até 5 clientes, enquanto planos profissionais oferecem 
                  gerenciamento ilimitado de clientes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger>Os dados dos meus clientes estão seguros?</AccordionTrigger>
                <AccordionContent>
                  Sim, utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de 
                  segurança da indústria. Todos os dados são armazenados de forma segura e em conformidade 
                  com a LGPD.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger>Posso fazer upgrade do meu plano?</AccordionTrigger>
                <AccordionContent>
                  Sim, você pode fazer upgrade do seu plano a qualquer momento. A diferença de valor será 
                  calculada proporcionalmente e você terá acesso imediato aos novos recursos.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-6">
                <AccordionTrigger>Como funciona o processo de aprovação de conteúdos?</AccordionTrigger>
                <AccordionContent>
                  A agência cadastra os conteúdos no sistema, e os clientes recebem notificações para 
                  aprovação. Os clientes podem aprovar, reprovar ou solicitar ajustes diretamente na 
                  plataforma, mantendo todo o histórico de comunicação organizado.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Agency Tutorials */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tutoriais para Agências
            </CardTitle>
            <CardDescription>
              Guias passo a passo para gerenciar sua agência e clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="agency-1">
                <AccordionTrigger>Como cadastrar novos clientes</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse o painel principal e clique em "Gerenciar Clientes"</li>
                    <li>Clique no botão "Adicionar Cliente" no canto superior direito</li>
                    <li>Preencha os dados do cliente: nome, email e informações de contato</li>
                    <li>Defina as permissões e configurações específicas do cliente</li>
                    <li>Clique em "Salvar" para finalizar o cadastro</li>
                    <li>O cliente receberá um email de boas-vindas com instruções de acesso</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="agency-2">
                <AccordionTrigger>Como ativar notificações</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Clique no ícone de perfil no canto superior direito</li>
                    <li>Selecione "Configurações" no menu</li>
                    <li>Navegue até a seção "Notificações"</li>
                    <li>Ative as notificações que deseja receber (email, push, etc.)</li>
                    <li>Configure a frequência e os tipos de eventos que quer ser notificado</li>
                    <li>Salve as configurações</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="agency-3">
                <AccordionTrigger>Como cadastrar criativos para aprovação</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse a área do cliente específico ou use "Solicitar Criativo"</li>
                    <li>Clique em "Novo Conteúdo" ou "Adicionar Criativo"</li>
                    <li>Selecione o tipo de conteúdo (post, story, vídeo, etc.)</li>
                    <li>Faça upload das mídias (imagens, vídeos) ou crie conteúdo direto na plataforma</li>
                    <li>Adicione legendas, hashtags e outras informações relevantes</li>
                    <li>Selecione as redes sociais de destino</li>
                    <li>Defina a data de publicação programada (opcional)</li>
                    <li>Clique em "Enviar para Aprovação"</li>
                    <li>O cliente receberá uma notificação para revisar o conteúdo</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="agency-4">
                <AccordionTrigger>Como recuperar minha senha</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Na tela de login, clique em "Esqueceu sua senha?"</li>
                    <li>Digite o email cadastrado na sua conta</li>
                    <li>Clique em "Enviar link de recuperação"</li>
                    <li>Verifique sua caixa de entrada (e spam) por um email da AprovaCreativos</li>
                    <li>Clique no link de recuperação no email</li>
                    <li>Digite e confirme sua nova senha</li>
                    <li>Faça login com a nova senha</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="agency-5">
                <AccordionTrigger>Como gerenciar múltiplos clientes</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Use a barra lateral para navegar entre diferentes clientes</li>
                    <li>Utilize filtros e pesquisa para encontrar clientes específicos rapidamente</li>
                    <li>Configure visualizações personalizadas para cada cliente</li>
                    <li>Use etiquetas e categorias para organizar seus clientes</li>
                    <li>Ative notificações específicas por cliente conforme necessário</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Client Tutorials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Tutoriais para Clientes
            </CardTitle>
            <CardDescription>
              Guias passo a passo para aprovar e gerenciar seus conteúdos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="client-1">
                <AccordionTrigger>Como aprovar meu conteúdo</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Faça login na plataforma com suas credenciais</li>
                    <li>Você verá os conteúdos pendentes de aprovação na página inicial</li>
                    <li>Clique em um conteúdo para visualizá-lo em detalhes</li>
                    <li>Revise a mídia, legenda, hashtags e outras informações</li>
                    <li>Escolha uma das opções:
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li><strong>Aprovar:</strong> O conteúdo será publicado conforme programado</li>
                        <li><strong>Solicitar Ajuste:</strong> Adicione comentários sobre as mudanças desejadas</li>
                        <li><strong>Reprovar:</strong> O conteúdo não será publicado</li>
                      </ul>
                    </li>
                    <li>Adicione comentários se necessário e confirme sua decisão</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="client-2">
                <AccordionTrigger>Como recuperar minha senha</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Na tela de login, clique em "Esqueceu sua senha?"</li>
                    <li>Digite o email que você recebeu no convite da agência</li>
                    <li>Clique em "Enviar link de recuperação"</li>
                    <li>Verifique sua caixa de entrada (e spam) por um email da AprovaCreativos</li>
                    <li>Clique no link de recuperação no email</li>
                    <li>Digite e confirme sua nova senha</li>
                    <li>Faça login com a nova senha</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="client-3">
                <AccordionTrigger>Como alterar minha senha</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Faça login na sua conta</li>
                    <li>Clique no ícone de perfil no canto superior direito</li>
                    <li>Selecione "Configurações" ou "Meu Perfil"</li>
                    <li>Navegue até a seção "Segurança" ou "Alterar Senha"</li>
                    <li>Digite sua senha atual para confirmar sua identidade</li>
                    <li>Digite sua nova senha e confirme-a</li>
                    <li>Clique em "Salvar alterações"</li>
                    <li>Você receberá uma confirmação por email sobre a alteração</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="client-4">
                <AccordionTrigger>Como solicitar novos criativos</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse seu painel principal</li>
                    <li>Clique em "Solicitar Criativo" ou "Nova Solicitação"</li>
                    <li>Preencha o formulário com detalhes sobre o conteúdo desejado:
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li>Tipo de conteúdo (post, story, vídeo, etc.)</li>
                        <li>Redes sociais de destino</li>
                        <li>Data desejada para publicação</li>
                        <li>Tema ou campanha específica</li>
                        <li>Observações e referências</li>
                      </ul>
                    </li>
                    <li>Anexe materiais de referência se necessário</li>
                    <li>Clique em "Enviar Solicitação"</li>
                    <li>A agência receberá sua solicitação e começará a trabalhar no criativo</li>
                    <li>Você será notificado quando o conteúdo estiver pronto para aprovação</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="client-5">
                <AccordionTrigger>Como visualizar histórico de conteúdos</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Acesse a seção "Histórico" ou "Conteúdos Publicados" no menu</li>
                    <li>Use filtros por data, rede social ou status</li>
                    <li>Clique em um conteúdo para ver detalhes completos</li>
                    <li>Visualize métricas de performance quando disponíveis</li>
                    <li>Exporte relatórios se necessário</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <CreateTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        defaultCategory={selectedCategory}
      />

      <AppFooter />
    </div>
  );
};

export default HelpCenter;