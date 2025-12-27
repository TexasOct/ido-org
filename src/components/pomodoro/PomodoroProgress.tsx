import { useTranslation } from 'react-i18next'
import { Clock, Coffee } from 'lucide-react'

import { usePomodoroStore } from '@/lib/stores/pomodoro'
import { Progress } from '@/components/ui/progress'

export function PomodoroProgress() {
  const { t } = useTranslation()
  const { session } = usePomodoroStore()

  if (!session) {
    return null
  }

  const currentRound = session.currentRound || 1
  const totalRounds = session.totalRounds || 2
  const completedRounds = session.completedRounds || 0
  const currentPhase = session.currentPhase || 'work'

  const isCompleted = currentPhase === 'completed'
  const progressPercentage = (completedRounds / totalRounds) * 100

  return (
    <div className="space-y-4">
      {/* Round Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">
            {isCompleted
              ? t('pomodoro.progress.completed')
              : t('pomodoro.progress.roundIndicator', {
                  current: currentRound,
                  total: totalRounds
                })}
          </span>
          {currentPhase === 'work' && <Clock className="text-primary h-5 w-5" />}
          {currentPhase === 'break' && <Coffee className="text-secondary h-5 w-5" />}
        </div>
        <span className="text-muted-foreground text-sm">
          {completedRounds}/{totalRounds} {t('pomodoro.progress.roundsComplete')}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercentage} className="h-2" />
    </div>
  )
}
