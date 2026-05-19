import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SubjectSelector } from '@/components/subjects/SubjectSelector';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyPlans, StudyPlanInput } from '@/hooks/useStudyPlans';
import { usePlanSubjects, SubjectRow } from '@/hooks/usePlanSubjects';
import { useTemplates } from '@/hooks/useTemplates';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/generic/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Drawer, 
  DrawerContent, 
  DrawerDescription, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerFooter, 
  DrawerClose 
} from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CheckCircle2, Clock, Copy, Link2, Loader2, Pencil, Plus, Trash2, Wand2, BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { DAY_NAMES_SHORT, ScheduleEntry } from '@/types/study';
import WeeklyPlannerView from '@/components/schedule/WeeklyPlannerView';
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';
import DayDetailSheet from '@/components/schedule/DayDetailSheet';

interface ScheduleEntryRow { id: string; user_id?: string; plan_id?: string | null; schedule_id?: string | null; date: string; subject_id: string; start_time?: string | null; planned_minutes?: number | null; completed?: boolean | null; optional?: boolean | null; item_note?: string | null; sort_order?: number | null; }

const EMPTY_PLAN_FORM: StudyPlanInput = { name: '', plan_type: 'concurso', exam_name: '', board_name: '', role_name: '', description: '', cover_image_url: '', review_interval_days: 7 };
const EMPTY_SUBJECT_FORM = { name: '', color: '#5B8C7E', category: '', weekly_goal_hours: 4, monthly_goal_hours: 16, description: '' };
const EMPTY_ENTRY_FORM = { date: new Date().toISOString().slice(0, 10), subject_id: '', start_time: '', planned_minutes: 60, item_note: '', repeat_value: 1, repeat_unit: 'weeks' as 'days' | 'weeks' | 'months', repeat_frequency: 'weekly' as 'daily' | 'weekly' };
const EMPTY_TEMPLATE_FORM = { name: '', description: '' };
const EMPTY_TEMPLATE_ITEM_FORM = { template_id: '', day_of_week: '0', subject_id: '', start_time: '', planned_minutes: 60, item_note: '' };
const EMPTY_APPLY_TEMPLATE_FORM = { template_id: '', start_date: new Date().toISOString().slice(0, 10), end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) };

export default function PlanDetailsPage() {
  const { planId } = useParams();
  const { user } = useAuth();
  const { plans, updatePlan, ensurePlanSchedule } = useStudyPlans();
  const plan = plans.find((item) => item.id === planId);
  const { loading: loadingSubjects, planSubjects, availableSubjects, addExistingSubjectToPlan, createAndLinkSubject, removeSubjectFromPlan, updateSubject } = usePlanSubjects(planId);
  const { templates, loading: loadingTemplates, createTemplate, duplicateTemplate, deleteTemplate, addTemplateItem, removeTemplateItem, applyTemplate } = useTemplates({ planId: planId || null, scheduleId: plan?.schedule_id || null, includeGlobal: true });

  const [entries, setEntries] = useState<ScheduleEntryRow[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateItemOpen, setTemplateItemOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [planForm, setPlanForm] = useState<StudyPlanInput>(EMPTY_PLAN_FORM);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
  const [templateItemForm, setTemplateItemForm] = useState(EMPTY_TEMPLATE_ITEM_FORM);
  const [applyTemplateForm, setApplyTemplateForm] = useState(EMPTY_APPLY_TEMPLATE_FORM);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [selectedExistingSubjectId, setSelectedExistingSubjectId] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const subjectById = useMemo(() => new Map(planSubjects.map((subject) => [subject.id, subject])), [planSubjects]);
  const mappedEntries: ScheduleEntry[] = useMemo(() => {
    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.user_id || '',
      planId: entry.plan_id || '',
      scheduleId: entry.schedule_id || '',
      date: entry.date,
      subjectId: entry.subject_id,
      startTime: entry.start_time || undefined,
      plannedMinutes: entry.planned_minutes || undefined,
      completed: entry.completed || false,
      optional: entry.optional || false,
      itemNote: entry.item_note || undefined,
      sortOrder: entry.sort_order || 0,
    }));
  }, [entries]);
  const planTemplates = useMemo(() => templates.filter((template) => !template.planId || template.planId === planId || template.scheduleId === plan?.schedule_id), [templates, planId, plan?.schedule_id]);
  const sortedEntries = useMemo(() => [...entries].sort((left, right) => `${left.date}${left.start_time || ''}`.localeCompare(`${right.date}${right.start_time || ''}`)), [entries]);

  const loadFlow = async () => {
    if (!planId) return;
    setLoadingFlow(true);
    const { data, error } = await supabase.from('schedule_entries').select('*').eq('plan_id', planId).order('date', { ascending: true }).order('sort_order', { ascending: true });
    if (error) { console.error(error); toast.error('Erro ao carregar cronograma do plano.'); } else { setEntries((data || []) as ScheduleEntryRow[]); }
    setLoadingFlow(false);
  };

  useEffect(() => { void loadFlow(); }, [planId]);

  const openEditPlan = () => {
    if (!plan) return;
    setPlanForm({ name: plan.name || '', plan_type: plan.plan_type || 'concurso', exam_name: plan.exam_name || '', board_name: plan.board_name || '', role_name: plan.role_name || '', description: plan.description || '', cover_image_url: plan.cover_image_url || '', review_interval_days: plan.review_interval_days || 7, status: plan.status, start_date: plan.start_date || '', target_date: plan.target_date || '' });
    setEditPlanOpen(true);
  };

  const savePlan = async () => {
    let finalName = planForm.name.trim();
    if (planForm.plan_type === 'concurso' && planForm.exam_name) {
      finalName = planForm.exam_name.trim();
    }

    if (!planId || !finalName) { 
      toast.error('Informe o nome do plano.'); 
      return; 
    }

    setSubmitting(true);
    try { 
      await updatePlan(planId, { 
        ...planForm, 
        name: finalName, 
        review_interval_days: Number(planForm.review_interval_days) || 7 
      }); 
      toast.success('Plano atualizado com sucesso.'); 
      setEditPlanOpen(false); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const openCreateSubject = () => { setEditingSubjectId(null); setSubjectForm(EMPTY_SUBJECT_FORM); setSelectedExistingSubjectId(''); setSubjectOpen(true); };
  const openEditSubject = (subject: SubjectRow) => { setEditingSubjectId(subject.id); setSubjectForm({ name: subject.name || '', color: subject.color || '#5B8C7E', category: subject.category || '', weekly_goal_hours: Number(subject.weekly_goal_hours || 0), monthly_goal_hours: Number(subject.monthly_goal_hours || 0), description: subject.description || '' }); setSubjectOpen(true); };
  const saveNewSubject = async () => { if (!subjectForm.name.trim()) { toast.error('Informe o nome da matéria.'); return; } setSubmitting(true); const success = editingSubjectId ? await updateSubject(editingSubjectId, subjectForm) : await createAndLinkSubject(subjectForm); if (success) setSubjectOpen(false); setSubmitting(false); };
  const linkExistingSubject = async () => { if (!selectedExistingSubjectId) { toast.error('Selecione uma matéria existente.'); return; } setSubmitting(true); const success = await addExistingSubjectToPlan(selectedExistingSubjectId); if (success) { setSelectedExistingSubjectId(''); setSubjectOpen(false); } setSubmitting(false); };
  const deleteSubject = async (subjectId: string) => { if (!confirm('Deseja remover esta matéria apenas deste plano?')) return; await removeSubjectFromPlan(subjectId); };  const saveEntry = async () => {
    if (!user || !plan || !planId || !entryForm.subject_id || !entryForm.date) { toast.error('Preencha os campos obrigatórios.'); return; }
    setSubmitting(true);
    try {
      const scheduleId = await ensurePlanSchedule(plan);
      if (!scheduleId) throw new Error('Não foi possível encontrar ou criar cronograma.');

      if (editingEntryId) {
        // Update existing entry
        const { error } = await supabase.from('schedule_entries').update({
          subject_id: entryForm.subject_id,
          date: entryForm.date,
          start_time: entryForm.start_time || null,
          planned_minutes: Number(entryForm.planned_minutes) || 60,
          item_note: entryForm.item_note || null,
        }).eq('id', editingEntryId).eq('user_id', user.id);
        
        if (error) throw error;
        toast.success('Tarefa atualizada.');
      } else {
        // Insert new entries (supports recurring)
        const quantity = Math.max(1, entryForm.repeat_value || 1);
        const unit = entryForm.repeat_unit || 'days';
        const frequency = entryForm.repeat_frequency || 'daily';
        const baseDate = new Date(`${entryForm.date}T12:00:00`);

        const endDate = new Date(baseDate);
        if (unit === 'days') endDate.setDate(baseDate.getDate() + quantity - 1);
        else if (unit === 'weeks') endDate.setDate(baseDate.getDate() + (quantity * 7) - 1);
        else if (unit === 'months') endDate.setMonth(baseDate.getMonth() + quantity);

        const inserts = [];
        const current = new Date(baseDate);
        const step = frequency === 'daily' ? 1 : 7;

        while (current <= endDate && inserts.length < 365) {
          const dateStr = current.toISOString().slice(0, 10);
          inserts.push({
            user_id: user.id,
            plan_id: planId,
            schedule_id: scheduleId,
            subject_id: entryForm.subject_id,
            date: dateStr,
            start_time: entryForm.start_time || null,
            planned_minutes: Number(entryForm.planned_minutes) || 60,
            item_note: entryForm.item_note || null,
            optional: false,
            completed: false,
            sort_order: entries.filter((entry) => entry.date === dateStr).length
          });
          current.setDate(current.getDate() + step);
        }

        if (inserts.length === 0) throw new Error('Nenhum item gerado');

        const { error } = await supabase.from('schedule_entries').insert(inserts);
        if (error) throw error;
        
        toast.success(inserts.length > 1 ? `${inserts.length} itens adicionados ao cronograma.` : 'Item adicionado ao cronograma.');
      }
      
      setEntryOpen(false);
      setEditingEntryId(null);
      setEntryForm(EMPTY_ENTRY_FORM);
      await loadFlow();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar no cronograma.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditEntry = (entry: any) => {
    setEntryForm({
      subject_id: entry.subject_id,
      date: entry.date,
      start_time: entry.start_time || '',
      planned_minutes: entry.planned_minutes || 60,
      item_note: entry.item_note || '',
      repeat_value: 1,
      repeat_unit: 'days',
      repeat_frequency: 'daily'
    });
    setEditingEntryId(entry.id);
    setEntryOpen(true);
  };

  const handleApplyRecurrence = async (entryId: string, repeatValue: number, repeatUnit: string, repeatFrequency: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !user || !plan) return;
    
    setSubmitting(true);
    try {
      const scheduleId = await ensurePlanSchedule(plan);
      const baseDate = new Date(`${entry.date}T12:00:00`);
      const quantity = Math.max(1, repeatValue || 1);
      const unit = repeatUnit || 'days';
      const frequency = repeatFrequency || 'daily';

      const endDate = new Date(baseDate);
      if (unit === 'days') endDate.setDate(baseDate.getDate() + quantity - 1);
      else if (unit === 'weeks') endDate.setDate(baseDate.getDate() + (quantity * 7) - 1);
      else if (unit === 'months') endDate.setMonth(baseDate.getMonth() + quantity);

      const inserts = [];
      const current = new Date(baseDate);
      const step = frequency === 'daily' ? 1 : 7;
      
      current.setDate(current.getDate() + step);

      while (current <= endDate && inserts.length < 365) {
        const dateStr = current.toISOString().slice(0, 10);
        inserts.push({
          user_id: user.id,
          plan_id: planId,
          schedule_id: scheduleId,
          subject_id: entry.subject_id,
          date: dateStr,
          start_time: entry.start_time || null,
          planned_minutes: entry.planned_minutes || 60,
          item_note: entry.item_note || null,
          optional: false,
          completed: false,
          sort_order: entries.filter((e) => e.date === dateStr).length
        });
        current.setDate(current.getDate() + step);
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('schedule_entries').insert(inserts);
        if (error) throw error;
        toast.success(`${inserts.length} novas tarefas geradas.`);
        await loadFlow();
      } else {
        toast.info('Nenhuma nova tarefa gerada para este período.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar recorrência.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateTemplate = async () => { if (!plan) return; await ensurePlanSchedule(plan); setTemplateForm({ name: '', description: '' }); setTemplateOpen(true); };
  const saveTemplate = async () => {
    if (!plan || !planId || !templateForm.name.trim()) { toast.error('Informe o nome do template.'); return; }
    setSubmitting(true);
    try {
      const scheduleId = await ensurePlanSchedule(plan);
      const templateId = await createTemplate({ name: templateForm.name.trim(), description: templateForm.description, planId, scheduleId: scheduleId || undefined, type: 'weekly', status: 'active' });
      if (templateId) { toast.success('Template criado e vinculado ao plano.'); setTemplateOpen(false); setTemplateItemForm((form) => ({ ...form, template_id: templateId, subject_id: planSubjects[0]?.id || '' })); setTemplateItemOpen(true); }
    } finally { setSubmitting(false); }
  };
  const openAddTemplateItem = (templateId?: string) => { setTemplateItemForm({ ...EMPTY_TEMPLATE_ITEM_FORM, template_id: templateId || planTemplates[0]?.id || '', subject_id: planSubjects[0]?.id || '' }); setTemplateItemOpen(true); };
  const saveTemplateItem = async () => {
    if (!templateItemForm.template_id || !templateItemForm.subject_id) { toast.error('Selecione o template e a matéria.'); return; }
    setSubmitting(true);
    try { await addTemplateItem(templateItemForm.template_id, Number(templateItemForm.day_of_week), templateItemForm.subject_id, false, { startTime: templateItemForm.start_time, plannedMinutes: Number(templateItemForm.planned_minutes) || 60, itemNote: templateItemForm.item_note }); toast.success('Matéria adicionada ao modelo semanal.'); setTemplateItemOpen(false); } finally { setSubmitting(false); }
  };
  const openApplyTemplate = (templateId?: string) => { setApplyTemplateForm((form) => ({ ...form, template_id: templateId || planTemplates[0]?.id || '' })); setApplyTemplateOpen(true); };
  const applySelectedTemplate = async () => {
    if (!applyTemplateForm.template_id || !applyTemplateForm.start_date || !applyTemplateForm.end_date) { toast.error('Selecione o template e o período.'); return; }
    setSubmitting(true);
    try { await applyTemplate(applyTemplateForm.template_id, new Date(`${applyTemplateForm.start_date}T00:00:00`), new Date(`${applyTemplateForm.end_date}T00:00:00`), loadFlow); setApplyTemplateOpen(false); } finally { setSubmitting(false); }
  };

  const handlePrevPeriod = () => {
    const d = new Date(currentWeek);
    if (viewMode === 'weekly') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'monthly') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setFullYear(d.getFullYear() - 1);
    }
    setCurrentWeek(d);
  };

  const handleNextPeriod = () => {
    const d = new Date(currentWeek);
    if (viewMode === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    setCurrentWeek(d);
  };

  const getFormattedPeriodLabel = () => {
    if (viewMode === 'weekly') {
      return `Semana ${currentWeek.toLocaleDateString('pt-BR', {day: '2-digit', month:'short'})}`;
    } else if (viewMode === 'monthly') {
      const monthStr = currentWeek.toLocaleDateString('pt-BR', {month: 'long'});
      return `${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} de ${currentWeek.getFullYear()}`;
    } else {
      return `Ano ${currentWeek.getFullYear()}`;
    }
  };

  const handleMoveEntry = async (entryId: string, newDate: string, newStartTime?: string) => {
    try {
      const { error } = await supabase
        .from('schedule_entries')
        .update({ 
          date: newDate, 
          start_time: newStartTime || null 
        })
        .eq('id', entryId);
      
      if (error) throw error;
      
      toast.success('Tarefa reposicionada com sucesso!');
      await loadFlow();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao mover tarefa.');
    }
  };

  const handleUntimedDrop = async (entryId: string, dayKey: string, beforeEventId?: string | null) => {
    if (!user || !planId) return;

    const source = entries.find((entry) => entry.id === entryId);
    if (!source) return;

    const sameItem = beforeEventId && beforeEventId === entryId;
    if (sameItem) return;

    const currentUntimed = entries
      .filter((entry) => entry.date === dayKey && !entry.start_time && entry.id !== entryId)
      .sort((left, right) => {
        const leftOrder = left.sort_order ?? 0;
        const rightOrder = right.sort_order ?? 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.id.localeCompare(right.id);
      });

    const insertIndex = beforeEventId
      ? currentUntimed.findIndex((entry) => entry.id === beforeEventId)
      : currentUntimed.length;

    const nextUntimed = [...currentUntimed];
    nextUntimed.splice(insertIndex >= 0 ? insertIndex : nextUntimed.length, 0, source);

    const timedCount = entries.filter((entry) => entry.date === dayKey && Boolean(entry.start_time)).length;

    try {
      const updates = nextUntimed.map((entry, index) =>
        supabase
          .from('schedule_entries')
          .update({
            date: dayKey,
            start_time: null,
            sort_order: timedCount + index,
          })
          .eq('id', entry.id)
          .eq('user_id', user.id),
      );

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      await loadFlow();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao reorganizar matérias sem horário.');
    }
  };

  const toDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderMonthlyView = () => {
    const year = currentWeek.getFullYear();
    const month = currentWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const numDays = new Date(year, month + 1, 0).getDate();
    let startDayOfWeek = firstDay.getDay(); 
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const daysInMonth = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return toDateKey(d);
    });

    const blankDays = Array.from({ length: startDayOfWeek });
    const weekdayHeaders = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

    return (
      <div className="w-full flex-1 flex flex-col gap-2 min-h-[420px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="grid grid-cols-7 gap-1.5 mb-1 text-center">
          {weekdayHeaders.map((day) => (
            <div key={day} className="text-[10px] font-black text-muted-foreground tracking-widest py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
          {blankDays.map((_, i) => (
            <div key={`blank-${i}`} className="bg-muted/5 border border-border/10 rounded-2xl min-h-[85px] opacity-40" />
          ))}
          {daysInMonth.map((dateStr) => {
            const dateObj = new Date(`${dateStr}T12:00:00`);
            const dayEntries = mappedEntries.filter((e) => e.date === dateStr);
            const isToday = dateStr === toDateKey(new Date());

            return (
              <div 
                key={dateStr}
                onClick={() => { setSelectedDay(dateStr); setDayDetailOpen(true); }}
                className={cn(
                  "bg-card hover:bg-muted/50 border border-border/30 rounded-2xl p-2 min-h-[85px] flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md",
                  isToday && "border-primary ring-2 ring-primary/20 bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-black rounded-lg h-5 w-5 flex items-center justify-center",
                    isToday ? "bg-primary text-white" : "text-foreground"
                  )}>
                    {dateObj.getDate()}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                      {dayEntries.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-hidden custom-scrollbar">
                  {dayEntries.slice(0, 3).map((entry) => {
                    const subject = subjectById.get(entry.subjectId);
                    return (
                      <div 
                        key={entry.id}
                        style={{ borderLeftColor: subject?.color || '#a3a3a3' }}
                        className="text-[9px] font-bold border-l-2 pl-1 truncate leading-tight py-0.5 bg-muted/40 rounded-r-md text-foreground/90"
                      >
                        {subject?.name || 'Matéria'}
                      </div>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <div className="text-[8px] font-black text-muted-foreground pl-1">
                      +{dayEntries.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearlyView = () => {
    const year = currentWeek.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 w-full min-h-[420px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        {months.map((monthDate) => {
          const monthIndex = monthDate.getMonth();
          const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long' });
          const yearStr = monthDate.getFullYear();
          
          const monthEntries = mappedEntries.filter((entry) => {
            const entryDate = new Date(`${entry.date}T12:00:00`);
            return entryDate.getFullYear() === yearStr && entryDate.getMonth() === monthIndex;
          });

          const completedEntries = monthEntries.filter(e => e.completed);

          return (
            <div 
              key={monthIndex}
              onClick={() => {
                const newD = new Date(currentWeek);
                newD.setMonth(monthIndex);
                setCurrentWeek(newD);
                setViewMode('monthly');
              }}
              className="bg-card hover:bg-muted/50 border border-border/30 rounded-3xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
            >
              <div>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{yearStr}</span>
                <h3 className="font-display font-black text-base text-foreground capitalize leading-tight mt-0.5">{monthLabel}</h3>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-foreground">{monthEntries.length}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matérias</span>
                </div>
                <div className="w-full bg-black/5 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${monthEntries.length > 0 ? (completedEntries.length / monthEntries.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-muted-foreground mt-1.5 uppercase">
                  {completedEntries.length} de {monthEntries.length} concluídas
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const toggleEntry = async (entry: ScheduleEntryRow) => { const { error } = await supabase.from('schedule_entries').update({ completed: !entry.completed }).eq('id', entry.id).eq('user_id', user?.id || ''); if (error) { toast.error('Erro ao atualizar item.'); return; } await loadFlow(); };
  const toggleEntryComplete = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const { error } = await supabase.from('schedule_entries').update({ completed: !entry.completed }).eq('id', entryId).eq('user_id', user?.id || '');
    if (error) { toast.error('Erro ao atualizar item.'); return; }
    await loadFlow();
  };
  const deleteEntry = async (entryId: string) => { if (!confirm('Deseja remover este item do cronograma?')) return; const { error } = await supabase.from('schedule_entries').delete().eq('id', entryId).eq('user_id', user?.id || ''); if (error) { toast.error('Erro ao remover item.'); return; } await loadFlow(); };

  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false);

  // Calculate real activity data
  const activityStats = useMemo(() => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(now.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEntries = entries.filter(e => e.date === dateStr);
      const completedCount = dayEntries.filter(e => e.completed).length;
      const totalCount = dayEntries.length;
      const intensity = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      
      return {
        label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
        intensity,
        isToday: i === 6
      };
    });

    const todayStr = now.toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.date === todayStr && e.completed);
    const todayMinutes = todayEntries.reduce((acc, curr) => acc + (Number(curr.planned_minutes) || 0), 0);
    const hours = Math.floor(todayMinutes / 60);
    const mins = todayMinutes % 60;

    const totalCompleted = entries.filter(e => e.completed).length;
    const totalPlanned = entries.length;
    const focusRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

    return {
      last7Days,
      todayTime: `${hours}h ${mins}m`,
      completedText: `${totalCompleted}/${totalPlanned}`,
      focusRate: `${focusRate}%`,
      productivity: focusRate > 80 ? 'Alta' : focusRate > 50 ? 'Média' : 'Baixa'
    };
  }, [entries]);

  if (!plan) return <div className="space-y-4"><p className="text-muted-foreground">Plano de Estudos não encontrado ou ainda carregando.</p><Button asChild variant="outline"><Link to="/plans">Voltar para planos</Link></Button></div>;

  return <div className="flex flex-col h-[calc(100vh-6rem)] w-full max-w-full mx-auto gap-3">
    {/* HEADER ROW */}
    <div className="flex flex-col lg:flex-row gap-4 shrink-0 h-auto relative group/header">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsHeaderMinimized(!isHeaderMinimized)}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 h-6 w-12 rounded-full bg-background border shadow-sm hover:bg-muted opacity-0 group-hover/header:opacity-100 transition-opacity"
      >
        {isHeaderMinimized ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>
      
      {/* HERO BANNER INFO CARD */}
      <div className={cn(
        "glass-card flex flex-col relative overflow-hidden shrink-0 border-white/40 shadow-2xl group transition-all duration-500",
        isHeaderMinimized ? "lg:w-[320px] min-h-[80px] p-4" : "lg:w-[540px] min-h-[220px]"
      )}>
        {/* Full Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          {plan.cover_image_url ? (
            <img src={plan.cover_image_url} alt={plan.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/40 to-primary/20" />
          )}
          <div className={cn(
            "absolute inset-0 transition-all duration-500",
            isHeaderMinimized ? "bg-black/60 backdrop-blur-[2px]" : "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          )} />
        </div>
        
        {/* Content Top */}
        <div className={cn("relative z-10 flex items-start justify-between transition-all duration-500", isHeaderMinimized ? "p-4" : "p-6")}>
          <div className="space-y-0.5 min-w-0">
            <h1 className={cn(
              "font-display font-black tracking-tight leading-tight transition-all truncate drop-shadow-md",
              isHeaderMinimized ? "text-xl text-white" : "text-3xl text-white"
            )}>{plan.name}</h1>
            {!isHeaderMinimized && (
              <p className="text-lg text-white/90 font-bold tracking-tight leading-none drop-shadow-sm">{plan.role_name || 'Estudo Ativo'}</p>
            )}
            {isHeaderMinimized && plan.role_name && (
              <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest truncate">{plan.role_name}</p>
            )}
          </div>
          {!isHeaderMinimized && (
            <Button onClick={openEditPlan} size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all"><Pencil className="h-4 w-4" /></Button>
          )}
        </div>

        {!isHeaderMinimized && <div className="flex-1" />}

        {/* Content Bottom */}
        <div className={cn(
          "relative z-10 flex items-end justify-between gap-4 transition-all duration-500",
          isHeaderMinimized ? "hidden" : "p-6 pt-0"
        )}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {plan.board_name && (
                <span className="text-[9px] font-black uppercase tracking-widest text-white bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">{plan.board_name}</span>
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Rev: {plan.review_interval_days || 7}d</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 w-6 rounded-full border-2 border-black/40 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-black text-white/90 uppercase tracking-tighter ml-1">
                {entries.filter(e=>e.completed).length}/{entries.length} FEITOS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITY/STATS CARD */}
      <div className={cn(
        "glass-card flex-1 relative overflow-hidden flex flex-col min-w-0 border-white/40 shadow-xl group transition-all duration-500",
        isHeaderMinimized ? "p-4" : "p-6"
      )}>
        <div className={cn("flex justify-between items-center relative z-10", isHeaderMinimized ? "mb-0" : "mb-6")}>
          <div>
            <h2 className={cn("font-display font-black tracking-tighter transition-all", isHeaderMinimized ? "text-base" : "text-xl")}>Sua Atividade</h2>
            {!isHeaderMinimized && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Últimos 7 dias</p>
            )}
          </div>
          <div className="flex gap-2">
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold border border-primary/10 whitespace-nowrap">Produtividade: {activityStats.productivity}</div>
          </div>
        </div>

        <div className={cn(
          "flex-1 flex items-end justify-between gap-2 px-1 relative z-10 transition-all duration-500",
          isHeaderMinimized ? "hidden" : "mb-2"
        )}>
          {activityStats.last7Days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar cursor-help">
              <div className="w-full relative h-32 bg-black/5 rounded-xl overflow-hidden border border-black/5">
                <div 
                  className={cn(
                    "absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-700 ease-out",
                    day.isToday ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-black/20 group-hover/bar:bg-black/30"
                  )}
                  style={{ height: `${Math.max(day.intensity, 5)}%` }}
                />
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-tighter transition-colors",
                day.isToday ? "text-primary" : "text-muted-foreground/60"
              )}>
                {day.label}
              </span>
            </div>
          ))}
        </div>

        <div className={cn(
          "grid gap-4 pt-4 border-t border-black/5 relative z-10 transition-all duration-500",
          isHeaderMinimized ? "grid-cols-3 mt-2" : "grid-cols-3 mt-4"
        )}>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tempo Hoje</span>
            <span className={cn("font-black tracking-tight leading-none transition-all", isHeaderMinimized ? "text-sm" : "text-lg")}>{activityStats.todayTime}</span>
          </div>
          <div className="flex flex-col border-x border-black/5 px-4">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Concluídos</span>
            <span className={cn("font-black tracking-tight leading-none transition-all", isHeaderMinimized ? "text-sm" : "text-lg")}>{activityStats.completedText}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Foco</span>
            <span className={cn("font-black tracking-tight leading-none text-primary transition-all", isHeaderMinimized ? "text-sm" : "text-lg")}>{activityStats.focusRate}</span>
          </div>
        </div>
      </div>
    </div>

    {/* CRONOGRAMA ROW */}
    <div className="glass-card flex-1 flex flex-col p-5 overflow-hidden min-h-[450px]">
      {/* 2. Seletor de Período (Semanal, Mensal, Anual) e 1. Navegador de Data Centralizado e Maior */}
      <div className="flex flex-col gap-4 mb-6 shrink-0 border-b border-black/5 pb-5">
        {/* Top Header Row: Title & Matérias Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-black tracking-tight text-foreground">Cronograma</h2>
            <p className="text-xs text-muted-foreground font-semibold">Gerencie e acompanhe sua rotina de estudos de forma flexível.</p>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setManageSubjectsOpen(true)} 
            className="rounded-2xl border-2 hover:bg-muted font-bold text-xs h-10 px-4 shrink-0 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-primary" />
            Matérias ({planSubjects.length})
          </Button>
        </div>

        {/* Central Larger Navigator & Period Selector Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-3 rounded-3xl border border-border/20 relative">
          
          {/* 2. Selector for Weekly / Monthly / Annual */}
          <div className="flex items-center bg-muted/80 p-1 rounded-2xl border shadow-sm z-10">
            <button 
              onClick={() => setViewMode('weekly')} 
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer",
                viewMode === 'weekly' 
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semanal
            </button>
            <button 
              onClick={() => setViewMode('monthly')} 
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer",
                viewMode === 'monthly' 
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensal
            </button>
            <button 
              onClick={() => setViewMode('yearly')} 
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer",
                viewMode === 'yearly' 
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
            </button>
          </div>

          {/* 1. Large, Centered Date Navigator Component */}
          <div className="flex items-center justify-center gap-3 bg-card px-5 py-2.5 rounded-2xl border border-border/40 shadow-md min-w-[280px] md:absolute md:left-1/2 md:-translate-x-1/2 transition-all z-10">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 border transition-all active:scale-95" 
              onClick={handlePrevPeriod}
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
            </Button>
            
            <div className="flex flex-col items-center justify-center text-center px-2 select-none">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">
                {viewMode === 'weekly' ? 'Semana Atual' : viewMode === 'monthly' ? 'Mês Selecionado' : 'Ano Selecionado'}
              </span>
              <span className="text-sm font-black text-foreground leading-tight tracking-tight whitespace-nowrap">
                {getFormattedPeriodLabel()}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 border transition-all active:scale-95" 
              onClick={handleNextPeriod}
            >
              <ChevronRight className="h-5 w-5 stroke-[2.5]" />
            </Button>
          </div>

          {/* Right Spacer for Desktop alignment */}
          <div className="hidden md:block w-[180px] shrink-0" />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative -mx-2 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar pb-4">
        {loadingFlow ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando cronograma...</p> : (
           viewMode === 'weekly' ? (
             <WeeklyPlannerView
               currentDate={currentWeek}
               schedule={mappedEntries}
               sessions={[]}
               notes={[]}
               dayPlans={[]}
               sessionPauses={[]}
               getSubjectById={(id) => subjectById.get(id) as any}
               getScheduleForDateOverride={(date) => mappedEntries.filter(e => e.date === date)}
               toggleScheduleCompleteOverride={toggleEntryComplete}
               onAdd={(date) => { setEditingEntryId(null); setEntryForm(f => ({ ...f, date })); setEntryOpen(true); }}
               onRemove={deleteEntry}
               onEditEntry={(entry) => { setSelectedDay(entry.date); setDayDetailOpen(true); }}
               onOpenDay={(date) => { setSelectedDay(date); setDayDetailOpen(true); }}
               onMoveEntry={handleMoveEntry}
               onUntimedDrop={handleUntimedDrop}
             />
           ) : viewMode === 'monthly' ? (
             renderMonthlyView()
           ) : (
             renderYearlyView()
           )
        )}
      </div>
    </div>
    {/* RESPONSIVE PANEL: EDITAR PLANO (Side on Desktop, Bottom on Mobile) */}
    <ResponsivePanel
      open={editPlanOpen}
      onOpenChange={setEditPlanOpen}
      title="Editar Plano de Estudos"
      description="Atualize as informações principais do seu plano."
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={() => setEditPlanOpen(false)} className="flex-1 h-12 rounded-xl font-bold border-2">Cancelar</Button>
          <Button onClick={savePlan} disabled={submitting} className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3">
          <Label htmlFor="plan_type_panel" className="font-bold">Tipo do plano *</Label>
          <Select 
            value={planForm.plan_type || 'concurso'} 
            onValueChange={(val: any) => setPlanForm(f => ({ 
              ...f, 
              plan_type: val,
              name: val === 'concurso' ? (f.exam_name || f.name) : f.name
            }))}
          >
            <SelectTrigger id="plan_type_panel" className="h-12 rounded-xl border-2 focus:ring-primary transition-all">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concurso">Concurso Público</SelectItem>
              <SelectItem value="faculdade">Faculdade / Acadêmico</SelectItem>
              <SelectItem value="outro">Outros objetivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {planForm.plan_type === 'concurso' ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="exam_name_panel" className="font-bold">Concurso *</Label>
              <Input 
                id="exam_name_panel"
                value={planForm.exam_name} 
                onChange={(e) => setPlanForm((f) => ({ ...f, exam_name: e.target.value, name: e.target.value }))} 
                className="h-12 rounded-xl border-2" 
                placeholder="Ex: PMDF" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="board_name_panel" className="font-bold">Banca</Label>
              <Input id="board_name_panel" value={planForm.board_name} onChange={(e) => setPlanForm((f) => ({ ...f, board_name: e.target.value }))} className="h-12 rounded-xl border-2" placeholder="Ex: CEBRASPE" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role_name_panel" className="font-bold">Cargo</Label>
              <Input id="role_name_panel" value={planForm.role_name} onChange={(e) => setPlanForm((f) => ({ ...f, role_name: e.target.value }))} className="h-12 rounded-xl border-2" placeholder="Ex: Soldado" />
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="name_panel" className="font-bold">Nome do Plano *</Label>
            <Input id="name_panel" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} className="h-12 rounded-xl border-2" />
          </div>
        )}

        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label className="font-bold">Imagem do plano</Label>
            <ImageUpload 
              value={planForm.cover_image_url || ''} 
              onChange={(url) => setPlanForm({...planForm, cover_image_url: url})} 
              className="aspect-video w-full rounded-2xl border-2 border-dashed"
            />
            <p className="text-[10px] text-muted-foreground font-medium">Envie uma imagem ou informe uma URL externa.</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="review_interval_panel" className="font-bold">Revisão automática</Label>
            <Input 
              id="review_interval_panel" 
              type="number" 
              min={1}
              value={planForm.review_interval_days} 
              onChange={(e) => setPlanForm({...planForm, review_interval_days: parseInt(e.target.value)})} 
              className="h-12 rounded-xl border-2"
            />
            <p className="text-[10px] text-muted-foreground font-medium italic">Intervalo em dias para revisões automáticas.</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description_panel" className="font-bold">Descrição</Label>
          <Textarea id="description_panel" rows={4} value={planForm.description || ''} onChange={(e) => setPlanForm({...planForm, description: e.target.value})} className="rounded-2xl border-2 resize-none" />
        </div>
      </div>
    </ResponsivePanel>
    <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editingSubjectId ? 'Editar matéria' : 'Adicionar matéria ao plano'}</DialogTitle><DialogDescription>{editingSubjectId ? 'Atualize os dados da matéria.' : 'Use uma matéria já cadastrada ou crie uma nova.'}</DialogDescription></DialogHeader>{editingSubjectId ? <SubjectForm subjectForm={subjectForm} setSubjectForm={setSubjectForm} /> : <Tabs defaultValue="existing" className="pt-2"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="existing">Matéria existente</TabsTrigger><TabsTrigger value="new">Nova matéria</TabsTrigger></TabsList><TabsContent value="existing" className="space-y-4 pt-4"><div className="grid gap-2"><Label>Matéria cadastrada</Label><Select value={selectedExistingSubjectId} onValueChange={setSelectedExistingSubjectId}><SelectTrigger><SelectValue placeholder="Selecione uma matéria" /></SelectTrigger><SelectContent>{availableSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select>{availableSubjects.length === 0 ? <p className="text-xs text-muted-foreground">Todas as matérias já estão vinculadas a este plano.</p> : null}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSubjectOpen(false)}>Cancelar</Button><Button onClick={linkExistingSubject} disabled={submitting || !selectedExistingSubjectId}><Link2 className="mr-1.5 h-4 w-4" />Adicionar existente</Button></div></TabsContent><TabsContent value="new" className="space-y-4 pt-4"><SubjectForm subjectForm={subjectForm} setSubjectForm={setSubjectForm} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSubjectOpen(false)}>Cancelar</Button><Button onClick={saveNewSubject} disabled={submitting}><Plus className="mr-1.5 h-4 w-4" />Criar e adicionar</Button></div></TabsContent></Tabs>}{editingSubjectId ? <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setSubjectOpen(false)}>Cancelar</Button><Button onClick={saveNewSubject} disabled={submitting}>Salvar matéria</Button></div> : null}</DialogContent></Dialog>
    <Dialog open={templateOpen} onOpenChange={setTemplateOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Criar template do plano</DialogTitle><DialogDescription>Este modelo semanal ficará vinculado ao plano e ao cronograma interno dele.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Nome do template *</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Semana padrão PMDF" /></div><div className="grid gap-2"><Label>Descrição</Label><Textarea value={templateForm.description} onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: Modelo base com matérias por dia" /></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancelar</Button><Button onClick={saveTemplate} disabled={submitting}>{submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}Criar template</Button></div></DialogContent></Dialog>
    <Dialog open={templateItemOpen} onOpenChange={setTemplateItemOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Adicionar matéria ao template</DialogTitle><DialogDescription>Escolha o dia da semana e a matéria do plano.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Template *</Label><Select value={templateItemForm.template_id} onValueChange={(value) => setTemplateItemForm((f) => ({ ...f, template_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger><SelectContent>{planTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Dia da semana *</Label><Select value={templateItemForm.day_of_week} onValueChange={(value) => setTemplateItemForm((f) => ({ ...f, day_of_week: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAY_NAMES_SHORT.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Matéria *</Label><Select value={templateItemForm.subject_id} onValueChange={(value) => setTemplateItemForm((f) => ({ ...f, subject_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione uma matéria" /></SelectTrigger><SelectContent>{planSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Horário</Label><Input type="time" value={templateItemForm.start_time} onChange={(e) => setTemplateItemForm((f) => ({ ...f, start_time: e.target.value }))} /></div><div className="grid gap-2"><Label>Minutos</Label><Input type="number" min={1} value={templateItemForm.planned_minutes} onChange={(e) => setTemplateItemForm((f) => ({ ...f, planned_minutes: Number(e.target.value) }))} /></div></div><div className="grid gap-2"><Label>Observação</Label><Textarea value={templateItemForm.item_note} onChange={(e) => setTemplateItemForm((f) => ({ ...f, item_note: e.target.value }))} placeholder="Ex.: teoria, questões ou revisão" /></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTemplateItemOpen(false)}>Cancelar</Button><Button onClick={saveTemplateItem} disabled={submitting}>Adicionar ao template</Button></div></DialogContent></Dialog>
    <Dialog open={applyTemplateOpen} onOpenChange={setApplyTemplateOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Aplicar template no cronograma</DialogTitle><DialogDescription>O sistema vai gerar os itens no cronograma vinculado a este plano.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Template *</Label><Select value={applyTemplateForm.template_id} onValueChange={(value) => setApplyTemplateForm((f) => ({ ...f, template_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger><SelectContent>{planTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Data inicial *</Label><Input type="date" value={applyTemplateForm.start_date} onChange={(e) => setApplyTemplateForm((f) => ({ ...f, start_date: e.target.value }))} /></div><div className="grid gap-2"><Label>Data final *</Label><Input type="date" value={applyTemplateForm.end_date} onChange={(e) => setApplyTemplateForm((f) => ({ ...f, end_date: e.target.value }))} /></div></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setApplyTemplateOpen(false)}>Cancelar</Button><Button onClick={applySelectedTemplate} disabled={submitting}>{submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-1.5 h-4 w-4" />}Aplicar no cronograma</Button></div></DialogContent></Dialog>
    <ResponsivePanel 
      open={entryOpen} 
      onOpenChange={(open) => { setEntryOpen(open); if(!open) setEditingEntryId(null); }}
      title={editingEntryId ? "Editar matéria" : "Adicionar no cronograma"}
      description={editingEntryId ? "Ajuste os horários e metas para este dia." : "Escolha a matéria, data e tempo planejado."}
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => setEntryOpen(false)} className="flex-1 sm:flex-none">Cancelar</Button>
          <Button onClick={saveEntry} disabled={submitting} className="flex-1 sm:flex-none">
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {editingEntryId ? "Salvar alterações" : `Adicionar ${entryForm.repeat_value > 1 ? `(${entryForm.repeat_value}x)` : ''}`}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Matéria *</Label>
          <Select value={entryForm.subject_id} onValueChange={(value) => setEntryForm((f) => ({ ...f, subject_id: value }))}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione uma matéria" />
            </SelectTrigger>
            <SelectContent>
              {planSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Data *</Label>
            <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label>Horário</Label>
              <Input type="time" value={entryForm.start_time} onChange={(e) => setEntryForm((f) => ({ ...f, start_time: e.target.value }))} className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label>Minutos</Label>
              <Input type="number" min={1} value={entryForm.planned_minutes} onChange={(e) => setEntryForm((f) => ({ ...f, planned_minutes: Number(e.target.value) }))} className="h-11" />
            </div>
          </div>
        </div>

        {!editingEntryId && (
          <div className="grid gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="flex items-center justify-between">
            <Label className="text-primary font-bold">Recorrência</Label>
            <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Ativo</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Select value={entryForm.repeat_frequency} onValueChange={(val: any) => setEntryForm(f => ({ ...f, repeat_frequency: val }))}>
              <SelectTrigger className="bg-white h-10 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">por</span>
              <Input type="number" min={1} max={365} value={entryForm.repeat_value} onChange={(e) => setEntryForm((f) => ({ ...f, repeat_value: Number(e.target.value) }))} className="w-20 bg-white h-10" />
              <Select value={entryForm.repeat_unit} onValueChange={(val: any) => setEntryForm(f => ({ ...f, repeat_unit: val }))}>
                <SelectTrigger className="w-full bg-white h-10 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

        <div className="grid gap-2">
          <Label>Observação</Label>
          <Textarea value={entryForm.item_note} onChange={(e) => setEntryForm((f) => ({ ...f, item_note: e.target.value }))} placeholder="Ex.: teoria, questões ou revisão" rows={3} className="resize-none" />
        </div>
      </div>
    </ResponsivePanel>

    <DayDetailSheet
      open={dayDetailOpen}
      date={selectedDay}
      onOpenChange={setDayDetailOpen}
      onAdd={(date) => { setEditingEntryId(null); setEntryForm(f => ({ ...f, date })); setEntryOpen(true); }}
      onNote={(date) => { 
        // For now, use a simple prompt for notes if we don't have a better UI here
        const content = prompt('Informe a observação para este dia:');
        if (content) {
          void supabase.from('notes').insert({
            user_id: user?.id,
            type: 'day',
            referenceDate: date,
            content: content.trim()
          }).then(() => loadFlow());
        }
      }}
      onMove={() => toast.info('Funcionalidade em desenvolvimento para esta tela.')}
      onChange={() => toast.info('Funcionalidade em desenvolvimento para esta tela.')}
      onRemove={deleteEntry}
      onApplyRecurrence={handleApplyRecurrence}
    />

    <ResponsivePanel
      open={manageSubjectsOpen}
      onOpenChange={setManageSubjectsOpen}
      size="xl"
      title="Gerenciar Matérias"
      description="Visualize o catálogo e selecione as matérias deste plano."
    >
      <div className="pb-10">
        <SubjectSelector 
          planId={planId!} 
          onFinish={() => setManageSubjectsOpen(false)} 
        />
      </div>
    </ResponsivePanel>
  </div>;
}

function SubjectForm({ subjectForm, setSubjectForm }: { subjectForm: typeof EMPTY_SUBJECT_FORM; setSubjectForm: React.Dispatch<React.SetStateAction<typeof EMPTY_SUBJECT_FORM>> }) {
  return <div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Nome da matéria *</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Português" /></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Categoria</Label><Input value={subjectForm.category} onChange={(e) => setSubjectForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex.: Conhecimentos básicos" /></div><div className="grid gap-2"><Label>Cor</Label><Input type="color" value={subjectForm.color} onChange={(e) => setSubjectForm((f) => ({ ...f, color: e.target.value }))} /></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Meta semanal (h)</Label><Input type="number" min={0} value={subjectForm.weekly_goal_hours} onChange={(e) => setSubjectForm((f) => ({ ...f, weekly_goal_hours: Number(e.target.value) }))} /></div><div className="grid gap-2"><Label>Meta mensal (h)</Label><Input type="number" min={0} value={subjectForm.monthly_goal_hours} onChange={(e) => setSubjectForm((f) => ({ ...f, monthly_goal_hours: Number(e.target.value) }))} /></div></div><div className="grid gap-2"><Label>Descrição</Label><Textarea value={subjectForm.description} onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))} /></div></div>;
}
