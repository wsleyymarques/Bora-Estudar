import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type WeeklyRankingRow = Database['public']['Functions']['get_weekly_ranking']['Returns'][number];

function toDateInput(value?: string | Date) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
}

export async function registrarEstudo(targetDate?: string | Date) {
  const { data, error } = await supabase.rpc('refresh_user_engagement', {
    target_date: toDateInput(targetDate),
  });

  if (error) {
    console.error('Erro ao registrar estudo no sistema de ofensiva:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function processarViradaDoDia(processDate?: string | Date) {
  const { error } = await supabase.rpc('process_daily_streak_rollover', {
    process_date: toDateInput(processDate),
  });

  if (error) {
    console.error('Erro ao processar virada do dia:', error);
    return { error: error.message };
  }

  return { error: null };
}

export async function obterRankingSemanal(targetDate?: string | Date, limitCount = 10) {
  const { data, error } = await supabase.rpc('get_weekly_ranking', {
    target_date: toDateInput(targetDate),
    limit_count: limitCount,
  });

  if (error) {
    console.error('Erro ao obter ranking semanal:', error);
    return { data: [] as WeeklyRankingRow[], error: error.message };
  }

  return { data: (data || []) as WeeklyRankingRow[], error: null };
}
