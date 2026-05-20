import React, { useState } from 'react';
import { Brain, Pause, Play, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScheduleEntry } from '@/types/study';
import { useTracker } from '@/contexts/TrackerContext';
import { useStudy } from '@/contexts/StudyContext';
import { PomodoroQuickSettings } from '@/components/generic/pomodoro-quick-settings';
import { cn } from '@/lib/utils';

interface ScheduleItemPlayButtonProps {
  entry: ScheduleEntry;
  date: string;
  className?: string;
  size?: 'sm' | 'icon';
}

export function ScheduleItemPlayButton({
  entry,
  date,
  className,
  size = 'icon',
}: ScheduleItemPlayButtonProps) {
  const [pomodoroDialogOpen, setPomodoroDialogOpen] = useState(false);
  const { getSubject } = useStudy();
  const {
    setMode,
    pomodoroSettings,
    setPomodoroSettings,
    getBindingState,
    startWithBinding,
    togglePauseResume,
    isTransitioning,
  } = useTracker();

  const binding = {
    subjectId: entry.subjectId,
    scheduleDate: date,
    scheduleEntryId: entry.id,
    plannedStartTime: entry.startTime,
    plannedMinutes: entry.plannedMinutes,
  };

  const bindingState = getBindingState(binding);
  const isActive = bindingState !== null;
  const isRunning = bindingState === 'running';
  const subject = getSubject(entry.subjectId);

  const handleStart = async (selectedMode: 'stopwatch' | 'pomodoro'): Promise<boolean> => {
    setMode(selectedMode);
    const result = await startWithBinding(binding, { mode: selectedMode });
    if (result.ok) return true;

    if (result.status === 'conflict') {
      const shouldSwitch = window.confirm(
        'Ja existe uma sessao ativa em outra materia. Deseja encerrar a atual e iniciar esta?',
      );
      if (!shouldSwitch) return false;
      const forced = await startWithBinding(binding, { mode: selectedMode, forceSwitch: true });
      if (!forced.ok) {
        toast.error('Nao foi possivel iniciar esta sessao agora.');
        return false;
      }
      return true;
    }

    return false;
  };



  if (isActive) {
    return (
      <Button
        variant={isRunning ? 'default' : 'outline'}
        size={size}
        className={cn(
          'h-7 w-7 rounded-md',
          isRunning ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
          className,
        )}
        onClick={(event) => {
          event.stopPropagation();
          togglePauseResume();
        }}
        disabled={isTransitioning}
        title={isRunning ? 'Pausar sessao' : 'Retomar sessao'}
        aria-label={isRunning ? 'Pausar sessao' : 'Retomar sessao'}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>
    );
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn('h-7 w-7 rounded-md', className)}
            disabled={isTransitioning}
            title="Escolher modo de inicio"
            aria-label="Escolher modo de inicio"
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[185px]">
          <DropdownMenuItem
            role="menuitem"
            aria-label="Iniciar cronometro"
            className="flex items-center gap-2 text-xs cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              void handleStart('stopwatch');
            }}
          >
            <Timer className="w-4 h-4" />
            Iniciar cronometro
          </DropdownMenuItem>
          <DropdownMenuItem
            role="menuitem"
            aria-label="Pomodoro (editar e iniciar)"
            className="flex items-center gap-2 text-xs cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              setMode('pomodoro');
              setPomodoroDialogOpen(true);
            }}
          >
            <Brain className="w-4 h-4" />
            Pomodoro (editar e iniciar)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pomodoroDialogOpen}
        onOpenChange={(open) => {
          setPomodoroDialogOpen(open);
        }}
      >
        <DialogContent
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="max-w-[96vw] sm:max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>Configurar Pomodoro</DialogTitle>
            <DialogDescription>
              Ajuste foco e pausas para {subject?.name || 'esta materia'} antes de iniciar.
            </DialogDescription>
          </DialogHeader>

          <PomodoroQuickSettings
            settings={pomodoroSettings}
            onChange={setPomodoroSettings}
            compact
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPomodoroDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                void (async () => {
                  const started = await handleStart('pomodoro');
                  if (started) {
                    setPomodoroDialogOpen(false);
                  }
                })();
              }}
              disabled={isTransitioning}
            >
              Iniciar pomodoro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
