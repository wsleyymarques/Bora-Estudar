import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Pencil, Plus, Trash2, Archive, FolderOpen } from 'lucide-react';
import { useStudy, ScheduleCreateInput } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EMPTY_FORM: ScheduleCreateInput = {
  name: '',
  description: '',
  color: '#5B8C7E',
  status: 'active',
  startDate: new Date().toISOString().slice(0, 10),
};

export default function SchedulesPage() {
  const { data, activeScheduleId, createSchedule, updateSchedule, deleteSchedule, archiveSchedule, setActiveSchedule } = useStudy();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleCreateInput>(EMPTY_FORM);

  const activeCount = useMemo(
    () => data.schedules.filter((schedule) => schedule.status === 'active').length,
    [data.schedules],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, color: '#5B8C7E' });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const schedule = data.schedules.find((entry) => entry.id === id);
    if (!schedule) return;
    setEditingId(id);
    setForm({
      name: schedule.name,
      description: schedule.description,
      color: schedule.color || '#5B8C7E',
      status: schedule.status,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      isActive: schedule.isActive,
      viewSettings: schedule.viewSettings,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error('Informe o nome do cronograma');
      return;
    }

    if (editingId) {
      await updateSchedule(editingId, form);
      toast.success('Cronograma atualizado');
    } else {
      const createdId = await createSchedule(form);
      if (createdId) {
        toast.success('Cronograma criado');
      }
    }

    setFormOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="workspace-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Cronogramas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.schedules.length} cronogramas, {activeCount} ativos.
            </p>
          </div>
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Novo cronograma
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {data.schedules.map((schedule) => (
          <div key={schedule.id} className="workspace-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: schedule.color || 'hsl(var(--primary))' }} />
                  <p className="truncate text-base font-semibold text-foreground">{schedule.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inicio {new Date(`${schedule.startDate}T12:00:00`).toLocaleDateString('pt-BR')}
                  {schedule.endDate ? ` - fim ${new Date(`${schedule.endDate}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
                </p>
                {schedule.description ? (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{schedule.description}</p>
                ) : null}
              </div>
              {schedule.id === activeScheduleId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ativo
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setActiveSchedule(schedule.id)}
                disabled={schedule.id === activeScheduleId}
              >
                <FolderOpen className="mr-1.5 h-4 w-4" />
                Usar cronograma
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(schedule.id)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => archiveSchedule(schedule.id)}>
                <Archive className="mr-1.5 h-4 w-4" />
                Arquivar
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg text-destructive" onClick={() => deleteSchedule(schedule.id)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Editar cronograma' : 'Novo cronograma'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Descricao</Label>
              <Textarea
                value={form.description || ''}
                rows={3}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={form.color || '#5B8C7E'}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Inicio</Label>
                <Input
                  type="date"
                  value={form.startDate || ''}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={form.endDate || ''}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value || undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status || 'active'}
                  onValueChange={(nextStatus) => setForm({ ...form, status: nextStatus as ScheduleCreateInput['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="mt-5 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={Boolean(form.isActive)}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                Definir como cronograma ativo
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                <CalendarDays className="mr-1.5 h-4 w-4" />
                {editingId ? 'Salvar' : 'Criar cronograma'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
