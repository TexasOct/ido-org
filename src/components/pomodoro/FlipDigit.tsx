import { useState, useEffect } from 'react'

import { cn } from '@/lib/utils'

interface FlipDigitProps {
  digit: string
  phase: 'work' | 'break' | 'completed'
}

/**
 * Reusable flip-card digit component for Pomodoro countdown
 * Features smooth 3D flip animation when digit changes
 */
export function FlipDigit({ digit, phase }: FlipDigitProps) {
  const [currentDigit, setCurrentDigit] = useState(digit)
  const [previousDigit, setPreviousDigit] = useState(digit)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipKey, setFlipKey] = useState(0)

  useEffect(() => {
    if (digit !== currentDigit) {
      // Save the old digit for the flipping animation
      setPreviousDigit(currentDigit)
      setIsFlipping(true)
      setFlipKey((prev) => prev + 1) // Increment key to force new animation

      // Immediately update to new digit (static layers will show new digit)
      setCurrentDigit(digit)

      // Complete animation after 400ms
      const completeTimer = setTimeout(() => {
        setIsFlipping(false)
      }, 400)

      return () => {
        clearTimeout(completeTimer)
      }
    }
  }, [digit, currentDigit])

  return (
    <div className="relative h-28 w-20" style={{ perspective: '1000px' }}>
      {/* Static bottom half - shows current digit */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-14 overflow-hidden rounded-b-lg border-2 border-t-0 shadow-lg',
          'bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900',
          'transition-colors duration-300',
          phase === 'work' && 'border-primary/20',
          phase === 'break' && 'border-chart-2/20',
          phase === 'completed' && 'border-muted/20'
        )}>
        <div
          className="absolute inset-x-0 flex items-center justify-center font-mono text-6xl leading-[1] font-bold tabular-nums"
          style={{ top: '-56px', height: '112px', transform: 'translateY(-1px)' }}>
          {currentDigit}
        </div>
      </div>

      {/* Static top half - shows current digit */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-14 overflow-hidden rounded-t-lg border-2 border-b-0 shadow-lg',
          'bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900',
          'transition-colors duration-300',
          phase === 'work' && 'border-primary/20',
          phase === 'break' && 'border-chart-2/20',
          phase === 'completed' && 'border-muted/20'
        )}>
        <div
          className="absolute inset-x-0 flex items-center justify-center font-mono text-6xl leading-[1] font-bold tabular-nums"
          style={{ top: '0', height: '112px', transform: 'translateY(-1px)' }}>
          {currentDigit}
        </div>
      </div>

      {/* Animated flipping top half - shows previous digit */}
      {isFlipping && (
        <div
          key={flipKey}
          className={cn(
            'absolute inset-x-0 top-0 h-14 overflow-hidden rounded-t-lg border-2 border-b-0 shadow-2xl',
            'origin-bottom',
            'bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900',
            'transition-colors duration-300',
            phase === 'work' && 'border-primary/20',
            phase === 'break' && 'border-chart-2/20',
            phase === 'completed' && 'border-muted/20'
          )}
          style={{
            animation: 'flipDown 400ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}>
          <div
            className="absolute inset-x-0 flex items-center justify-center font-mono text-6xl leading-[1] font-bold tabular-nums"
            style={{ top: '0', height: '112px', transform: 'translateY(-1px)' }}>
            {previousDigit}
          </div>
        </div>
      )}

      {/* Center divider line */}
      <div className="bg-border pointer-events-none absolute top-1/2 right-0 left-0 z-10 h-px -translate-y-1/2" />
    </div>
  )
}
