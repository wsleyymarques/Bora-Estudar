import React, { useMemo, useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SUBJECT_COLORS } from '@/types/study';

interface PlanSubjectsPanelProps {
  planId: string;
}

export function PlanSubjectsPanel({ planId }: PlanSubjectsPanelProps) {
  const { data, createSubject, deleteSubject } = useStudy();
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const subjects = useMemo(
    () => data.subjects.filter((subject) => subject.planId === planId),
    [data.subjects, planId],
  );

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSubject({ name: name.trim(), color, planId });
    setName('');
    setColor(SUBJECT_COLORS[0]);
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Matérias do Plano de Estudos</h2>
        <p className="text-sm text-muted-foreground">Crie matérias exclusivas para este plano.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da matéria" />
        <Input value={color} onChange={(event) => setColor(event.target.value)} placeholder="#5B8C7E" />
        <Button onClick={handleCreate}>Adicionar</Button>
      </div>

      <div className="grid gap-2">
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma matéria criada para este plano.</p>
        ) : null}
        {subjects.map((subject) => (
          <div key={subject.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
              <div>
                <p className="font-medium">{subject.name}</p>
                <p className="text-xs text-muted-foreground">Meta semanal: {subject.weeklyGoalHours || 0}h</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => deleteSubject(subject.id)}>Excluir</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
