import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  showBackground?: boolean;
  backgroundColor?: string;
  progressColor?: string;
}

export function CircularProgress({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  showBackground = true,
  backgroundColor,
  progressColor,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const rotation = -90;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
        {showBackground && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={backgroundColor || 'rgba(255,255,255,0.1)'}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor || 'currentColor'}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-2xl font-bold">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface CircularTimerProps {
  minutes: number;
  totalMinutes?: number;
  size?: number;
  label?: string;
  subLabel?: string;
  className?: string;
  progressColor?: string;
}

export function CircularTimer({
  minutes,
  totalMinutes = 60,
  size = 160,
  label,
  subLabel,
  className,
  progressColor,
}: CircularTimerProps) {
  const percentage = Math.min(Math.max((minutes / totalMinutes) * 100, 0), 100);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <div className={cn('relative inline-flex flex-col items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor || 'currentColor'}
          strokeWidth={10}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ transformOrigin: 'center' }}
          filter="drop-shadow(0 8px 24px rgba(34, 197, 94, 0.4))"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-black tracking-tight text-foreground leading-none">
          {minutes}
        </span>
        <span className="text-xs font-semibold text-muted-foreground mt-1">min</span>
        {label && (
          <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
        )}
        {subLabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subLabel}</p>
        )}
      </div>
    </div>
  );
}