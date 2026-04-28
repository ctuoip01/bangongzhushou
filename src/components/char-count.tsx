'use client';

import { cn } from '@/lib/utils';

interface CharCountProps {
  current: number;
  max?: number;
  showCount?: boolean;
  className?: string;
}

export function CharCount({ 
  current, 
  max, 
  showCount = true,
  className 
}: CharCountProps) {
  if (!showCount) return null;

  const isOverLimit = max !== undefined && current > max;
  const percentage = max ? (current / max) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      <span className={cn(isOverLimit && 'text-red-500 font-medium')}>
        {current.toLocaleString()}
      </span>
      {max && (
        <>
          <span>/</span>
          <span>{max.toLocaleString()}</span>
          {percentage > 80 && (
            <span className={cn(
              'font-medium',
              percentage > 95 ? 'text-red-500' : 'text-amber-500'
            )}>
              ({Math.round(percentage)}%)
            </span>
          )}
        </>
      )}
      {max && (
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full transition-all duration-300',
              percentage > 95 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
