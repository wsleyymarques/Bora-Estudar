import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';

export default function PlanDetailsPage() {
  const { planId } = useParams();
  const { plans } = useStudyPlans();
  const plan = plans.find((item) => item.id === planId);

  if (!plan) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Plano de Estudos não encontrado ou ainda carregando.</p>
        <Button asChild variant="outline"><Link to="/plans">Voltar para planos</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="workspace-panel p-5">
        <p className="text-sm text-muted-foreground">Plano de Estudos</p>
        <h1 className="text-2xl font-display font-bold">{plan.name}</h1>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span>Concurso: {plan.exam_name || '-'}</span>
          <span>Banca: {plan.board_name || '-'}</span>
          <span>Cargo: {plan.role_name || '-'}</span>
        </div>
        {plan.description ? <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {['Visão geral', 'Matérias', 'Modelo semanal', 'Cronograma', 'Revisões', 'Estatísticas'].map((label) => (
          <div key={label} className="rounded-xl border bg-card p-4 text-sm font-medium">
            {label}
            <p className="mt-1 text-xs font-normal text-muted-foreground">Em construção nesta entrega base.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
