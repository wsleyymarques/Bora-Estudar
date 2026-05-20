import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudyPlan {
  id: string;
  user_id: string;
  schedule_id?: string | null;
  name: string;
  title?: string;
  exam_name?: string;
  board_name?: string;
  board?: string;
  role_name?: string;
  role?: string;
  description?: string;
  cover_image_url?: string;
  image_url?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  target_date?: string;
  review_interval_days?: number;
  plan_type?: 'concurso' | 'faculdade' | 'outro';
  created_at?: string;
  updated_at?: string;
}

export interface StudyPlanInput {
  name: string;
  plan_type?: 'concurso' | 'faculdade' | 'outro';
  exam_name?: string;
  board_name?: string;
  role_name?: string;
  description?: string;
  cover_image_url?: string;
  status?: StudyPlan['status'];
  start_date?: string;
  target_date?: string;
  review_interval_days?: number;
}

function normalizePlan(plan: StudyPlan): StudyPlan {
  return {
    ...plan,
    name: plan.name || plan.title || plan.exam_name || 'Plano de Estudos',
    board_name: plan.board_name || plan.board,
    role_name: plan.role_name || plan.role,
    cover_image_url: plan.cover_image_url || plan.image_url,
    review_interval_days: plan.review_interval_days ?? 7,
  };
}

function cleanPayload(input: Partial<StudyPlanInput>) {
  const { plan_type, ...rest } = input;
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function useStudyPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createLinkedSchedule = useCallback(
    async (planName: string, startDate?: string) => {
      if (!user) return null;

      const { data, error: scheduleError } = await (supabase as any)
        .from('study_schedules')
        .insert({
          user_id: user.id,
          name: `Cronograma - ${planName}`,
          description: 'Cronograma vinculado ao Plano de Estudos.',
          status: 'active',
          start_date: startDate || new Date().toISOString().slice(0, 10),
          is_active: false,
          view_settings: { source: 'study-plan' },
        })
        .select('id')
        .single();

      if (scheduleError) {
        console.error(scheduleError);
        throw scheduleError;
      }

      return data?.id || null;
    },
    [user],
  );

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await (supabase as any)
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setPlans([]);
      setLoading(false);
      return [];
    }

    const normalized = (data || []).map((plan) => normalizePlan(plan as StudyPlan));
    setPlans(normalized);
    setLoading(false);
    return normalized;
  }, [user]);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const getPlan = useCallback(
    async (id: string) => {
      if (!user) return null;

      const { data, error: fetchError } = await (supabase as any)
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        return null;
      }

      return normalizePlan(data as StudyPlan);
    },
    [user],
  );

  const ensurePlanSchedule = useCallback(
    async (plan: StudyPlan) => {
      if (!user) return null;
      if (plan.schedule_id) return plan.schedule_id;

      const scheduleId = await createLinkedSchedule(plan.name, plan.start_date);
      if (!scheduleId) return null;

      const { data, error: updateError } = await (supabase as any)
        .from('study_plans')
        .update({ schedule_id: scheduleId, updated_at: new Date().toISOString() })
        .eq('id', plan.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        throw updateError;
      }

      const updated = normalizePlan(data as StudyPlan);
      setPlans((current) => current.map((item) => (item.id === plan.id ? updated : item)));
      return scheduleId;
    },
    [createLinkedSchedule, user],
  );

  const createPlan = async (input: StudyPlanInput) => {
    if (!user) return null;

    const name = input.name?.trim();
    if (!name) return null;

    setError(null);
    const scheduleId = await createLinkedSchedule(name, input.start_date);
    const payload = cleanPayload({
      ...input,
      name,
      status: input.status || 'active',
      review_interval_days: input.review_interval_days ?? 7,
    });

    const { data, error: insertError } = await (supabase as any)
      .from('study_plans')
      .insert({
        ...payload,
        title: name,
        board: input.board_name || undefined,
        role: input.role_name || undefined,
        image_url: input.cover_image_url || undefined,
        user_id: user.id,
        schedule_id: scheduleId,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      throw insertError;
    }

    const created = normalizePlan(data as StudyPlan);
    setPlans((current) => [created, ...current]);
    return created;
  };

  const updatePlan = async (id: string, input: Partial<StudyPlanInput>) => {
    if (!user) return null;

    setError(null);
    const payload = cleanPayload({
      ...input,
      title: input.name,
      board: input.board_name,
      role: input.role_name,
      image_url: input.cover_image_url,
    } as Partial<StudyPlanInput> & Record<string, unknown>);

    const { data, error: updateError } = await (supabase as any)
      .from('study_plans')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }

    const updated = normalizePlan(data as StudyPlan);
    setPlans((current) => current.map((plan) => (plan.id === id ? updated : plan)));
    return updated;
  };

  const deletePlan = async (id: string) => {
    if (!user) return;

    setError(null);
    const { error: deleteError } = await (supabase as any)
      .from('study_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      throw deleteError;
    }

    setPlans((current) => current.filter((plan) => plan.id !== id));
  };

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlan,
    ensurePlanSchedule,
    createPlan,
    updatePlan,
    deletePlan,
  };
}
