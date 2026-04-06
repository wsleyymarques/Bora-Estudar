import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScheduleEntry } from '@/types/study';
import { useStudy } from '@/contexts/StudyContext';
import { DaySidebarTimerPanel } from '@/components/schedule/DaySidebarTimerPanel';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface EntryActionsProps {
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
}

interface DayDetailSheetProps extends EntryActionsProps {
  open: boolean;
  date: string | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (date: string) => void;
  onNote: (date: string) => void;
}

export default function DayDetailSheet({
  open,
  date,
  onOpenChange,
  onAdd,
  onNote,
  onMove,
  onChange,
  onRemove,
}: DayDetailSheetProps) {
  const isMobile = useIsMobile();
  const {
    getScheduleForDate,
    getDayPlanForDate,
    upsertScheduleDayPlan,
    updateScheduleEntry,
    toggleScheduleComplete,
    data,
  } = useStudy();

  const activeDate = date || '';
  const entries = useMemo(() => (activeDate ? getScheduleForDate(activeDate) : []), [activeDate, getScheduleForDate]);
  const dayPlan = activeDate ? getDayPlanForDate(activeDate) : undefined;
  const dayNotes = useMemo(
    () => (activeDate ? data.notes.filter((note) => note.type === 'day' && note.referenceDate === activeDate) : []),
    [activeDate, data.notes],
  );

  const [targetDraftMinutes, setTargetDraftMinutes] = useState<number | undefined>(undefined);
  const targetMinutes = dayPlan?.dayTargetMinutes;
  const templateId = entries.find((entry) => entry.templateId)?.templateId;
  const isTemplateDay = Boolean(templateId);

  useEffect(() => {
    setTargetDraftMinutes(targetMinutes);
  }, [targetMinutes, activeDate]);

  const handleTargetDraftChange = async (value?: number) => {
    setTargetDraftMinutes(value);
    if (!activeDate) return;
    await upsertScheduleDayPlan(activeDate, { dayTargetMinutes: value, isOverride: true });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'overflow-y-auto',
          isMobile ? 'w-[100dvw] max-w-none p-3' : 'w-full sm:max-w-2xl',
        )}
      >
        {!activeDate ? null : (
          <>
            <SheetHeader className="!items-start !text-left pr-8">
              <SheetTitle className="w-full text-left font-display capitalize">
                {new Date(`${activeDate}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </SheetTitle>
              <SheetDescription className="w-full text-left">
                {isTemplateDay ? 'Dia gerado por template semanal (com possiveis overrides).' : 'Painel rapido do seu cronograma.'}
              </SheetDescription>
            </SheetHeader>

            <div className={cn(isMobile ? 'mt-2' : 'mt-4')}>
              <DaySidebarTimerPanel
                date={activeDate}
                entries={entries}
                targetDraftMinutes={targetDraftMinutes}
                onTargetDraftChange={(value) => {
                  void handleTargetDraftChange(value);
                }}
                onAdd={onAdd}
                onNote={onNote}
                onMove={onMove}
                onChange={onChange}
                onRemove={onRemove}
                onToggleComplete={(id) => {
                  void toggleScheduleComplete(id);
                }}
                onUpdateEntry={(id, payload) => {
                  void updateScheduleEntry(id, payload);
                }}
                dayNotes={dayNotes}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
