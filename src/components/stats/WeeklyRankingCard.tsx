import { useCallback, useEffect, useMemo, useState } from 'react';
import { EyeOff, Medal, Shield, Timer, Trophy } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { obterRankingSemanal, type WeeklyRankingRow } from '@/features/engagement/engagement';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function weekLabel(today = new Date()) {
  const current = new Date(today);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const end = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${start} - ${end}`;
}

function formatMinutes(minutes: number) {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

function getInitials(name?: string | null) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function WeeklyRankingCard() {
  const { profile, updateProfile } = useAuth();
  const [items, setItems] = useState<WeeklyRankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    const { data, error } = await obterRankingSemanal(new Date(), 10);

    if (error) {
      toast.error('Não foi possível carregar o ranking semanal.');
      setItems([]);
    } else {
      setItems(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const privacyEnabled = profile?.profile_private ?? false;
  const topThree = useMemo(() => items.slice(0, 3), [items]);

  const handleTogglePrivacy = async (checked: boolean) => {
    setSavingPrivacy(true);
    const { error } = await updateProfile({ profile_private: checked });
    setSavingPrivacy(false);

    if (error) {
      toast.error(error);
      return;
    }

    await loadRanking();
    toast.success(checked ? 'Modo privado ativado no ranking.' : 'Modo competitivo ativado no ranking.');
  };

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Ranking semanal
          </p>
          <h2 className="mt-2 text-2xl font-display font-black text-foreground">
            Semana {weekLabel()}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Veja quem mais estudou na semana. Perfis privados continuam acumulando XP e ofensiva, mas ficam ocultos do placar dos outros usuários.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm lg:max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-foreground">
                Modo no ranking
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {privacyEnabled ? 'Privado' : 'Competitivo'}
              </p>
            </div>
            <Switch
              checked={privacyEnabled}
              disabled={savingPrivacy}
              onCheckedChange={handleTogglePrivacy}
            />
          </div>

          <div
            className={cn(
              'mt-4 rounded-2xl border px-3 py-3 text-sm',
              privacyEnabled
                ? 'border-amber-400/40 bg-amber-500/10 text-amber-700'
                : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700',
            )}
          >
            {privacyEnabled ? (
              <div className="flex items-start gap-2">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Você continua ganhando pontos e mantendo a ofensiva, mas não aparece para outras pessoas no ranking semanal.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Seu perfil está competitivo e aparece no ranking com nome, avatar, minutos estudados e XP semanal.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Líderes da semana</p>
              <p className="mt-1 text-sm text-muted-foreground">XP semanal reiniciado a cada fechamento do ciclo.</p>
            </div>
            <div className="rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Top 10
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
                Ainda não há competidores públicos nesta semana.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.user_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
                      {item.rank_position}
                    </div>
                    <Avatar className="h-11 w-11 border border-border/60">
                      <AvatarImage src={item.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(item.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.full_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatMinutes(item.minutes_week ?? 0)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {item.xp_weekly ?? 0} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {item.streak_current ?? 0} dias
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background/60 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Pódio atual</p>
          <div className="mt-4 grid gap-3">
            {topThree.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
                O pódio aparecerá aqui assim que houver participantes públicos na semana.
              </div>
            ) : (
              topThree.map((item, index) => (
                <div
                  key={item.user_id}
                  className={cn(
                    'rounded-2xl border p-4 shadow-sm',
                    index === 0 && 'border-yellow-400/40 bg-yellow-500/10',
                    index === 1 && 'border-slate-300/50 bg-slate-500/5',
                    index === 2 && 'border-amber-600/30 bg-amber-700/5',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-card p-2 text-primary shadow-sm">
                        <Medal className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{item.full_name}</p>
                        <p className="text-xs text-muted-foreground">#{item.rank_position} no ranking</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">{item.xp_weekly ?? 0}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">XP</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-card/80 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Fechamento semanal</p>
            <p className="mt-2">
              O placar é reiniciado no fechamento da semana. Quem está em modo competitivo volta a disputar com o XP semanal zerado, mantendo apenas o histórico total no perfil.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
