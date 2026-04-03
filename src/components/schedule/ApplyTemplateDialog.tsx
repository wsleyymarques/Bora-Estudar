import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useStudy } from '@/contexts/StudyContext';
import { toast } from 'sonner';

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
}

const PERIODS = [
  { value: '1', label: '1 mês' },
  { value: '2', label: '2 meses' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '1 ano' },
];

export default function ApplyTemplateDialog({ open, onOpenChange, templateId, templateName }: ApplyTemplateDialogProps) {
  const [period, setPeriod] = useState('1');
  const [startDate, setStartDate] = useState(() => {
    // Default to next Monday
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
    return d.toISOString().split('T')[0];
  });
  const [applying, setApplying] = useState(false);

  const { applyTemplate } = useTemplates();
  const { refreshData } = useStudy();

  const handleApply = async () => {
    setApplying(true);
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(period));
    end.setDate(end.getDate() - 1);

    await applyTemplate(templateId, start, end, refreshData);
    setApplying(false);
    onOpenChange(false);
  };

  const endDateStr = (() => {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(period));
    end.setDate(end.getDate() - 1);
    return end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Aplicar Template
          </DialogTitle>
          <DialogDescription>
            Gerar cronograma automático a partir de "{templateName}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Data de início</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>O cronograma será gerado de <strong className="text-foreground">{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</strong> até <strong className="text-foreground">{endDateStr}</strong>.</p>
            <p className="mt-1.5 text-xs">As matérias do template serão repetidas automaticamente em cada semana do período.</p>
          </div>

          <Button onClick={handleApply} className="w-full" disabled={applying}>
            {applying ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando...
              </span>
            ) : (
              'Gerar Cronograma'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
