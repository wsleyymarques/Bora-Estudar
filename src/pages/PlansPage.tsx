import React, { useState } from 'react';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function PlansPage() {
  const { plans, createPlan } = useStudyPlans();
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name) return;
    const plan = await createPlan({ name });
    if (plan) navigate(`/plans/${plan.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do Plano de Estudos" />
        <Button onClick={handleCreate}>Criar</Button>
      </div>

      <div className="grid gap-3">
        {plans.map((plan) => (
          <div key={plan.id} className="p-4 border rounded cursor-pointer" onClick={() => navigate(`/plans/${plan.id}`)}>
            <h2 className="font-semibold">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">{plan.exam_name || 'Sem descrição'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
