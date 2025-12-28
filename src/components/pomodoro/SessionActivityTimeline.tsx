import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FocusScoreVisualization } from './FocusScoreVisualization'
import { Clock, Hash } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Activity {
  id: string
  title: string
  description: string
  startTime?: string
  start_time?: string
  endTime?: string
  end_time?: string
  sessionDurationMinutes?: number
  session_duration_minutes?: number
  workPhase?: number | null
  work_phase?: number | null
  focusScore?: number | null
  focus_score?: number | null
  topicTags?: string[]
  topic_tags?: string[]
}

interface SessionActivityTimelineProps {
  activities: Activity[]
  totalRounds: number
}

export function SessionActivityTimeline({ activities, totalRounds }: SessionActivityTimelineProps) {
  const { t } = useTranslation()

  // Group activities by work phase
  const activityGroups = activities.reduce(
    (acc, activity) => {
      const phase = activity.workPhase ?? activity.work_phase ?? 0
      if (!acc[phase]) {
        acc[phase] = []
      }
      acc[phase].push(activity)
      return acc
    },
    {} as Record<number, Activity[]>
  )

  // Format timestamp to readable time
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '—'
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{t('pomodoro.review.activityTimeline.noActivities')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((phase) => {
        const phaseActivities = activityGroups[phase] || []

        return (
          <div key={phase} className="border-primary relative border-l-2 pl-6">
            {/* Phase header */}
            <div className="bg-primary text-primary-foreground absolute top-0 -left-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
              {phase}
            </div>
            <div className="mb-4">
              <h4 className="font-semibold">
                {t('pomodoro.review.activityTimeline.workPhase')} {phase}
              </h4>
              <p className="text-muted-foreground text-sm">
                {phaseActivities.length}{' '}
                {phaseActivities.length === 1
                  ? t('pomodoro.review.activityTimeline.activity')
                  : t('pomodoro.review.activityTimeline.activities')}
              </p>
            </div>

            {/* Activities for this phase */}
            <div className="space-y-3">
              {phaseActivities.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  {t('pomodoro.review.activityTimeline.noActivitiesInPhase')}
                </p>
              ) : (
                phaseActivities.map((activity) => (
                  <Card key={activity.id} className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-base">{activity.title}</CardTitle>
                          <p className="text-muted-foreground mt-1 text-sm">{activity.description}</p>
                        </div>
                        {activity.focusScore !== null && activity.focusScore !== undefined && (
                          <FocusScoreVisualization score={activity.focusScore} size="sm" showLabel={false} />
                        )}
                        {activity.focusScore === undefined &&
                          activity.focus_score !== null &&
                          activity.focus_score !== undefined && (
                            <FocusScoreVisualization score={activity.focus_score} size="sm" showLabel={false} />
                          )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(activity.startTime ?? activity.start_time)} -{' '}
                            {formatTime(activity.endTime ?? activity.end_time)}
                          </span>
                          <span className="text-muted-foreground/70">
                            ({activity.sessionDurationMinutes ?? activity.session_duration_minutes ?? 0} min)
                          </span>
                        </div>
                        {(activity.topicTags ?? activity.topic_tags ?? []).length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Hash className="text-muted-foreground h-4 w-4" />
                            <div className="flex flex-wrap gap-1">
                              {(activity.topicTags ?? activity.topic_tags ?? []).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
