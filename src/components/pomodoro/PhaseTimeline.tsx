import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Coffee, Zap } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'

interface PhaseTimelineProps {
  sessionStart: string
  sessionEnd: string
  phaseTimeline: Array<{
    phaseType: 'work' | 'break'
    phaseNumber: number
    startTime: string
    endTime: string
    durationMinutes: number
  }>
}

export function PhaseTimeline({ sessionStart, sessionEnd, phaseTimeline }: PhaseTimelineProps) {
  const { t } = useTranslation()

  const formatTime = (isoString: string) => format(parseISO(isoString), 'HH:mm')
  const totalMinutes = Math.round((parseISO(sessionEnd).getTime() - parseISO(sessionStart).getTime()) / 60000)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('pomodoro.review.phaseTimeline.title')}
        </CardTitle>
        <div className="text-muted-foreground text-sm">
          {formatTime(sessionStart)} - {formatTime(sessionEnd)} ({totalMinutes}{' '}
          {t('pomodoro.review.phaseTimeline.minutesTotal')})
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {phaseTimeline.map((phase, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                phase.phaseType === 'work' ? 'bg-primary/5' : 'bg-muted'
              }`}>
              {phase.phaseType === 'work' ? (
                <Zap className="text-primary h-4 w-4" />
              ) : (
                <Coffee className="text-muted-foreground h-4 w-4" />
              )}

              <div className="flex-1">
                <div className="font-medium">
                  {phase.phaseType === 'work'
                    ? `${t('pomodoro.review.phaseTimeline.workPhase')} ${phase.phaseNumber}`
                    : `${t('pomodoro.review.phaseTimeline.breakPhase')} ${phase.phaseNumber}`}
                </div>
                <div className="text-muted-foreground text-sm">
                  {formatTime(phase.startTime)} - {formatTime(phase.endTime)}
                </div>
              </div>

              <Badge variant={phase.phaseType === 'work' ? 'default' : 'secondary'}>
                {phase.durationMinutes} {t('pomodoro.review.phaseTimeline.minutes')}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
