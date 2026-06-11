import React, { useEffect, useState } from 'react';
import { Maximize2, Pause, Play, Settings2, SkipForward, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTracker } from '@/contexts/TrackerContext';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClockTimePickerField } from '@/components/generic/time-picker-fields';
import { PomodoroQuickSettings } from '@/components/generic/pomodoro-quick-settings';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CompactTimerPlayerProps {
  variant?: 'floating' | 'embedded';
  className?: string;
  showWhenIdle?: boolean;
}

export function CompactTimerPlayer({
  variant = 'floating',
  className,
  showWhenIdle = false,
}: CompactTimerPlayerProps) {
  const [showPomodoroConfig, setShowPomodoroConfig] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getSubject } = useStudy();
  const {
    runtime,
    mode,
    setMode,
    pomodoroSettings,
    setPomodoroSettings,
    isRunning,
    displayTimeLabel,
    secondaryTimeLabel,
    phaseLabel,
    phaseStateLabel,
    activeStartTime,
    setActiveStartTime,
    togglePauseResume,
    finishActive,
    skipCurrentBreak,
    isTransitioning,
    setIsMaximized,
  } = useTracker();
  const selectedMode = runtime?.kind || mode;

  useEffect(() => {
    if (runtime) {
      setShowPomodoroConfig(false);
      return;
    }
    setShowPomodoroConfig(selectedMode === 'pomodoro');
  }, [runtime, selectedMode]);

  if (!runtime && !showWhenIdle) return null;

  const subject = runtime ? getSubject(runtime.subjectId) : undefined;
  const modeLabel = selectedMode === 'pomodoro' ? 'Pomodoro' : 'Cronometro';
  const isFloating = variant === 'floating';
  const isPomodoroSelected = selectedMode === 'pomodoro';
  const usesInlineDesktopLayout = !isFloating;
  const pomodoroConfigDisabled = Boolean(runtime);
  const pomodoroCycle =
    runtime?.kind === 'pomodoro'
      ? `Ciclo ${Math.max(1, runtime.completedFocusSessions + 1)}`
      : null;

  const renderPlayerContent = (isInsideDrawer = false) => (
    <div
      className={cn(
        'workspace-panel p-2.5 md:p-3 flex flex-col gap-2',
        !isInsideDrawer && 'shadow-[0_12px_34px_hsl(var(--foreground)/0.18)]',
        isInsideDrawer && 'shadow-none border-none bg-transparent px-0 pt-0',
        usesInlineDesktopLayout && 'xl:flex-row xl:items-center',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', isRunning ? 'bg-success animate-pulse' : 'bg-warning')} />
          <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-semibold truncate">
            {runtime ? `${modeLabel} - ${phaseStateLabel}` : 'Timer rapido inativo'}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground truncate mt-1">
          {subject?.name || 'Selecione o modo e use play em uma materia'}
        </p>
        {runtime ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            {runtime.kind === 'pomodoro' && phaseLabel ? <span>{phaseLabel}</span> : null}
            {runtime.kind === 'pomodoro' && pomodoroCycle ? <span>{pomodoroCycle}</span> : null}
            <span className="font-semibold text-foreground">{displayTimeLabel}</span>
            {secondaryTimeLabel ? <span>{secondaryTimeLabel}</span> : null}
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setMode('stopwatch')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                  mode === 'stopwatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Cronometro
              </button>
              <button
                type="button"
                onClick={() => setMode('pomodoro')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                  mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Pomodoro
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Modo ativo para iniciar pelas materias: <span className="text-foreground font-medium">{modeLabel}</span>
            </p>
          </div>
        )}

        {isPomodoroSelected && (
          <Collapsible open={showPomodoroConfig} onOpenChange={setShowPomodoroConfig}>
            <div className="mt-2 space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  {showPomodoroConfig ? 'Ocultar ajustes Pomodoro' : 'Ajustes Pomodoro'}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <PomodoroQuickSettings
                  settings={pomodoroSettings}
                  onChange={setPomodoroSettings}
                  compact
                  disabled={pomodoroConfigDisabled}
                  className="mt-1"
                />
                {pomodoroConfigDisabled && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ajustes do Pomodoro ficam editaveis quando nao houver sessao ativa.
                  </p>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>

      <div className={cn('flex w-full items-end gap-2 flex-wrap', usesInlineDesktopLayout && 'xl:w-auto xl:justify-end')}>
        {runtime?.kind === 'stopwatch' && (
          <div className={cn('flex-1 min-w-[160px]', usesInlineDesktopLayout && 'xl:min-w-[185px]')}>
            <p
              className={cn(
                'text-[10px] uppercase tracking-[0.11em] text-muted-foreground font-semibold mb-1 leading-none',
                usesInlineDesktopLayout && 'xl:sr-only',
              )}
            >
              Inicio da sessao
            </p>
            <ClockTimePickerField
              value={activeStartTime}
              onChange={setActiveStartTime}
              placeholder="--:--"
              className={cn('h-8 px-2.5 text-xs w-full min-w-0', usesInlineDesktopLayout && 'xl:min-w-[165px]')}
            />
          </div>
        )}

        <div className={cn('ml-auto flex items-center gap-1 shrink-0')}>
          {runtime && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isTransitioning}
                onClick={togglePauseResume}
                title={isRunning ? 'Pausar' : 'Retomar'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>

              {runtime.kind === 'pomodoro' && runtime.phase !== 'focus' && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isTransitioning}
                  onClick={() => void skipCurrentBreak()}
                  title="Pular pausa"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isTransitioning}
                onClick={() => void finishActive('completed')}
                title="Finalizar"
              >
                <Square className="w-4 h-4" />
              </Button>
            </>
          )}

          {isFloating && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (isDrawerOpen) setIsDrawerOpen(false);
                setIsMaximized(true);
              }}
              title={runtime ? 'Expandir' : 'Abrir timer'}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Behavior for Mobile + Floating (Drawer)
  if (isMobile && isFloating) {
    return (
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <div className={cn('fixed left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40', className)}>
          <DrawerTrigger asChild>
            <div
              role="button"
              className="workspace-panel p-3 flex items-center gap-3 shadow-[0_12px_34px_hsl(var(--foreground)/0.18)] rounded-xl cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', isRunning ? 'bg-success animate-pulse' : 'bg-warning')} />
                  <p className="text-[10px] uppercase tracking-[0.11em] text-muted-foreground font-semibold truncate">
                    {runtime ? `${modeLabel} - ${phaseStateLabel}` : 'Timer rapido'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                  {subject?.name || 'Selecione uma materia'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {runtime && (
                  <span className="font-semibold text-sm tabular-nums text-foreground">
                    {displayTimeLabel}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  disabled={isTransitioning}
                  onClick={(e) => {
                    if (runtime || (!runtime && mode)) {
                      e.stopPropagation(); // prevent opening drawer when clicking play/pause directly
                      if (runtime) {
                        togglePauseResume();
                      } else {
                        // Let it open drawer if not running
                        setIsDrawerOpen(true);
                      }
                    }
                  }}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </Button>
              </div>
            </div>
          </DrawerTrigger>
        </div>

        <DrawerContent className="p-4 pb-8 bg-background border-t">
          <DrawerTitle className="sr-only">Controles do Timer</DrawerTitle>
          {renderPlayerContent(true)}
        </DrawerContent>
      </Drawer>
    );
  }

  // Behavior for Desktop or Embedded
  return (
    <div
      className={cn(
        isFloating ? 'fixed right-4 bottom-4 z-40 w-[340px]' : 'w-full',
        className,
      )}
    >
      {renderPlayerContent(false)}
    </div>
  );
}
