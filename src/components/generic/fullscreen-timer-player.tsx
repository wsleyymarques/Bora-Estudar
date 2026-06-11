import React from 'react';
import { Pause, Play, SkipForward, Square, Minimize2, Brain, Coffee } from 'lucide-react';
import { useTracker } from '@/contexts/TrackerContext';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FullscreenTimerPlayer() {
  const {
    runtime,
    isMaximized,
    setIsMaximized,
    displayTimeLabel,
    secondaryTimeLabel,
    phaseLabel,
    phaseStateLabel,
    isRunning,
    isTransitioning,
    togglePauseResume,
    finishActive,
    skipCurrentBreak,
  } = useTracker();
  const { getSubject } = useStudy();

  if (!runtime || !isMaximized) return null;

  const subject = getSubject(runtime.subjectId);
  const isPomodoro = runtime.kind === 'pomodoro';
  const isStopwatch = runtime.kind === 'stopwatch';

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject?.color || 'hsl(var(--primary))' }} />
          <h2 className="text-xl font-semibold text-foreground tracking-tight">{subject?.name || 'Sessão Ativa'}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={() => setIsMaximized(false)}
          title="Minimizar"
        >
          <Minimize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content (Center) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="space-y-4">
          {isPomodoro && (
            <div className="flex items-center justify-center gap-2">
              {runtime.phase === 'focus' ? (
                <Brain className="w-6 h-6 text-primary" />
              ) : (
                <Coffee className="w-6 h-6 text-accent" />
              )}
              <p className="text-sm md:text-base uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                {phaseLabel}
              </p>
            </div>
          )}
          {isStopwatch && (
            <p className="text-sm md:text-base uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              Cronômetro
            </p>
          )}

          <p className="text-[22vw] md:text-[15rem] leading-none font-display font-bold text-foreground tabular-nums tracking-tighter">
            {displayTimeLabel}
          </p>

          <p className="text-lg md:text-xl font-medium text-muted-foreground">
            Estado: <strong className="text-foreground">{phaseStateLabel}</strong>
            {secondaryTimeLabel && <span className="ml-2">({secondaryTimeLabel})</span>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 pt-8">
          <Button
            variant="default"
            size="lg"
            className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-lg"
            onClick={togglePauseResume}
            disabled={isTransitioning}
            title={isRunning ? 'Pausar' : 'Retomar'}
          >
            {isRunning ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-2" />}
          </Button>

          {isPomodoro && runtime.phase !== 'focus' && (
            <Button
              variant="outline"
              size="lg"
              className="w-16 h-16 md:w-20 md:h-20 rounded-full"
              onClick={() => void skipCurrentBreak()}
              disabled={isTransitioning}
              title="Pular pausa"
            >
              <SkipForward className="w-7 h-7 md:w-8 md:h-8" />
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full"
            onClick={() => void finishActive(isStopwatch ? 'completed' : 'abandoned')}
            disabled={isTransitioning}
            title="Finalizar"
          >
            <Square className="w-7 h-7 md:w-8 md:h-8" />
          </Button>
        </div>
      </div>
      
      {/* Footer / Extra info if needed */}
      <div className="p-6 text-center">
        {isPomodoro && runtime.completedFocusSessions !== undefined && (
          <p className="text-sm text-muted-foreground font-medium">
            Sessões de Foco Concluídas: <strong className="text-foreground">{runtime.completedFocusSessions}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
