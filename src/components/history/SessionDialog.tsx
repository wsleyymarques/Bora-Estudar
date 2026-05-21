import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStudy } from '@/contexts/StudyContext';
import { StudySession } from '@/types/study';
import { Calendar, Clock, BookOpen, FileText, Trophy } from 'lucide-react';
import { toDateKey } from '@/lib/date-utils';
import { toast } from 'sonner';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: StudySession;
  defaultPlanId?: string;
}

export default function SessionDialog({ open, onOpenChange, session, defaultPlanId }: SessionDialogProps) {
  const { data, addSession, updateSession } = useStudy();
  const { plans } = useStudyPlans();

  // If a defaultPlanId is locked in (opened from plan details), lock it
  const isLockedToPlan = Boolean(defaultPlanId);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId || '');
  const [subjectId, setSubjectId] = useState<string>('');
  const [date, setDate] = useState<string>(() => toDateKey(new Date()));
  const [startTime, setStartTime] = useState<string>('12:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [sessionMode, setSessionMode] = useState<'manual' | 'timer' | 'pomodoro'>('manual');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Use the proper hook that queries via study_plan_subjects join table
  const activePlanId = selectedPlanId || undefined;
  const { planSubjects, loading: subjectsLoading } = usePlanSubjects(activePlanId);

  // If no plan selected, fall back to all subjects from context
  const availableSubjects = activePlanId ? planSubjects : data.subjects;

  // Prepopulate form if in edit mode, or reset on open
  useEffect(() => {
    if (!open) return;
    if (session) {
      setSelectedPlanId(session.planId || defaultPlanId || '');
      setSubjectId(session.subjectId);
      setDate(session.date);
      setStartTime(session.startTime || '12:00');
      setDurationMinutes(session.durationMinutes || Math.round((session.actualDurationSeconds || 0) / 60) || 30);
      setSessionMode(session.sessionMode || 'manual');
      setNote(session.note || '');
    } else {
      setSelectedPlanId(defaultPlanId || '');
      setSubjectId('');
      setDate(toDateKey(new Date()));
      const now = new Date();
      setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setDurationMinutes(30);
      setSessionMode('manual');
      setNote('');
    }
  }, [session, open, defaultPlanId]);

  // When plan changes, reset subject selection
  useEffect(() => {
    setSubjectId('');
  }, [selectedPlanId]);

  // Auto-pick first subject when subjects list loads
  useEffect(() => {
    if (availableSubjects.length > 0 && !subjectId) {
      setSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, subjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error('Por favor, selecione uma matéria');
      return;
    }

    setSaving(true);
    const durationSeconds = durationMinutes * 60;

    let endTime = '';
    try {
      const [h, m] = startTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const dObj = new Date();
        dObj.setHours(h);
        dObj.setMinutes(m + durationMinutes);
        endTime = `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`;
      }
    } catch (err) {
      console.error('Error calculating end time', err);
    }

    const planId = selectedPlanId || defaultPlanId || undefined;

    try {
      if (session) {
        await updateSession(session.id, {
          subjectId,
          planId,
          date,
          startTime,
          endTime,
          durationMinutes,
          actualDurationSeconds: durationSeconds,
          clockDurationSeconds: durationSeconds,
          sessionMode,
          note,
        });
        toast.success('Sessão atualizada com sucesso!');
      } else {
        await addSession({
          subjectId,
          planId,
          date,
          startTime,
          endTime,
          durationMinutes,
          actualDurationSeconds: durationSeconds,
          clockDurationSeconds: durationSeconds,
          sessionMode,
          note,
          isFocusSession: true,
          status: 'completed',
          source: 'tracker',
          totalPauseSeconds: 0,
        });
        toast.success('Sessão registrada com sucesso!');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar sessão');
    } finally {
      setSaving(false);
    }
  };

  const activePlans = (plans || []).filter(p => p.status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {session ? 'Editar Sessão de Estudo' : 'Registrar Sessão Manual'}
          </DialogTitle>
          <DialogDescription>
            {session
              ? 'Altere os dados da sua sessão de estudo registrada.'
              : 'Adicione uma sessão de estudo realizada no passado para manter seu histórico atualizado.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Plan Select — hidden when locked to a specific plan */}
          {!isLockedToPlan && (
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Plano
              </Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue placeholder="Selecione um plano (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject Select */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Matéria
            </Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={subjectsLoading}>
              <SelectTrigger id="subject" className="w-full">
                <SelectValue placeholder={subjectsLoading ? 'Carregando...' : 'Selecione uma matéria'} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: (sub as any).color }} />
                      <span>{sub.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data
              </Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Horário
              </Label>
              <Input id="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Duração (minutos)
              </Label>
              <Input id="duration" type="number" min="1" required value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Modo
              </Label>
              <Select value={sessionMode} onValueChange={(val: any) => setSessionMode(val)}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="timer">Timer</SelectItem>
                  <SelectItem value="pomodoro">Pomodoro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Observações
            </Label>
            <Textarea
              id="note"
              placeholder="O que você estudou nesta sessão?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !subjectId}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
