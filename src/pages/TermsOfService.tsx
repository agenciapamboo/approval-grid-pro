import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
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
          <h1 className="text-3xl font-bold">Termos de Uso</h1>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6 text-foreground/90">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e usar o Aprova Criativos ("Plataforma", "Serviço"), você concorda em cumprir
                e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com
                qualquer parte destes termos, não deverá usar nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">2. Descrição do Serviço</h2>
              <p className="mb-2">
                O Aprova Criativos é uma plataforma profissional de gestão e aprovação de conteúdos criativos
                que oferece:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sistema de aprovação de conteúdos para agências e clientes</li>
                <li>Gerenciamento de calendário de publicações</li>
                <li>Integração com redes sociais (Facebook e Instagram)</li>
                <li>Workflow de solicitação e aprovação de ajustes</li>
                <li>Notificações e comunicação entre equipes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">3. Elegibilidade e Registro</h2>
              <p className="mb-2">Para usar este serviço, você deve:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Fornecer informações verdadeiras, precisas e completas durante o registro</li>
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Ser responsável por todas as atividades que ocorram sob sua conta</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">4. Tipos de Usuários</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">4.1 Agências</h3>
                  <p className="text-sm">
                    Usuários que representam agências de marketing e publicidade, responsáveis por criar
                    e submeter conteúdos para aprovação de clientes.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">4.2 Clientes</h3>
                  <p className="text-sm">
                    Usuários que representam empresas contratantes, responsáveis por revisar e aprovar
                    conteúdos criados pelas agências.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">5. Uso Aceitável</h2>
              <p className="mb-2">Você concorda em NÃO:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Usar o serviço para qualquer finalidade ilegal ou não autorizada</li>
                <li>Violar quaisquer leis em sua jurisdição</li>
                <li>Upload de conteúdo ofensivo, difamatório, ou que viole direitos de terceiros</li>
                <li>Tentar obter acesso não autorizado a sistemas ou dados</li>
                <li>Interferir ou interromper o funcionamento do serviço</li>
                <li>Fazer engenharia reversa ou tentar extrair o código-fonte da plataforma</li>
                <li>Usar bots, scrapers ou ferramentas automatizadas sem autorização</li>
                <li>Revender ou redistribuir o serviço sem permissão expressa</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">6. Propriedade Intelectual</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">6.1 Conteúdo do Usuário</h3>
                  <p className="text-sm">
                    Você mantém todos os direitos sobre o conteúdo que carrega na plataforma. Ao fazer
                    upload de conteúdo, você nos concede uma licença não exclusiva, mundial e livre de
                    royalties para armazenar, processar e exibir esse conteúdo exclusivamente para
                    fornecer o serviço.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">6.2 Conteúdo da Plataforma</h3>
                  <p className="text-sm">
                    A plataforma, incluindo seu design, código, marca e funcionalidades, é de nossa
                    propriedade exclusiva e está protegida por leis de direitos autorais e propriedade
                    intelectual.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">7. Integração com Redes Sociais</h2>
              <p className="mb-2">
                Ao conectar suas contas de redes sociais (Facebook, Instagram):
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Você nos autoriza a publicar conteúdo aprovado em seu nome</li>
                <li>Você é responsável por garantir que tem as permissões necessárias</li>
                <li>Você concorda em cumprir os termos de serviço das respectivas plataformas</li>
                <li>Você pode revogar o acesso a qualquer momento através das configurações</li>
                <li>Não somos responsáveis por mudanças nas APIs ou políticas das redes sociais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">8. Privacidade e Proteção de Dados</h2>
              <p>
                Seu uso da plataforma também é regido por nossa Política de Privacidade. Estamos
                comprometidos com a proteção de seus dados pessoais em conformidade com a LGPD
                (Lei Geral de Proteção de Dados - Lei nº 13.709/2018). Consulte nossa Política de
                Privacidade para mais detalhes sobre como coletamos, usamos e protegemos suas informações.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">9. Disponibilidade do Serviço</h2>
              <p className="mb-2">
                Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Que o serviço estará sempre disponível, ininterrupto ou livre de erros</li>
                <li>Que defeitos serão corrigidos em um prazo específico</li>
                <li>Que o serviço atenderá a todas as suas necessidades específicas</li>
              </ul>
              <p className="mt-2 text-sm">
                Reservamo-nos o direito de modificar, suspender ou descontinuar o serviço (ou qualquer
                parte dele) temporária ou permanentemente, com ou sem aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">10. Limitação de Responsabilidade</h2>
              <p className="mb-2">
                Na máxima extensão permitida por lei, não seremos responsáveis por:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Perda de dados, lucros ou receitas</li>
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Conteúdo criado ou publicado por usuários</li>
                <li>Falhas em publicações devido a problemas nas APIs de redes sociais</li>
                <li>Ações ou omissões de terceiros</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">11. Indenização</h2>
              <p>
                Você concorda em indenizar, defender e isentar nossa empresa, seus diretores, funcionários
                e parceiros de todas as reivindicações, responsabilidades, danos, perdas e despesas
                (incluindo honorários advocatícios) resultantes de ou relacionados ao seu uso do serviço
                ou violação destes termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">12. Rescisão</h2>
              <div className="space-y-2">
                <p>
                  <strong>Por sua parte:</strong> Você pode encerrar sua conta a qualquer momento através
                  das configurações da plataforma ou entrando em contato conosco.
                </p>
                <p>
                  <strong>Por nossa parte:</strong> Podemos suspender ou encerrar sua conta imediatamente,
                  sem aviso prévio, se você violar estes termos ou se considerarmos que seu uso representa
                  risco para nós ou para outros usuários.
                </p>
                <p className="text-sm text-muted-foreground">
                  Após o encerramento, você perderá acesso à sua conta e a todo o conteúdo associado.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">13. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Quando fizermos
                alterações significativas, notificaremos você por e-mail ou através de um aviso na
                plataforma. Seu uso continuado do serviço após tais modificações constitui sua aceitação
                dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">14. Lei Aplicável e Jurisdição</h2>
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
                relacionada a estes termos ou ao uso do serviço será submetida à jurisdição exclusiva
                dos tribunais brasileiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">15. Disposições Gerais</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Totalidade do Acordo:</strong> Estes termos constituem o acordo completo entre
                  você e nós em relação ao uso do serviço.
                </li>
                <li>
                  <strong>Renúncia:</strong> Nossa falha em exercer qualquer direito não constitui renúncia
                  a esse direito.
                </li>
                <li>
                  <strong>Divisibilidade:</strong> Se qualquer disposição destes termos for considerada
                  inválida, as demais disposições permanecerão em pleno vigor.
                </li>
                <li>
                  <strong>Cessão:</strong> Você não pode transferir seus direitos ou obrigações sob estes
                  termos sem nosso consentimento prévio por escrito.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-foreground">16. Contato</h2>
              <p>
                Para dúvidas sobre estes Termos de Uso, entre em contato através do e-mail de suporte
                fornecido nas configurações da sua conta ou através da plataforma.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ao usar o Aprova Criativos, você reconhece que leu, compreendeu e concorda em estar
                vinculado a estes Termos de Uso.
              </p>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default TermsOfService;