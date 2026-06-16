import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfUsePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="glass-card p-8 sm:p-12 prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-display font-black mb-2">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

          <p>
            Estes Termos de Uso ("Termos") regulam o acesso e o uso da plataforma <strong>Bora-Estudar</strong> ("Plataforma" ou "Serviço"). 
            Ao acessar ou usar a Plataforma, você ("Usuário") concorda com estes Termos em sua totalidade.
          </p>

          <h2>1. O Serviço</h2>
          <p>
            O Bora-Estudar é uma plataforma digital que auxilia os usuários no planejamento, controle e acompanhamento de rotinas de estudo,
            fornecendo recursos como cronogramas automáticos, cronômetro, modo pomodoro e dashboard de métricas. O Serviço é fornecido "no estado
            em que se encontra" (as is), sem garantias implícitas de adequação a um fim específico.
          </p>

          <h2>2. Cadastro e Segurança da Conta</h2>
          <ul>
            <li>Para utilizar o Serviço, é necessário criar uma conta informando dados válidos e precisos.</li>
            <li>Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrerem sob a sua conta.</li>
            <li>O Bora-Estudar não se responsabiliza por perdas causadas pelo uso não autorizado de sua conta.</li>
          </ul>

          <h2>3. Regras de Conduta</h2>
          <p>Ao utilizar o Bora-Estudar, o Usuário concorda em <strong>não</strong>:</p>
          <ul>
            <li>Utilizar o Serviço para qualquer fim ilegal, fraudulento ou não autorizado.</li>
            <li>Realizar engenharia reversa, descompilar, copiar ou tentar extrair o código-fonte da Plataforma.</li>
            <li>Sobrecarregar a infraestrutura do Serviço com envios automatizados (bots, scrapers).</li>
            <li>Inserir dados maliciosos, vírus ou código que possa prejudicar o funcionamento da Plataforma.</li>
          </ul>

          <h2>4. Propriedade Intelectual</h2>
          <p>
            Todos os direitos de propriedade intelectual da Plataforma, incluindo, mas não se limitando a software, design, logos, textos e 
            gráficos, são de propriedade exclusiva do Bora-Estudar. O acesso ao Serviço não lhe confere nenhum direito de propriedade sobre a Plataforma.
          </p>

          <h2>5. Isenção de Garantias e Responsabilidade</h2>
          <p>
            Embora trabalhemos continuamente para manter a plataforma segura e funcional, não garantimos que o Serviço estará disponível de forma 
            ininterrupta ou livre de erros. O Bora-Estudar não será responsável por perdas de dados de cronogramas, falhas no acompanhamento de tempo, 
            lucros cessantes ou danos indiretos resultantes do uso ou da incapacidade de usar o Serviço.
          </p>

          <h2>6. Suspensão e Encerramento</h2>
          <p>
            Podemos suspender ou encerrar a sua conta a qualquer momento, com ou sem aviso prévio, caso seja identificado o descumprimento destes 
            Termos de Uso ou o uso indevido da plataforma. Você também pode excluir sua conta a qualquer momento nas configurações do seu perfil.
          </p>

          <h2>7. Alterações nestes Termos</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Quando fizermos alterações materiais, notificaremos você através de um aviso na plataforma 
            ou pelo e-mail cadastrado. O uso contínuo do Serviço após a atualização constitui a sua aceitação dos novos Termos.
          </p>

          <h2>8. Contato</h2>
          <p>
            Para esclarecer quaisquer dúvidas sobre estes Termos de Uso, entre em contato através do e-mail: <strong>suporte@bora-estudar.com.br</strong> <em>(substituir pelo e-mail oficial)</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
