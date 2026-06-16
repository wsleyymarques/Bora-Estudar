import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSpinnerProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  activeColorClass?: string;
}

export function TimeSpinner({ 
  value, 
  onChange, 
  min = 0, 
  max = 99, 
  step = 1, 
  className, 
  activeColorClass = "focus-within:border-primary focus-within:ring-primary text-primary" 
}: TimeSpinnerProps) {
  const handleIncrement = () => {
    if (value + step <= max) onChange(value + step);
    else onChange(max);
  };
  
  const handleDecrement = () => {
    if (value - step >= min) onChange(value - step);
    else onChange(min);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) {
      onChange(min);
      return;
    }
    if (val > max) val = max;
    if (val < min) val = min;
    onChange(val);
  };

  return (
    <div className={cn(
      "flex flex-col items-center bg-secondary border border-border/50 rounded-2xl w-20 overflow-hidden transition-all focus-within:ring-1", 
      activeColorClass, 
      className
    )}>
      <button 
        type="button" 
        onClick={handleIncrement} 
        className="w-full h-7 flex items-center justify-center text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      
      <input 
        type="number" 
        value={value} 
        onChange={handleChange}
        className="w-full text-center text-3xl font-black bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground py-0"
      />
      
      <button 
        type="button" 
        onClick={handleDecrement} 
        className="w-full h-7 flex items-center justify-center text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}
