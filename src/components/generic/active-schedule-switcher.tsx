import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudy } from '@/contexts/StudyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function ActiveScheduleSwitcher() {
  const navigate = useNavigate();
  const { data, activeScheduleId, setActiveSchedule } = useStudy();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeScheduleId || '__none__'}
        onValueChange={(nextValue) => {
          if (nextValue !== '__none__') {
            void setActiveSchedule(nextValue);
          }
        }}
      >
        <SelectTrigger className="h-9 w-[220px] rounded-xl border-border/70 bg-background/80">
          <SelectValue placeholder="Selecionar cronograma" />
        </SelectTrigger>
        <SelectContent>
          {data.schedules.length === 0 ? (
            <SelectItem value="__none__" disabled>
              Sem cronogramas
            </SelectItem>
          ) : null}
          {data.schedules.map((schedule) => (
            <SelectItem key={schedule.id} value={schedule.id}>
              {schedule.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl border-border/70"
        onClick={() => navigate('/schedules')}
        title="Gerenciar cronogramas"
      >
        <CalendarClock className="h-4 w-4" />
      </Button>
    </div>
  );
}
