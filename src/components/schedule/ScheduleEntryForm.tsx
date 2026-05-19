import React from 'react';
import { Subject, SubjectArea, SubjectCategory } from '@/types/study';
import { SubjectFinder } from '@/components/generic/subject-finder';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RecurrenceOptions, RecurrenceOptionsValue } from '@/components/schedule/RecurrenceOptions';

export interface ScheduleEntryFormValue {
  subjectId: string;
  date: string;
  startTime: string;
  plannedMinutes?: number;
  itemNote: string;
  optional: boolean;
  recurrence: RecurrenceOptionsValue;
}

interface ScheduleEntryFormProps {
  value: ScheduleEntryFormValue;
  onChange: (next: ScheduleEntryFormValue) => void;
  subjects: Subject[];
  areas?: SubjectArea[];
  categories?: SubjectCategory[];
  onCreateSubject?: () => void;
  showDate?: boolean;
  dateLabel?: string;
  subjectPlaceholder?: string;
  recurrenceReferenceDate?: string;
  recurrenceSubjectName?: string;
}

export function ScheduleEntryForm({
  value,
  onChange,
  subjects,
  areas = [],
  categories = [],
  onCreateSubject,
  showDate = true,
  dateLabel = 'Data',
  subjectPlaceholder = 'Selecione uma matéria',
  recurrenceReferenceDate,
  recurrenceSubjectName,
}: ScheduleEntryFormProps) {
  const update = (patch: Partial<ScheduleEntryFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label>Matéria *</Label>
        <SubjectFinder
          value={value.subjectId}
          onChange={(subjectId) => update({ subjectId })}
          subjects={subjects}
          areas={areas}
          categories={categories}
          onCreateSubject={onCreateSubject}
          placeholder={subjectPlaceholder}
        />
      </div>

      {showDate ? (
        <div className="grid gap-2">
          <Label>{dateLabel} *</Label>
          <Input type="date" value={value.date} onChange={(event) => update({ date: event.target.value })} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Horário</Label>
          <Input type="time" value={value.startTime} onChange={(event) => update({ startTime: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label>Minutos</Label>
          <Input
            type="number"
            min={1}
            value={value.plannedMinutes ?? ''}
            onChange={(event) =>
              update({
                plannedMinutes: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </div>
        <label className="flex items-center gap-2 self-end rounded-xl border border-border/60 px-3 py-2 text-sm">
          <Checkbox
            checked={value.optional}
            onCheckedChange={(checked) => update({ optional: checked === true })}
          />
          Matéria opcional
        </label>
      </div>

      <div className="grid gap-2">
        <Label>Observação</Label>
        <Textarea
          value={value.itemNote}
          onChange={(event) => update({ itemNote: event.target.value })}
          placeholder="Ex.: teoria, questões ou revisão"
          rows={3}
        />
      </div>

      <RecurrenceOptions
        value={value.recurrence}
        onChange={(patch) => update({ recurrence: { ...value.recurrence, ...patch } })}
        referenceDate={recurrenceReferenceDate || value.date}
        subjectName={recurrenceSubjectName}
      />
    </div>
  );
}
