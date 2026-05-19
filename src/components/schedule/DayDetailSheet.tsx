import React, { useEffect, useMemo, useState } from 'react';
import { ScheduleEntry } from '@/types/study';
import { useStudy } from '@/contexts/StudyContext';
import { DaySidebarTimerPanel } from '@/components/schedule/DaySidebarTimerPanel';
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';

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
  onApplyRecurrence?: (entryId: string, repeatValue: number, repeatUnit: string, repeatFrequency: string) => void;
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
  onApplyRecurrence,
}: DayDetailSheetProps) {
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

  useEffect(() => {
    setTargetDraftMinutes(targetMinutes);
  }, [targetMinutes, activeDate]);

  const handleTargetDraftChange = async (value?: number) => {
    setTargetDraftMinutes(value);
    if (!activeDate) return;
    await upsertScheduleDayPlan(activeDate, { dayTargetMinutes: value, isOverride: true });
  };

  const formattedDate = activeDate ? new Date(`${activeDate}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : '';

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={onOpenChange}
      title={formattedDate}
      description="Resumo do seu cronograma para este dia."
    >
      {!activeDate ? null : (
        <div className="space-y-4">
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
            onApplyRecurrence={onApplyRecurrence}
            dayNotes={dayNotes}
          />
        </div>
      )}
    </ResponsivePanel>
  );
}
