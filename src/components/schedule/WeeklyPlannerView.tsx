import React from 'react';
import { ScheduleEntry } from '@/types/study';
import DayCard from './DayCard';

interface WeeklyPlannerViewProps {
  currentDate: Date;
  onAdd: (d: string) => void;
  onNote: (d: string) => void;
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
  onEditDay?: (date: string) => void;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export default function WeeklyPlannerView({ currentDate, onAdd, onNote, onMove, onChange, onRemove, onEditDay }: WeeklyPlannerViewProps) {
  const monday = getMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return fmt(d);
  });
  const today = fmt(new Date());

  const weekdays = days.slice(0, 5);
  const weekend = days.slice(5);

  return (
    <div className="space-y-4">
      {/* Weekdays: 5 columns on xl, 3 on lg, 2 on md, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {weekdays.map(date => (
          <DayCard
            key={date}
            date={date}
            isToday={date === today}
            onAdd={onAdd}
            onNote={onNote}
            onMove={onMove}
            onChange={onChange}
            onRemove={onRemove}
            onEditDay={onEditDay}
          />
        ))}
      </div>
      {/* Weekend: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weekend.map(date => (
          <DayCard
            key={date}
            date={date}
            isToday={date === today}
            onAdd={onAdd}
            onNote={onNote}
            onMove={onMove}
            onChange={onChange}
            onRemove={onRemove}
            onEditDay={onEditDay}
          />
        ))}
      </div>
    </div>
  );
}
