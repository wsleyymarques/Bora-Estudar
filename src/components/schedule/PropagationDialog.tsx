import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Repeat } from 'lucide-react';

export type PropagationScope = 'single' | 'forward' | 'template';

interface PropagationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: PropagationScope) => void;
  actionDescription: string;
}

export default function PropagationDialog({ open, onOpenChange, onSelect, actionDescription }: PropagationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Aplicar alteração</DialogTitle>
          <DialogDescription>{actionDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => { onSelect('single'); onOpenChange(false); }}
          >
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Somente este dia</p>
              <p className="text-xs text-muted-foreground">A alteração vale apenas para esta data</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => { onSelect('forward'); onOpenChange(false); }}
          >
            <CalendarDays className="w-5 h-5 text-info flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Deste dia em diante</p>
              <p className="text-xs text-muted-foreground">Aplica para todas as semanas futuras</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => { onSelect('template'); onOpenChange(false); }}
          >
            <Repeat className="w-5 h-5 text-accent flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Atualizar o template</p>
              <p className="text-xs text-muted-foreground">Altera o template base para o futuro</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
