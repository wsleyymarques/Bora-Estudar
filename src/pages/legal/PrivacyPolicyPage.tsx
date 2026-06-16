import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="glass-card p-8 sm:p-12 prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-display font-black mb-2">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <p>
            Bem-vindo ao <strong>Bora-Estudar</strong>. A sua privacidade é muito importante para nós. Esta Política de
            Privacidade descreve como coletamos, usamos, armazenamos e protegemos os seus dados pessoais, em
            conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>

          <h2>1. Dados que Coletamos</h2>
          <p>Podemos coletar os seguintes dados pessoais fornecidos diretamente por você ou gerados pelo seu uso da plataforma:</p>
          <ul>
            <li><strong>Dados de Cadastro:</strong> Nome, endereço de e-mail e senha (criptografada).</li>
            <li><strong>Dados de Perfil e Estudo:</strong> Seu objetivo de estudo, metas semanais, planos criados, matérias e cronogramas.</li>
            <li><strong>Dados de Uso e Desempenho:</strong> Tempo gasto no aplicativo, sessões do cronômetro/pomodoro, interações com a interface e estatísticas de progresso.</li>
            <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional e identificadores de dispositivo, coletados automaticamente para fins de segurança e melhoria do serviço.</li>
          </ul>

          <h2>2. Como Usamos os Seus Dados</h2>
          <p>Utilizamos seus dados para as seguintes finalidades (base legal aplicável):</p>
          <ul>
            <li><strong>Fornecimento do Serviço (Execução de Contrato):</strong> Criar sua conta, salvar seus cronogramas, registrar o tempo de estudo e gerar suas estatísticas.</li>
            <li><strong>Melhoria Contínua (Legítimo Interesse):</strong> Analisar o comportamento no aplicativo para corrigir bugs, desenvolver novos recursos e melhorar a interface.</li>
            <li><strong>Comunicações (Consentimento/Legítimo Interesse):</strong> Enviar avisos sobre a plataforma, atualizações do serviço ou comunicações promocionais (das quais você pode cancelar a assinatura a qualquer momento).</li>
            <li><strong>Segurança e Cumprimento Legal (Obrigação Legal):</strong> Prevenir fraudes, garantir a segurança dos nossos sistemas e cumprir ordens judiciais.</li>
          </ul>

          <h2>3. Compartilhamento de Dados</h2>
          <p>O Bora-Estudar não vende os seus dados pessoais. Podemos compartilhar suas informações estritamente com os seguintes tipos de prestadores de serviços, que também devem respeitar a LGPD:</p>
          <ul>
            <li><strong>Serviços de Hospedagem e Nuvem:</strong> Para armazenar seu banco de dados de forma segura (ex: provedores de nuvem).</li>
            <li><strong>Ferramentas de Análise:</strong> Para monitorar métricas de uso gerais e anônimas (ex: Google Analytics).</li>
            <li><strong>Serviços de Comunicação:</strong> Ferramentas utilizadas para enviar e-mails transacionais (como recuperação de senha).</li>
          </ul>

          <h2>4. Armazenamento e Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado,
            alteração, divulgação ou destruição acidental. Os dados são armazenados em servidores seguros, e exigimos
            boas práticas de segurança de nossos parceiros de tecnologia.
          </p>

          <h2>5. Retenção dos Dados</h2>
          <p>
            Reteremos os seus dados enquanto a sua conta estiver ativa ou conforme necessário para lhe fornecer os
            serviços. Caso decida excluir a sua conta, os seus dados pessoais serão removidos dos nossos bancos de
            dados ativos, exceto quando houver uma obrigação legal para retê-los.
          </p>

          <h2>6. Os Seus Direitos (Art. 18 da LGPD)</h2>
          <p>Você tem o direito de:</p>
          <ul>
            <li>Confirmar a existência de tratamento de dados.</li>
            <li>Acessar os seus dados pessoais.</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Solicitar a portabilidade dos dados.</li>
            <li>Revogar o seu consentimento a qualquer momento.</li>
          </ul>
          <p>
            Você pode exercer esses direitos diretamente no painel de configurações da sua conta ou entrando em
            contato conosco.
          </p>

          <h2>7. Cookies e Tecnologias Semelhantes</h2>
          <p>
            Utilizamos cookies para manter sua sessão ativa, lembrar suas preferências de tema (claro/escuro) e entender
            como você navega no site. Você pode gerenciar suas preferências de cookies no nosso banner de consentimento
            ou através do seu navegador.
          </p>

          <h2>8. Contato</h2>
          <p>
            Se tiver dúvidas ou quiser exercer os seus direitos em relação à proteção de dados, entre em contato conosco
            através do e-mail: <strong>privacidade@bora-estudar.com.br</strong> <em>(substituir pelo e-mail oficial)</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
