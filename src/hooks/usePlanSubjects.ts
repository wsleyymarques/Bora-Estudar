import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SubjectRow {
  id: string;
  user_id: string;
  plan_id?: string | null;
  name: string;
  slug?: string | null;
  color: string;
  category?: string | null;
  description?: string | null;
  active?: boolean | null;
  optional?: boolean | null;
  weekly_goal_hours?: number | null;
  monthly_goal_hours?: number | null;
  sort_order?: number | null;
  origin?: string | null;
  status?: string | null;
}

export interface PlanSubjectLinkRow {
  id: string;
  user_id: string;
  plan_id: string;
  subject_id: string;
  sort_order: number;
}

export interface SubjectInput {
  name: string;
  color?: string;
  category?: string;
  description?: string;
  weekly_goal_hours?: number;
  monthly_goal_hours?: number;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function usePlanSubjects(planId?: string) {
  const { user } = useAuth();
  const [allSubjects, setAllSubjects] = useState<SubjectRow[]>([]);
  const [links, setLinks] = useState<PlanSubjectLinkRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubjects = useCallback(async () => {
    if (!user || !planId) return;
    setLoading(true);

    const [subjectsRes, linksRes] = await Promise.all([
      supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
      supabase
        .from('study_plan_subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', planId)
        .order('sort_order', { ascending: true }),
    ]);

    if (subjectsRes.error) {
      console.error(subjectsRes.error);
      toast.error('Erro ao carregar matérias.');
    } else {
      setAllSubjects((subjectsRes.data || []) as SubjectRow[]);
    }

    if (linksRes.error) {
      console.error(linksRes.error);
      toast.error('Erro ao carregar matérias do plano.');
    } else {
      setLinks((linksRes.data || []) as PlanSubjectLinkRow[]);
    }

    setLoading(false);
  }, [planId, user]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const linkedSubjectIds = useMemo(() => new Set(links.map((link) => link.subject_id)), [links]);

  const planSubjects = useMemo(() => {
    const subjectById = new Map(allSubjects.map((subject) => [subject.id, subject]));
    return links
      .map((link) => subjectById.get(link.subject_id))
      .filter(Boolean) as SubjectRow[];
  }, [allSubjects, links]);

  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => !linkedSubjectIds.has(subject.id)),
    [allSubjects, linkedSubjectIds],
  );

  const addExistingSubjectToPlan = useCallback(async (subjectId: string) => {
    if (!user || !planId) return false;
    const { error } = await supabase.from('study_plan_subjects').insert({
      user_id: user.id,
      plan_id: planId,
      subject_id: subjectId,
      sort_order: links.length,
    });

    if (error) {
      console.error(error);
      toast.error('Erro ao vincular matéria ao plano.');
      return false;
    }

    toast.success('Matéria adicionada ao plano.');
    await loadSubjects();
    return true;
  }, [links.length, loadSubjects, planId, user]);

  const createAndLinkSubject = useCallback(async (input: SubjectInput) => {
    if (!user || !planId || !input.name.trim()) return false;

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: input.name.trim(),
        slug: slugify(input.name),
        color: input.color || '#5B8C7E',
        category: input.category || null,
        description: input.description || null,
        weekly_goal_hours: Number(input.weekly_goal_hours) || 0,
        monthly_goal_hours: Number(input.monthly_goal_hours) || 0,
        active: true,
        optional: false,
        origin: 'user',
        status: 'active',
        sort_order: allSubjects.length,
      })
      .select('*')
      .single();

    if (subjectError || !subject) {
      console.error(subjectError);
      toast.error('Erro ao criar matéria.');
      return false;
    }

    const { error: linkError } = await supabase.from('study_plan_subjects').insert({
      user_id: user.id,
      plan_id: planId,
      subject_id: subject.id,
      sort_order: links.length,
    });

    if (linkError) {
      console.error(linkError);
      toast.error('Matéria criada, mas não foi vinculada ao plano.');
      return false;
    }

    toast.success('Matéria criada e adicionada ao plano.');
    await loadSubjects();
    return true;
  }, [allSubjects.length, links.length, loadSubjects, planId, user]);

  const removeSubjectFromPlan = useCallback(async (subjectId: string) => {
    if (!user || !planId) return false;
    const { error } = await supabase
      .from('study_plan_subjects')
      .delete()
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .eq('subject_id', subjectId);

    if (error) {
      console.error(error);
      toast.error('Erro ao remover matéria do plano.');
      return false;
    }

    toast.success('Matéria removida apenas deste plano.');
    await loadSubjects();
    return true;
  }, [loadSubjects, planId, user]);

  const updateSubject = useCallback(async (subjectId: string, input: SubjectInput) => {
    if (!user || !input.name.trim()) return false;
    const { error } = await supabase
      .from('subjects')
      .update({
        name: input.name.trim(),
        slug: slugify(input.name),
        color: input.color || '#5B8C7E',
        category: input.category || null,
        description: input.description || null,
        weekly_goal_hours: Number(input.weekly_goal_hours) || 0,
        monthly_goal_hours: Number(input.monthly_goal_hours) || 0,
      })
      .eq('id', subjectId)
      .eq('user_id', user.id);

    if (error) {
      console.error(error);
      toast.error('Erro ao atualizar matéria.');
      return false;
    }

    toast.success('Matéria atualizada.');
    await loadSubjects();
    return true;
  }, [loadSubjects, user]);

  return {
    loading,
    allSubjects,
    planSubjects,
    availableSubjects,
    linkedSubjectIds,
    loadSubjects,
    addExistingSubjectToPlan,
    createAndLinkSubject,
    removeSubjectFromPlan,
    updateSubject,
  };
}
