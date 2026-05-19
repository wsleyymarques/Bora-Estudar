import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ScheduleEntryScope = 'single' | 'forward';

interface ScheduleEntryScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: ScheduleEntryScope) => void;
  actionDescription: string;
}

export default function ScheduleEntryScopeDialog({
  open,
  onOpenChange,
  onSelect,
  actionDescription,
}: ScheduleEntryScopeDialogProps) {
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
            className="h-auto w-full justify-start gap-3 py-3"
            onClick={() => {
              onSelect('single');
              onOpenChange(false);
            }}
          >
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Apenas este dia</p>
              <p className="text-xs text-muted-foreground">A alteração vale somente para esta data.</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 py-3"
            onClick={() => {
              onSelect('forward');
              onOpenChange(false);
            }}
          >
            <CalendarDays className="h-5 w-5 shrink-0 text-info" />
            <div className="text-left">
              <p className="text-sm font-medium">Este e os próximos</p>
              <p className="text-xs text-muted-foreground">Aplica a alteração às próximas ocorrências.</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
