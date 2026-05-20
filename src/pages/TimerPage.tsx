import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Brain, Coffee, Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PomodoroQuickSettings } from '@/components/generic/pomodoro-quick-settings';
import { ClockTimePickerField } from '@/components/generic/time-picker-fields';
import { useStudy } from '@/contexts/StudyContext';
import { useTracker } from '@/contexts/TrackerContext';
import {
  getSessionActualMinutes,
  getSessionDateKey,
  getSessionEndLabel,
  getSessionPauseSeconds,
  getSessionStartLabel,
} from '@/features/tracker/session-metrics';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { toDateKey } from '@/lib/date-utils';

function clockFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function TimerPage() {
  const { data, getSubject } = useStudy();
  const {
    runtime,
    mode,
    setMode,
    isRunning,
    isTransitioning,
    pomodoroSettings,
    setPomodoroSettings,
    displayTimeLabel,
    secondaryTimeLabel,
    phaseLabel,
    phaseStateLabel,
    startWithBinding,
    togglePauseResume,
    finishActive,
    skipCurrentBreak,
    clearRuntime,
    activeStartTime,
    setActiveStartTime,
  } = useTracker();

  const [searchParams] = useSearchParams();
  const [subjectId, setSubjectId] = useState('');
  const [note, setNote] = useState('');

  const scheduleDateParam = searchParams.get('date') || undefined;
  const scheduleEntryParam = searchParams.get('entry') || undefined;
  const plannedStartParam = searchParams.get('plannedStart') || undefined;
  const plannedMinutesParam = searchParams.get('plannedMinutes');
  const parsedPlannedMinutes = plannedMinutesParam ? Number(plannedMinutesParam) : undefined;

  const plannedMinutes = Number.isFinite(parsedPlannedMinutes) ? parsedPlannedMinutes : undefined;
  const activeSubjects = data.subjects.filter((s) => s.active);
  const selectedSubject = subjectId ? getSubject(subjectId) : undefined;

  useEffect(() => {
    if (runtime) return;
    const initialSubject = searchParams.get('subject');
    if (initialSubject && data.subjects.some((s) => s.id === initialSubject)) {
      setSubjectId(initialSubject);
    }
  }, [runtime, searchParams, data.subjects]);

  useEffect(() => {
    if (!runtime) return;
    if (runtime.subjectId) setSubjectId(runtime.subjectId);
    setNote(runtime.note || '');
  }, [runtime]);

  const currentBinding = useMemo(
    () => ({
      subjectId,
      scheduleDate: runtime?.scheduleDate || scheduleDateParam,
      scheduleEntryId: runtime?.scheduleEntryId || scheduleEntryParam,
      plannedStartTime: runtime?.plannedStartTime || plannedStartParam,
      plannedMinutes: runtime?.plannedMinutes ?? plannedMinutes,
      note: note.trim() || undefined,
    }),
    [subjectId, runtime, scheduleDateParam, scheduleEntryParam, plannedStartParam, plannedMinutes, note],
  );

  const handleStart = async () => {
    if (!subjectId) {
      toast.error('Selecione uma materia para iniciar.');
      return;
    }

    const result = await startWithBinding(currentBinding, { mode });
    if (result.ok) {
      if (result.status === 'started') {
        toast.success(mode === 'pomodoro' ? 'Pomodoro iniciado.' : 'Cronometro iniciado.');
      }
      return;
    }

    if (result.status === 'conflict') {
      const shouldSwitch = window.confirm(
        'Ja existe uma sessao ativa em outra materia. Deseja encerrar a atual e iniciar esta?',
      );
      if (!shouldSwitch) return;

      const forced = await startWithBinding(currentBinding, { mode, forceSwitch: true });
      if (forced.ok) {
        toast.success(mode === 'pomodoro' ? 'Pomodoro iniciado.' : 'Cronometro iniciado.');
      } else {
        toast.error('Nao foi possivel iniciar agora.');
      }
      return;
    }

    toast.error('Nao foi possivel iniciar a sessao.');
  };

  const handlePauseResume = () => {
    togglePauseResume();
  };

  const handleFinishStopwatch = async () => {
    const saved = await finishActive('completed');
    if (saved) {
      setNote('');
      toast.success('Sessao de estudo registrada.');
    }
  };

  const handleStopPomodoro = async () => {
    const saved = await finishActive('abandoned');
    if (saved) {
      setNote('');
      toast.info('Pomodoro encerrado. Fase atual salva no historico.');
    }
  };

  const handleSkipBreak = async () => {
    const skipped = await skipCurrentBreak();
    if (skipped) toast.success('Pausa pulada. Voltando para foco.');
  };

  const handleReset = () => {
    clearRuntime();
    setNote('');
    toast.info('Tracker resetado.');
  };

  const contextDate = runtime?.scheduleDate || scheduleDateParam;
  const contextPlannedStart = runtime?.plannedStartTime || plannedStartParam;
  const contextPlannedMinutes = runtime?.plannedMinutes ?? plannedMinutes;

  const today = toDateKey(new Date());
  const recentSessions = data.sessions
    .filter((session) => session.date === today)
    .sort((a, b) => {
      const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
      const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
      return bStart.localeCompare(aStart);
    })
    .slice(0, 8);

  const runtimeModeLabel = runtime?.kind === 'pomodoro' ? 'Pomodoro' : 'Cronometro';
  const runtimeIsPomodoro = runtime?.kind === 'pomodoro';
  const runtimeIsStopwatch = runtime?.kind === 'stopwatch';

  return (
    <div className="space-y-6 w-full max-w-none">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tracker de Estudo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planejado e executado separados, mas sincronizados com o cronograma.
          </p>
        </div>
        {runtime && (
          <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Sessao ativa:{' '}
            <strong className="text-foreground">
              {runtimeModeLabel} ({phaseStateLabel})
            </strong>
          </div>
        )}
      </div>

      <div className="glass-card p-3 md:p-4 space-y-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
          <button
            onClick={() => !runtime && setMode('stopwatch')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'stopwatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            } ${runtime ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={Boolean(runtime)}
          >
            Cronometro
          </button>
          <button
            onClick={() => !runtime && setMode('pomodoro')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            } ${runtime ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={Boolean(runtime)}
          >
            Pomodoro
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-4 items-start">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Materia</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={Boolean(runtime)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a materia" />
                </SelectTrigger>
                <SelectContent>
                  {activeSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(contextDate || contextPlannedStart || contextPlannedMinutes !== undefined) && (
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Contexto do cronograma</p>
                {contextDate && <p>Dia: {new Date(`${contextDate}T12:00:00`).toLocaleDateString('pt-BR')}</p>}
                {contextPlannedStart && <p>Planejado: {contextPlannedStart}</p>}
                {contextPlannedMinutes !== undefined && <p>Meta: {formatMinutesCompact(contextPlannedMinutes)}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Observacao da sessao</Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                disabled={Boolean(runtime)}
                placeholder="Anotacoes da sessao, contexto ou dificuldades..."
              />
              {runtime && (
                <p className="text-[11px] text-muted-foreground">
                  A observacao da sessao ativa fica bloqueada para manter consistencia.
                </p>
              )}
            </div>

            {runtime?.kind === 'stopwatch' && (
              <div className="space-y-2">
                <Label>Inicio da sessao (retroativo)</Label>
                <ClockTimePickerField
                  value={activeStartTime}
                  onChange={setActiveStartTime}
                  placeholder="--:--"
                  className="h-9 px-2.5 text-xs w-full bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Ajuste o horario se voce iniciou a sessao antes de acionar o cronometro.
                </p>
              </div>
            )}

            {mode === 'pomodoro' && !runtime && (
              <PomodoroQuickSettings
                settings={pomodoroSettings}
                onChange={setPomodoroSettings}
              />
            )}
          </div>

          <div className="glass-card p-5 md:p-6 text-center space-y-5">
            {selectedSubject && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
                <span className="text-sm font-medium text-foreground">{selectedSubject.name}</span>
              </div>
            )}

            {mode === 'stopwatch' ? (
              <>
                <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-semibold">
                  Cronometro
                </p>
                <p className="text-5xl font-display font-bold text-foreground tabular-nums">
                  {runtimeIsStopwatch ? displayTimeLabel : '00:00'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pausado:{' '}
                  <strong className="text-foreground">
                    {runtimeIsStopwatch && secondaryTimeLabel ? secondaryTimeLabel.replace('Pausado ', '') : '00:00'}
                  </strong>
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  {runtimeIsPomodoro && phaseLabel === 'Foco' ? (
                    <Brain className="w-4 h-4 text-primary" />
                  ) : (
                    <Coffee className="w-4 h-4 text-accent" />
                  )}
                  <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-semibold">
                    {runtimeIsPomodoro ? phaseLabel : 'Foco'}
                  </p>
                </div>
                <p className="text-5xl font-display font-bold text-foreground tabular-nums">
                  {runtimeIsPomodoro ? displayTimeLabel : '25:00'}
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Estado: <strong className="text-foreground">{runtimeIsPomodoro ? phaseStateLabel : 'Inativo'}</strong>
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {!runtime ? (
                <Button onClick={() => void handleStart()} disabled={isTransitioning}>
                  <Play className="w-4 h-4 mr-1" />
                  Iniciar
                </Button>
              ) : (
                <Button variant="outline" onClick={handlePauseResume} disabled={isTransitioning}>
                  {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isRunning ? 'Pausar' : 'Retomar'}
                </Button>
              )}

              {runtimeIsStopwatch && (
                <Button variant="default" onClick={() => void handleFinishStopwatch()} disabled={!runtime || isTransitioning}>
                  <Square className="w-4 h-4 mr-1" />
                  Finalizar
                </Button>
              )}

              {runtimeIsPomodoro && runtime?.phase !== 'focus' && (
                <Button variant="secondary" onClick={() => void handleSkipBreak()} disabled={isTransitioning}>
                  <SkipForward className="w-4 h-4 mr-1" />
                  Pular pausa
                </Button>
              )}

              {runtimeIsPomodoro && (
                <Button variant="destructive" onClick={() => void handleStopPomodoro()} disabled={isTransitioning}>
                  <Square className="w-4 h-4 mr-1" />
                  Encerrar
                </Button>
              )}

              {runtime && (
                <Button variant="ghost" onClick={handleReset} disabled={isTransitioning}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.11em]">Sessoes de hoje</h3>
        {recentSessions.length === 0 ? (
          <div className="glass-card p-4 text-sm text-muted-foreground">Nenhuma sessao registrada hoje.</div>
        ) : (
          recentSessions.map((session) => {
            const subject = getSubject(session.subjectId);
            const pauses = data.sessionPauses.filter((pause) => pause.sessionId === session.id);
            const actualMin = getSessionActualMinutes(session);
            const pauseMin = Math.round(getSessionPauseSeconds(session, pauses) / 60);
            const startLabel = getSessionStartLabel(session);
            const endLabel = getSessionEndLabel(session);

            const sessionModeLabel =
              session.sessionMode === 'pomodoro'
                ? session.pomodoroPhase === 'focus'
                  ? 'Foco'
                  : session.pomodoroPhase === 'short_break'
                    ? 'Pausa curta'
                    : session.pomodoroPhase === 'long_break'
                      ? 'Pausa longa'
                      : 'Pomodoro'
                : 'Cronometro';

            return (
              <div key={session.id} className="glass-card p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject?.color }} />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{subject?.name}</span>
                  <span className="text-xs text-muted-foreground">{sessionModeLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {startLabel}
                    {endLabel ? ` -> ${endLabel}` : ''}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5">feito {formatMinutesCompact(actualMin)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">pausa {formatMinutesCompact(pauseMin)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">dia {getSessionDateKey(session)}</span>
                </div>

                {pauses.length > 0 && (
                  <div className="rounded-lg bg-muted/30 px-2 py-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground">Pausas</p>
                    {pauses.map((pause) => (
                      <p key={pause.id} className="text-[11px] text-foreground">
                        {clockFromIso(pause.pauseStartedAt)}
                        {' -> '}
                        {pause.pauseEndedAt ? clockFromIso(pause.pauseEndedAt) : '--:--'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
