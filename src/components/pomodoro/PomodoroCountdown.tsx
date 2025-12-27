import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Coffee } from 'lucide-react'

import { usePomodoroStore } from '@/lib/stores/pomodoro'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

export function PomodoroCountdown() {
  const { t } = useTranslation()
  const { session } = usePomodoroStore()
  const [colonVisible, setColonVisible] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second for real-time calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Blinking colon effect
  useEffect(() => {
    const interval = setInterval(() => {
      setColonVisible((prev) => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  if (!session) {
    return null
  }

  const formatTime = (totalSeconds: number): { digits: string[]; hasHours: boolean } => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return {
        digits: [
          ...hours.toString().padStart(2, '0').split(''),
          ...minutes.toString().padStart(2, '0').split(''),
          ...seconds.toString().padStart(2, '0').split('')
        ],
        hasHours: true
      }
    }
    return {
      digits: [...minutes.toString().padStart(2, '0').split(''), ...seconds.toString().padStart(2, '0').split('')],
      hasHours: false
    }
  }

  const currentPhase = session.currentPhase || 'work'
  const isWorkPhase = currentPhase === 'work'
  const isBreakPhase = currentPhase === 'break'
  const isCompleted = currentPhase === 'completed'

  // Calculate remaining seconds based on phase start time (works even when page is in background)
  const phaseDurationSeconds = isWorkPhase
    ? (session.workDurationMinutes || 25) * 60
    : (session.breakDurationMinutes || 5) * 60

  let remainingSeconds = 0
  if (!isCompleted && session) {
    // Use phaseStartTime for reliable calculation
    const phaseStartTime = session.phaseStartTime ? new Date(session.phaseStartTime).getTime() : null

    if (phaseStartTime) {
      // Calculate elapsed time since phase started
      const elapsedSeconds = Math.floor((currentTime - phaseStartTime) / 1000)

      // Remaining time = phase duration - elapsed time
      remainingSeconds = Math.max(0, phaseDurationSeconds - elapsedSeconds)
    } else if (session.remainingPhaseSeconds != null) {
      // Fallback: use server's calculated value if phaseStartTime not available
      remainingSeconds = session.remainingPhaseSeconds
    } else {
      // Last resort: show full duration
      remainingSeconds = phaseDurationSeconds
    }
  }

  // Calculate progress percentage
  const progress = isCompleted ? 100 : ((phaseDurationSeconds - remainingSeconds) / phaseDurationSeconds) * 100

  const progressColor = isWorkPhase
    ? 'hsl(var(--primary))'
    : isBreakPhase
      ? 'hsl(var(--chart-2))'
      : 'hsl(var(--muted-foreground))'

  const timeData = isCompleted ? { digits: ['0', '0', '0', '0'], hasHours: false } : formatTime(remainingSeconds)

  // Digital clock color - inverted theme (light mode: white text on black, dark mode: black text on white)
  const digitColor = 'text-white dark:text-black'

  // Subtle shadow for better contrast
  const textShadow = '0 2px 4px rgba(0, 0, 0, 0.15)'

  const glowColor = isWorkPhase
    ? 'rgba(59, 130, 246, 0.8)' // Blue glow
    : isBreakPhase
      ? 'rgba(16, 185, 129, 0.8)' // Green glow
      : 'rgba(128, 128, 128, 0.5)'

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-4">
      {/* Digital Clock Display with integrated info */}
      <div className="relative w-full max-w-2xl">
        {/* Background glow */}
        <div className="absolute inset-0 -m-3 rounded-2xl opacity-15 blur-2xl" style={{ backgroundColor: glowColor }} />

        {/* Digital display container */}
        <div className="border-border/50 bg-card relative rounded-xl border-2 px-6 py-4 shadow-xl backdrop-blur-sm">
          {/* Top row: Phase indicator + Round info */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isWorkPhase && (
                <>
                  <Clock className="text-primary h-5 w-5" />
                  <span className="text-primary text-base font-semibold">{t('pomodoro.phase.work')}</span>
                </>
              )}
              {isBreakPhase && (
                <>
                  <Coffee className="text-chart-2 h-5 w-5" />
                  <span className="text-chart-2 text-base font-semibold">{t('pomodoro.phase.break')}</span>
                </>
              )}
              {isCompleted && (
                <span className="text-muted-foreground text-base font-semibold">{t('pomodoro.phase.completed')}</span>
              )}
            </div>
            {!isCompleted && (
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <div>
                  {isWorkPhase && session.workDurationMinutes
                    ? `${session.workDurationMinutes}${t('pomodoro.config.minutes')}`
                    : session.breakDurationMinutes
                      ? `${session.breakDurationMinutes}${t('pomodoro.config.minutes')}`
                      : ''}
                </div>
                <div className="bg-border h-4 w-px" />
                <div className="text-base font-bold" style={{ color: progressColor }}>
                  {Math.round(progress)}%
                </div>
              </div>
            )}
          </div>

          <Separator className="mb-4" />

          {/* Main time display - Flip clock style */}
          <div className="flex items-center justify-center gap-6">
            {/* Time digits */}
            <div className="flex items-center justify-center gap-2">
              {/* First pair of digits (hours or minutes) */}
              <div className="flex gap-2">
                {/* Flip card digit 1 */}
                <div className="relative h-24 w-16">
                  <div
                    className={cn(
                      'absolute inset-0 overflow-hidden rounded-lg shadow-lg transition-all duration-500',
                      'bg-gray-900 dark:bg-gray-100'
                    )}>
                    {/* Top half */}
                    <div className="border-border/50 absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-lg border-b">
                      <div
                        className={cn(
                          'flex h-24 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[0]}
                      </div>
                    </div>
                    {/* Bottom half */}
                    <div className="border-border/50 absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-lg border-t">
                      <div
                        className={cn(
                          'flex h-24 -translate-y-12 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[0]}
                      </div>
                    </div>
                    {/* Center divider line */}
                    <div className="bg-border absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 shadow-sm" />
                  </div>
                </div>

                {/* Flip card digit 2 */}
                <div className="relative h-24 w-16">
                  <div
                    className={cn(
                      'absolute inset-0 overflow-hidden rounded-lg shadow-lg transition-all duration-500',
                      'bg-gray-900 dark:bg-gray-100'
                    )}>
                    <div className="border-border/50 absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-lg border-b">
                      <div
                        className={cn(
                          'flex h-24 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[1]}
                      </div>
                    </div>
                    <div className="border-border/50 absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-lg border-t">
                      <div
                        className={cn(
                          'flex h-24 -translate-y-12 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[1]}
                      </div>
                    </div>
                    <div className="bg-border absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 shadow-sm" />
                  </div>
                </div>
              </div>

              {/* Colon separator */}
              <div
                className={cn(
                  'flex h-24 w-6 flex-col items-center justify-center gap-4 font-mono text-4xl font-bold transition-opacity',
                  'text-gray-900 dark:text-gray-100',
                  colonVisible ? 'opacity-100' : 'opacity-30'
                )}>
                <div className="h-2.5 w-2.5 rounded-full bg-current shadow-sm" />
                <div className="h-2.5 w-2.5 rounded-full bg-current shadow-sm" />
              </div>

              {/* Second pair of digits (minutes or seconds) */}
              <div className="flex gap-2">
                {/* Flip card digit 3 */}
                <div className="relative h-24 w-16">
                  <div
                    className={cn(
                      'absolute inset-0 overflow-hidden rounded-lg shadow-lg transition-all duration-500',
                      'bg-gray-900 dark:bg-gray-100'
                    )}>
                    <div className="border-border/50 absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-lg border-b">
                      <div
                        className={cn(
                          'flex h-24 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[2]}
                      </div>
                    </div>
                    <div className="border-border/50 absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-lg border-t">
                      <div
                        className={cn(
                          'flex h-24 -translate-y-12 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[2]}
                      </div>
                    </div>
                    <div className="bg-border absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 shadow-sm" />
                  </div>
                </div>

                {/* Flip card digit 4 */}
                <div className="relative h-24 w-16">
                  <div
                    className={cn(
                      'absolute inset-0 overflow-hidden rounded-lg shadow-lg transition-all duration-500',
                      'bg-gray-900 dark:bg-gray-100'
                    )}>
                    <div className="border-border/50 absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-lg border-b">
                      <div
                        className={cn(
                          'flex h-24 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[3]}
                      </div>
                    </div>
                    <div className="border-border/50 absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-lg border-t">
                      <div
                        className={cn(
                          'flex h-24 -translate-y-12 items-center justify-center font-mono text-6xl font-bold tabular-nums',
                          digitColor
                        )}
                        style={{
                          textShadow
                        }}>
                        {timeData.digits[3]}
                      </div>
                    </div>
                    <div className="bg-border absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
