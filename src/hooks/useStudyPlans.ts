import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudyPlan {
  id: string;
  user_id: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface StudyPlanInput {
  name: string;
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
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export function useStudyPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
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

      const { data, error: fetchError } = await supabase
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

  const createPlan = async (input: StudyPlanInput) => {
    if (!user) return null;

    const name = input.name?.trim();
    if (!name) return null;

    setError(null);
    const payload = cleanPayload({
      ...input,
      name,
      status: input.status || 'active',
      review_interval_days: input.review_interval_days ?? 7,
    });

    const { data, error: insertError } = await supabase
      .from('study_plans')
      .insert({
        ...payload,
        title: name,
        board: input.board_name || undefined,
        role: input.role_name || undefined,
        image_url: input.cover_image_url || undefined,
        user_id: user.id,
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

    const { data, error: updateError } = await supabase
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
    const { error: deleteError } = await supabase
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
    createPlan,
    updatePlan,
    deletePlan,
  };
}
