export function formatMinutesCompact(minutes?: number): string {
  if (minutes === undefined || minutes === null) return '-';
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem.toString().padStart(2, '0')}m`;
}

export function parseDurationInput(value: string): number | undefined {
  const txt = value.trim().toLowerCase();
  if (!txt) return undefined;
  if (/^\d+$/.test(txt)) return Math.max(0, Number(txt));

  const hMatch = txt.match(/(\d+)\s*h/);
  const mMatch = txt.match(/(\d+)\s*m|min/);
  const h = hMatch ? Number(hMatch[1]) : 0;
  const m = mMatch ? Number(mMatch[1]) : 0;
  const total = h * 60 + m;
  return total > 0 ? total : undefined;
}

