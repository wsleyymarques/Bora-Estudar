import React from 'react';

import { DetailedStatsChart } from '@/components/stats/DetailedStatsChart';

export default function StatsPage() {
  return (
    <div className="space-y-6 w-full max-w-none">
      <div className="space-y-2">
        <h1 className="text-2xl font-display font-bold text-foreground">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o volume estudado por período, matéria e distribuição geral.</p>
      </div>

      <DetailedStatsChart />
    </div>
  );
}
