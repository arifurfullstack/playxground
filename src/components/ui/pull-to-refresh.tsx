import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply resistance for a natural feel
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(distance);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD / 2);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center transition-opacity"
        style={{
          top: pullDistance - 40,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg",
            isRefreshing && "animate-pulse"
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPullingRef.current ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
