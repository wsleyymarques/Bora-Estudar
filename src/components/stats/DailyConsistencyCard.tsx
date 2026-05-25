import { Flame, Sparkles, Trophy } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function formatMinutesLabel(minutes: number) {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

export function DailyConsistencyCard() {
  const { profile } = useAuth();

  const dailyGoal = profile?.daily_goal_minutes ?? 30;
  const minutesToday = profile?.minutes_today ?? 0;
  const streakCurrent = profile?.streak_current ?? 0;
  const xpWeekly = profile?.xp_weekly ?? 0;
  const xpTotal = profile?.xp_total ?? 0;
  const goalReached = profile?.daily_goal_reached ?? false;
  const progressValue = Math.max(0, Math.min(100, (minutesToday / dailyGoal) * 100));

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Sistema de ofensiva
          </p>
          <h2 className="mt-2 text-2xl font-display font-black text-foreground">
            {streakCurrent} {streakCurrent === 1 ? 'dia seguido' : 'dias seguidos'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Estude pelo menos {dailyGoal} minutos líquidos por dia para manter a constância, ganhar bônus diário e avançar no ranking semanal.
          </p>
        </div>

        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]',
            goalReached
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600'
              : 'border-amber-400/40 bg-amber-500/10 text-amber-600',
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          {goalReached ? 'Meta concluída' : 'Meta em andamento'}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Progresso diário</p>
              <p className="mt-2 text-3xl font-display font-black text-foreground">
                {formatMinutesLabel(minutesToday)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Meta</p>
              <p className="mt-1 text-lg font-black text-foreground">{dailyGoal} min</p>
            </div>
          </div>

          <Progress className="mt-4 h-3 bg-muted/60" value={progressValue} />

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Regra dos 30 minutos</span>
            <span className="font-semibold text-foreground">
              {minutesToday}/{dailyGoal} min
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
            {goalReached ? (
              <span>
                Você ativou o bônus diário de <strong className="text-foreground">+50 XP</strong> hoje.
              </span>
            ) : (
              <span>
                Faltam <strong className="text-foreground">{Math.max(dailyGoal - minutesToday, 0)} min</strong> para validar o dia e manter a ofensiva.
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">XP da semana</p>
                <p className="mt-1 text-2xl font-black text-foreground">{xpWeekly}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              1 minuto = 1 XP. Ao fechar 7 dias seguidos, você recebe <strong className="text-foreground">+200 XP</strong>.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">XP total</p>
                <p className="mt-1 text-2xl font-black text-foreground">{xpTotal}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              O ranking reinicia a cada semana, mas seu XP total continua acumulando normalmente no perfil.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
