import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { WeeklyTemplate } from '@/types/study';
import { toast } from 'sonner';
import { buildTemplateEntries } from '@/features/schedule/template-generation';

const db = supabase as any;

type TemplateType = 'weekly' | 'monthly' | 'custom';
type TemplateStatus = 'active' | 'archived' | 'draft';

export interface CreateTemplateInput {
  name: string;
  description?: string;
  type?: TemplateType;
  status?: TemplateStatus;
  scheduleId?: string;
  planId?: string;
}

export interface UseTemplatesOptions {
  scheduleId?: string | null;
  planId?: string | null;
  includeGlobal?: boolean;
}

function isMissingColumn(error: any, column: string) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return message.includes(column.toLowerCase()) && (message.includes('does not exist') || message.includes('schema cache'));
}

function mapTemplate(row: any, items: any[], notes: any[]): WeeklyTemplate {
  return {
    id: row.id,
    scheduleId: row.schedule_id || undefined,
    planId: row.plan_id || undefined,
    name: row.name,
    description: row.description || undefined,
    type: row.type || 'weekly',
    status: row.status || 'active',
    items: items
      .filter((item) => item.template_id === row.id)
      .map((item) => ({
        id: item.id,
        templateId: item.template_id,
        dayOfWeek: item.day_of_week,
        subjectId: item.subject_id,
        optional: item.optional,
        startTime: item.start_time || undefined,
        plannedMinutes: item.planned_minutes ?? undefined,
        itemNote: item.item_note || undefined,
        sortOrder: item.sort_order,
      })),
    dayNotes: notes
      .filter((note) => note.template_id === row.id)
      .map((note) => ({
        id: note.id,
        templateId: note.template_id,
        dayOfWeek: note.day_of_week,
        content: note.content,
        targetMinutes: note.target_minutes ?? undefined,
      })),
  };
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { user } = useAuth();
  const { activeScheduleId } = useStudy();
  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const scopedScheduleId = options.scheduleId === undefined ? activeScheduleId : options.scheduleId;
  const scopedPlanId = options.planId ?? null;
  const includeGlobal = options.includeGlobal ?? true;

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let templatesQuery: any = db.from('weekly_templates').select('*').order('created_at');

    if (scopedPlanId) {
      templatesQuery = includeGlobal
        ? templatesQuery.or(`plan_id.eq.${scopedPlanId},schedule_id.eq.${scopedScheduleId || ''},and(plan_id.is.null,schedule_id.is.null)`)
        : templatesQuery.eq('plan_id', scopedPlanId);
    } else if (scopedScheduleId) {
      templatesQuery = templatesQuery.eq('schedule_id', scopedScheduleId);
    }

    let templatesRes = await templatesQuery;

    if (templatesRes.error && isMissingColumn(templatesRes.error, 'plan_id')) {
      let fallbackQuery: any = db.from('weekly_templates').select('*').order('created_at');
      if (scopedScheduleId) fallbackQuery = fallbackQuery.eq('schedule_id', scopedScheduleId);
      templatesRes = await fallbackQuery;
    }

    if (templatesRes.error && isMissingColumn(templatesRes.error, 'schedule_id')) {
      templatesRes = await db.from('weekly_templates').select('*').order('created_at');
    }

    if (templatesRes.error) {
      toast.error('Erro ao carregar templates');
      setTemplates([]);
      setLoading(false);
      return;
    }

    const templateRows = templatesRes.data || [];
    if (templateRows.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const templateIds = templateRows.map((row: any) => row.id);
    const [itemsRes, notesRes] = await Promise.all([
      db
        .from('weekly_template_items')
        .select('*')
        .in('template_id', templateIds)
        .order('sort_order'),
      db
        .from('weekly_template_day_notes')
        .select('*')
        .in('template_id', templateIds),
    ]);

    const mapped = templateRows.map((row: any) => mapTemplate(row, itemsRes.data || [], notesRes.data || []));
    setTemplates(mapped);
    setLoading(false);
  }, [user, scopedScheduleId, scopedPlanId, includeGlobal]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: string | CreateTemplateInput): Promise<string | null> => {
    if (!user) return null;

    const parsedInput: CreateTemplateInput =
      typeof input === 'string'
        ? { name: input }
        : input;

    if (!parsedInput.name.trim()) {
      toast.error('Informe o nome do template');
      return null;
    }

    const payload: any = {
      user_id: user.id,
      schedule_id: parsedInput.scheduleId ?? scopedScheduleId ?? null,
      name: parsedInput.name.trim(),
      description: parsedInput.description || null,
      type: parsedInput.type || 'weekly',
      status: parsedInput.status || 'active',
    };

    if (parsedInput.planId || scopedPlanId) {
      payload.plan_id = parsedInput.planId || scopedPlanId;
    }

    let createRes = await db
      .from('weekly_templates')
      .insert(payload)
      .select('id')
      .single();

    if (createRes.error && isMissingColumn(createRes.error, 'plan_id')) {
      delete payload.plan_id;
      createRes = await db.from('weekly_templates').insert(payload).select('id').single();
    }

    if (createRes.error) {
      toast.error('Erro ao criar template');
      return null;
    }

    await fetchTemplates();
    return createRes.data.id;
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<Pick<CreateTemplateInput, 'name' | 'description' | 'type' | 'status' | 'scheduleId' | 'planId'>>,
  ) => {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.scheduleId !== undefined) payload.schedule_id = updates.scheduleId || null;
    if (updates.planId !== undefined) payload.plan_id = updates.planId || null;

    let updateRes = await db.from('weekly_templates').update(payload).eq('id', id);
    if (updateRes.error && isMissingColumn(updateRes.error, 'plan_id')) {
      delete payload.plan_id;
      updateRes = await db.from('weekly_templates').update(payload).eq('id', id);
    }

    if (updateRes.error) {
      toast.error('Erro ao atualizar template');
      return;
    }
    await fetchTemplates();
  };

  const updateTemplateName = async (id: string, name: string) => {
    await updateTemplate(id, { name });
  };

  const duplicateTemplate = async (templateId: string, duplicateName?: string): Promise<string | null> => {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template || !user) return null;

    const newTemplateId = await createTemplate({
      name: duplicateName || `${template.name} (copia)`,
      description: template.description,
      type: template.type,
      status: 'draft',
      scheduleId: template.scheduleId || scopedScheduleId || undefined,
      planId: template.planId || scopedPlanId || undefined,
    });

    if (!newTemplateId) return null;

    if (template.items.length > 0) {
      const rows = template.items.map((item) => ({
        template_id: newTemplateId,
        day_of_week: item.dayOfWeek,
        subject_id: item.subjectId,
        optional: item.optional,
        start_time: item.startTime || null,
        planned_minutes: item.plannedMinutes ?? null,
        item_note: item.itemNote || null,
        sort_order: item.sortOrder,
      }));
      const { error } = await db.from('weekly_template_items').insert(rows);
      if (error) {
        toast.error('Erro ao duplicar materias do template');
      }
    }

    if (template.dayNotes.length > 0) {
      const rows = template.dayNotes.map((note) => ({
        template_id: newTemplateId,
        day_of_week: note.dayOfWeek,
        content: note.content,
        target_minutes: note.targetMinutes ?? null,
      }));
      const { error } = await db.from('weekly_template_day_notes').insert(rows);
      if (error) {
        toast.error('Erro ao duplicar notas do template');
      }
    }

    await fetchTemplates();
    return newTemplateId;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await db.from('weekly_templates').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir template');
      return;
    }
    await fetchTemplates();
  };

  const addTemplateItem = async (
    templateId: string,
    dayOfWeek: number,
    subjectId: string,
    optional: boolean,
    options?: Partial<{ startTime: string; plannedMinutes: number; itemNote: string }>,
  ) => {
    const existing = templates.find((template) => template.id === templateId)?.items.filter((item) => item.dayOfWeek === dayOfWeek) || [];
    const { error } = await db.from('weekly_template_items').insert({
      template_id: templateId,
      day_of_week: dayOfWeek,
      subject_id: subjectId,
      optional,
      start_time: options?.startTime || null,
      planned_minutes: options?.plannedMinutes ?? null,
      item_note: options?.itemNote || null,
      sort_order: existing.length,
    });
    if (error) {
      toast.error('Erro ao adicionar materia');
      return;
    }
    await fetchTemplates();
  };

  const addTemplateItemsBatch = async (
    templateId: string,
    items: Array<{
      dayOfWeek: number;
      subjectId: string;
      optional?: boolean;
      startTime?: string;
      plannedMinutes?: number;
      itemNote?: string;
      sortOrder?: number;
    }>,
  ) => {
    if (items.length === 0) return;
    const template = templates.find((entry) => entry.id === templateId);
    const dayCounters = new Map<number, number>();

    for (const item of template?.items || []) {
      const current = dayCounters.get(item.dayOfWeek) ?? 0;
      dayCounters.set(item.dayOfWeek, Math.max(current, item.sortOrder + 1));
    }

    const rows = items.map((item) => {
      const nextSortOrder = item.sortOrder ?? (dayCounters.get(item.dayOfWeek) ?? 0);
      dayCounters.set(item.dayOfWeek, nextSortOrder + 1);
      return {
        template_id: templateId,
        day_of_week: item.dayOfWeek,
        subject_id: item.subjectId,
        optional: item.optional ?? false,
        start_time: item.startTime || null,
        planned_minutes: item.plannedMinutes ?? null,
        item_note: item.itemNote || null,
        sort_order: nextSortOrder,
      };
    });
    const { error } = await db.from('weekly_template_items').insert(rows);
    if (error) {
      toast.error('Erro ao adicionar materias em lote');
      return;
    }
    await fetchTemplates();
  };

  const removeTemplateItem = async (itemId: string) => {
    const { error } = await db.from('weekly_template_items').delete().eq('id', itemId);
    if (error) {
      toast.error('Erro ao remover');
      return;
    }
    await fetchTemplates();
  };

  const removeTemplateItemsBatch = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const { error } = await db.from('weekly_template_items').delete().in('id', itemIds);
    if (error) {
      toast.error('Erro ao remover materias em lote');
      return;
    }
    await fetchTemplates();
  };

  const updateTemplateItem = async (
    itemId: string,
    updates: Partial<{ optional: boolean; sortOrder: number; subjectId: string; startTime: string; plannedMinutes: number; itemNote: string }>,
  ) => {
    const payload: any = {};
    if (updates.optional !== undefined) payload.optional = updates.optional;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.subjectId !== undefined) payload.subject_id = updates.subjectId;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime || null;
    if (updates.plannedMinutes !== undefined) payload.planned_minutes = updates.plannedMinutes;
    if (updates.itemNote !== undefined) payload.item_note = updates.itemNote || null;
    const { error } = await db.from('weekly_template_items').update(payload).eq('id', itemId);
    if (error) {
      toast.error('Erro ao atualizar');
      return;
    }
    await fetchTemplates();
  };

  const setDayNote = async (templateId: string, dayOfWeek: number, content: string, targetMinutes?: number) => {
    const existing = templates.find((template) => template.id === templateId)?.dayNotes.find((note) => note.dayOfWeek === dayOfWeek);
    if (existing) {
      if (!content.trim() && (targetMinutes === undefined || targetMinutes === null)) {
        await db.from('weekly_template_day_notes').delete().eq('id', existing.id);
      } else {
        await db.from('weekly_template_day_notes').update({ content, target_minutes: targetMinutes ?? null }).eq('id', existing.id);
      }
    } else if (content.trim() || targetMinutes !== undefined) {
      await db.from('weekly_template_day_notes').insert({
        template_id: templateId,
        day_of_week: dayOfWeek,
        content,
        target_minutes: targetMinutes ?? null,
      });
    }
    await fetchTemplates();
  };

  const upsertTemplateDayNotesBatch = async (
    templateId: string,
    notes: Array<{ dayOfWeek: number; content: string; targetMinutes?: number }>,
  ) => {
    if (notes.length === 0) return;
    const rows = notes.map((note) => ({
      template_id: templateId,
      day_of_week: note.dayOfWeek,
      content: note.content,
      target_minutes: note.targetMinutes ?? null,
    }));
    const { error } = await db.from('weekly_template_day_notes').upsert(rows, { onConflict: 'template_id,day_of_week' });
    if (error) {
      toast.error('Erro ao atualizar metas dos dias');
      return;
    }
    await fetchTemplates();
  };

  const applyTemplate = async (templateId: string, startDate: Date, endDate: Date, refreshSchedule?: () => Promise<void>) => {
    if (!user) return;
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;

    const { entries, dayPlans } = buildTemplateEntries({
      userId: user.id,
      scheduleId: template.scheduleId || scopedScheduleId || undefined,
      planId: template.planId || scopedPlanId || undefined,
      template,
      templateId,
      startDate,
      endDate,
    });

    if (entries.length === 0 && dayPlans.length === 0) {
      toast.info('Nenhum item no template para gerar');
      return;
    }

    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100);
      let insertRes = await db.from('schedule_entries').insert(batch);
      if (insertRes.error && isMissingColumn(insertRes.error, 'plan_id')) {
        insertRes = await db.from('schedule_entries').insert(batch.map(({ plan_id, ...row }: any) => row));
      }
      if (insertRes.error) {
        toast.error('Erro ao gerar cronograma');
        return;
      }
    }

    for (let i = 0; i < dayPlans.length; i += 100) {
      const batch = dayPlans.slice(i, i + 100);
      let upsertResult = await db.from('schedule_day_plans').upsert(batch, {
        onConflict: 'user_id,schedule_id,date',
      });

      if (upsertResult.error && isMissingColumn(upsertResult.error, 'plan_id')) {
        upsertResult = await db.from('schedule_day_plans').upsert(batch.map(({ plan_id, ...row }: any) => row), {
          onConflict: 'user_id,schedule_id,date',
        });
      }

      if (upsertResult.error && String(upsertResult.error.message || '').toLowerCase().includes('on conflict')) {
        upsertResult = await db.from('schedule_day_plans').upsert(batch, { onConflict: 'user_id,date' });
      }

      if (upsertResult.error) {
        toast.error('Erro ao gerar metas diarias');
        return;
      }
    }

    toast.success(`Cronograma gerado: ${entries.length} entradas criadas`);
    if (refreshSchedule) {
      await refreshSchedule();
    } else {
      await fetchTemplates();
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    updateTemplateName,
    duplicateTemplate,
    deleteTemplate,
    addTemplateItem,
    addTemplateItemsBatch,
    removeTemplateItem,
    removeTemplateItemsBatch,
    updateTemplateItem,
    setDayNote,
    upsertTemplateDayNotesBatch,
    applyTemplate,
  };
}

