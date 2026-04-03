import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WeeklyTemplate, WeeklyTemplateItem, WeeklyTemplateDayNote } from '@/types/study';
import { toast } from 'sonner';

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
          sortOrder: i.sort_order,
        })),
      dayNotes: notes
        .filter(n => n.template_id === t.id)
        .map(n => ({
          id: n.id,
          templateId: n.template_id,
          dayOfWeek: n.day_of_week,
          content: n.content,
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

  const addTemplateItem = async (templateId: string, dayOfWeek: number, subjectId: string, optional: boolean) => {
    const existing = templates.find(t => t.id === templateId)?.items.filter(i => i.dayOfWeek === dayOfWeek) || [];
    const { error } = await supabase.from('weekly_template_items').insert({
      template_id: templateId,
      day_of_week: dayOfWeek,
      subject_id: subjectId,
      optional,
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

  const updateTemplateItem = async (itemId: string, updates: Partial<{ optional: boolean; sortOrder: number; subjectId: string }>) => {
    const upd: any = {};
    if (updates.optional !== undefined) upd.optional = updates.optional;
    if (updates.sortOrder !== undefined) upd.sort_order = updates.sortOrder;
    if (updates.subjectId !== undefined) upd.subject_id = updates.subjectId;
    const { error } = await supabase.from('weekly_template_items').update(upd).eq('id', itemId);
    if (error) { toast.error('Erro ao atualizar'); return; }
    await fetchTemplates();
  };

  const setDayNote = async (templateId: string, dayOfWeek: number, content: string) => {
    const existing = templates.find(t => t.id === templateId)?.dayNotes.find(n => n.dayOfWeek === dayOfWeek);
    if (existing) {
      if (!content.trim()) {
        await supabase.from('weekly_template_day_notes').delete().eq('id', existing.id);
      } else {
        await supabase.from('weekly_template_day_notes').update({ content }).eq('id', existing.id);
      }
    } else if (content.trim()) {
      await supabase.from('weekly_template_day_notes').insert({
        template_id: templateId,
        day_of_week: dayOfWeek,
        content,
      });
    }
    await fetchTemplates();
  };

  const applyTemplate = async (templateId: string, startDate: Date, endDate: Date, refreshSchedule: () => Promise<void>) => {
    if (!user) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const entries: any[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      // Get day of week: 0=Monday, 6=Sunday
      const jsDay = current.getDay(); // 0=Sun
      const dow = jsDay === 0 ? 6 : jsDay - 1;

      const dayItems = template.items.filter(i => i.dayOfWeek === dow);
      const dayNote = template.dayNotes.find(n => n.dayOfWeek === dow);
      const dateStr = current.toISOString().split('T')[0];

      for (const item of dayItems) {
        entries.push({
          user_id: user.id,
          subject_id: item.subjectId,
          date: dateStr,
          optional: item.optional,
          completed: false,
          sort_order: item.sortOrder,
          template_id: templateId,
          is_override: false,
          day_note: dayNote?.content || null,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    if (entries.length === 0) {
      toast.info('Nenhuma matéria no template para gerar');
      return;
    }

    // Insert in batches of 100
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      const { error } = await supabase.from('schedule_entries').insert(batch);
      if (error) { toast.error('Erro ao gerar cronograma'); console.error(error); return; }
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
