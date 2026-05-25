import React from 'react';

import { DailyConsistencyCard } from '@/components/stats/DailyConsistencyCard';
import { DetailedStatsChart } from '@/components/stats/DetailedStatsChart';
import { WeeklyRankingCard } from '@/components/stats/WeeklyRankingCard';

export default function StatsPage() {
  return (
    <div className="w-full max-w-none space-y-6">




      <DetailedStatsChart />
    </div>
  );
}
