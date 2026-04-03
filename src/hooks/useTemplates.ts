import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WeeklyTemplate, WeeklyTemplateItem, WeeklyTemplateDayNote } from '@/types/study';
import { toast } from 'sonner';
import { buildTemplateEntries } from '@/features/schedule/template-generation';

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }
    setLoading(true);

    const { data: tpls } = await supabase
      .from('weekly_templates')
      .select('*')
      .order('created_at');

    if (!tpls) { setLoading(false); return; }

    const templateIds = tpls.map(t => t.id);

    const [itemsRes, notesRes] = await Promise.all([
      supabase.from('weekly_template_items').select('*').in('template_id', templateIds.length ? templateIds : ['__none__']).order('sort_order'),
      supabase.from('weekly_template_day_notes').select('*').in('template_id', templateIds.length ? templateIds : ['__none__']),
    ]);

    const items = (itemsRes.data || []) as any[];
    const notes = (notesRes.data || []) as any[];

    const mapped: WeeklyTemplate[] = tpls.map(t => ({
      id: t.id,
      name: t.name,
      items: items
        .filter(i => i.template_id === t.id)
        .map(i => ({
          id: i.id,
          templateId: i.template_id,
          dayOfWeek: i.day_of_week,
          subjectId: i.subject_id,
          optional: i.optional,
          startTime: i.start_time || undefined,
          plannedMinutes: i.planned_minutes ?? undefined,
          itemNote: i.item_note || undefined,
          sortOrder: i.sort_order,
        })),
      dayNotes: notes
        .filter(n => n.template_id === t.id)
        .map(n => ({
          id: n.id,
          templateId: n.template_id,
          dayOfWeek: n.day_of_week,
          content: n.content,
          targetMinutes: n.target_minutes ?? undefined,
        })),
    }));

    setTemplates(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('weekly_templates')
      .insert({ user_id: user.id, name })
      .select('id')
      .single();
    if (error) { toast.error('Erro ao criar template'); return null; }
    await fetchTemplates();
    return data.id;
  };

  const updateTemplateName = async (id: string, name: string) => {
    const { error } = await supabase.from('weekly_templates').update({ name }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    await fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('weekly_templates').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    await fetchTemplates();
  };

  const addTemplateItem = async (
    templateId: string,
    dayOfWeek: number,
    subjectId: string,
    optional: boolean,
    options?: Partial<{ startTime: string; plannedMinutes: number; itemNote: string }>
  ) => {
    const existing = templates.find(t => t.id === templateId)?.items.filter(i => i.dayOfWeek === dayOfWeek) || [];
    const { error } = await supabase.from('weekly_template_items').insert({
      template_id: templateId,
      day_of_week: dayOfWeek,
      subject_id: subjectId,
      optional,
      start_time: options?.startTime || null,
      planned_minutes: options?.plannedMinutes ?? null,
      sort_order: existing.length,
    });
    if (error) { toast.error('Erro ao adicionar matéria'); return; }
    await fetchTemplates();
  };

  const removeTemplateItem = async (itemId: string) => {
    const { error } = await supabase.from('weekly_template_items').delete().eq('id', itemId);
    if (error) { toast.error('Erro ao remover'); return; }
    await fetchTemplates();
  };

  const updateTemplateItem = async (itemId: string, updates: Partial<{ optional: boolean; sortOrder: number; subjectId: string; startTime: string; plannedMinutes: number; itemNote: string }>) => {
    const upd: any = {};
    if (updates.optional !== undefined) upd.optional = updates.optional;
    if (updates.sortOrder !== undefined) upd.sort_order = updates.sortOrder;
    if (updates.subjectId !== undefined) upd.subject_id = updates.subjectId;
    if (updates.startTime !== undefined) upd.start_time = updates.startTime || null;
    if (updates.plannedMinutes !== undefined) upd.planned_minutes = updates.plannedMinutes;
    const { error } = await supabase.from('weekly_template_items').update(upd).eq('id', itemId);
    if (error) { toast.error('Erro ao atualizar'); return; }
    await fetchTemplates();
  };

  const setDayNote = async (templateId: string, dayOfWeek: number, content: string, targetMinutes?: number) => {
    const existing = templates.find(t => t.id === templateId)?.dayNotes.find(n => n.dayOfWeek === dayOfWeek);
    if (existing) {
      if (!content.trim()) {
        if (targetMinutes === undefined || targetMinutes === null) {
          await supabase.from('weekly_template_day_notes').delete().eq('id', existing.id);
        } else {
          await supabase.from('weekly_template_day_notes').update({ content: '', target_minutes: targetMinutes }).eq('id', existing.id);
        }
      } else {
        await supabase.from('weekly_template_day_notes').update({ content, target_minutes: targetMinutes ?? null }).eq('id', existing.id);
      }
    } else if (content.trim() || targetMinutes !== undefined) {
      await supabase.from('weekly_template_day_notes').insert({
        template_id: templateId,
        day_of_week: dayOfWeek,
        content,
        target_minutes: targetMinutes ?? null,
      });
    }
    await fetchTemplates();
  };

  const applyTemplate = async (templateId: string, startDate: Date, endDate: Date, refreshSchedule: () => Promise<void>) => {
    if (!user) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const { entries, dayPlans } = buildTemplateEntries({
      userId: user.id,
      template,
      templateId,
      startDate,
      endDate,
    });

    if (entries.length === 0 && dayPlans.length === 0) {
      toast.info('Nenhum item no template para gerar');
      return;
    }

    // Insert in batches of 100
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      const { error } = await supabase.from('schedule_entries').insert(batch);
      if (error) { toast.error('Erro ao gerar cronograma'); console.error(error); return; }
    }

    for (let i = 0; i < dayPlans.length; i += 100) {
      const batch = dayPlans.slice(i, i + 100);
      const { error } = await supabase.from('schedule_day_plans').upsert(batch, { onConflict: 'user_id,date' });
      if (error) { toast.error('Erro ao gerar metas diarias'); console.error(error); return; }
    }

    toast.success(`Cronograma gerado: ${entries.length} entradas criadas`);
    await refreshSchedule();
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplateName,
    deleteTemplate,
    addTemplateItem,
    removeTemplateItem,
    updateTemplateItem,
    setDayNote,
    applyTemplate,
  };
}

