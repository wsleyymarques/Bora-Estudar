import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudyPlan {
  id: string;
  user_id: string;
  name: string;
  exam_name?: string;
  board_name?: string;
  role_name?: string;
  description?: string;
  cover_image_url?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  target_date?: string;
  created_at?: string;
  updated_at?: string;
}

export function useStudyPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('study_plans')
      .select('*')
      .order('created_at', { ascending: false });
    setPlans(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (input: Partial<StudyPlan>) => {
    if (!user) return;
    const { data } = await supabase.from('study_plans').insert({
      user_id: user.id,
      name: input.name,
      exam_name: input.exam_name,
      board_name: input.board_name,
      role_name: input.role_name,
      description: input.description,
      cover_image_url: input.cover_image_url,
      status: input.status || 'active',
      start_date: input.start_date,
      target_date: input.target_date,
    }).select().single();
    await fetchPlans();
    return data;
  };

  const deletePlan = async (id: string) => {
    await supabase.from('study_plans').delete().eq('id', id);
    await fetchPlans();
  };

  return {
    plans,
    loading,
    fetchPlans,
    createPlan,
    deletePlan,
  };
}
