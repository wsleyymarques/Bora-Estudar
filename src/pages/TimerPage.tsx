import React, { useState, useEffect, useRef } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type TimerMode = 'stopwatch' | 'pomodoro';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
function formatMin(m: number) { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }

export default function TimerPage() {
  const { data, getSubject, addSession } = useStudy();
  const [subjectId, setSubjectId] = useState('');
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [pomodoroMinutes] = useState(25);
  const [note, setNote] = useState('');
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');

  const activeSubjects = data.subjects.filter(s => s.active);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds(prev => {
          if (mode === 'pomodoro' && prev + 1 >= pomodoroMinutes * 60) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            toast.success('Pomodoro finalizado! 🎉');
            return pomodoroMinutes * 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, pomodoroMinutes]);

  const start = () => {
    if (!subjectId) { toast.error('Selecione uma matéria'); return; }
    if (seconds === 0) {
      startTimeRef.current = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (mode === 'pomodoro') setSeconds(0);
    }
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const finish = () => {
    if (seconds < 10) { toast.error('Sessão muito curta'); reset(); return; }
    const durationMinutes = Math.round(seconds / 60);
    const today = new Date().toISOString().split('T')[0];
    addSession({
      subjectId,
      date: today,
      startTime: startTimeRef.current,
      endTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      durationMinutes,
      note: note || undefined,
    });
    toast.success(`Sessão de ${formatMin(durationMinutes)} registrada!`);
    reset();
  };

  const reset = () => {
    setRunning(false);
    setSeconds(0);
    setNote('');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const subject = subjectId ? getSubject(subjectId) : null;
  const progress = mode === 'pomodoro' ? (seconds / (pomodoroMinutes * 60)) * 100 : 0;

  // Recent sessions
  const today = new Date().toISOString().split('T')[0];
  const recentSessions = data.sessions.filter(s => s.date === today).slice(-5).reverse();

  return (
    <div className="space-y-5 sm:space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold text-foreground text-center">Timer de Estudo</h1>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 mx-auto w-fit">
        <button onClick={() => { if (!running) { setMode('stopwatch'); reset(); } }}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'stopwatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          Cronômetro
        </button>
        <button onClick={() => { if (!running) { setMode('pomodoro'); reset(); } }}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          Pomodoro
        </button>
      </div>

      {/* Subject selector */}
      <Select value={subjectId} onValueChange={setSubjectId} disabled={running}>
        <SelectTrigger className="mx-auto max-w-xs">
          <SelectValue placeholder="Selecione a matéria" />
        </SelectTrigger>
        <SelectContent>
          {activeSubjects.map(s => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timer display */}
      <div className="glass-card p-8 text-center space-y-6">
        {subject && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
            <span className="text-sm font-medium text-foreground">{subject.name}</span>
          </div>
        )}

        {mode === 'pomodoro' && (
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 90}`} strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-display font-bold text-foreground tabular-nums">{formatTime(seconds)}</span>
            </div>
          </div>
        )}

        {mode === 'stopwatch' && (
          <div className="py-8">
            <span className={`text-5xl font-display font-bold text-foreground tabular-nums ${running ? 'animate-pulse-soft' : ''}`}>
              {formatTime(seconds)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!running ? (
            <Button onClick={start} size="lg" className="rounded-full w-14 h-14">
              <Play className="w-6 h-6" />
            </Button>
          ) : (
            <Button onClick={pause} variant="outline" size="lg" className="rounded-full w-14 h-14">
              <Pause className="w-6 h-6" />
            </Button>
          )}
          {seconds > 0 && !running && (
            <>
              <Button onClick={finish} size="lg" variant="default" className="rounded-full w-14 h-14 bg-success hover:bg-success/90">
                <Square className="w-5 h-5" />
              </Button>
              <Button onClick={reset} variant="ghost" size="lg" className="rounded-full w-14 h-14">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        {/* Note */}
        {seconds > 0 && !running && (
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Observação da sessão (opcional)" rows={2} className="max-w-xs mx-auto" />
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessões de hoje</h3>
          {recentSessions.map(s => {
            const subj = getSubject(s.subjectId);
            return (
              <div key={s.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subj?.color }} />
                <span className="text-sm text-foreground flex-1">{subj?.name}</span>
                <span className="text-xs text-muted-foreground">{s.startTime} - {s.endTime}</span>
                <span className="text-xs font-medium text-foreground">{formatMin(s.durationMinutes)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
