import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WeeklyFocusChart } from './WeeklyFocusChart'
import { TimePeriodSelector, TimePeriod } from './TimePeriodSelector'
import { usePomodoroEvents } from '@/hooks/usePomodoroEvents'
import { getPomodoroPeriodStats } from '@/lib/client/apiClient'
import { Skeleton } from '@/components/ui/skeleton'

export function PomodoroStatsPanel() {
  const { t } = useTranslation()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week')

  // Fetch period statistics
  const {
    data: periodStatsData,
    refetch: refetchPeriodStats,
    isLoading
  } = useQuery({
    queryKey: ['pomodoro-period-stats', selectedPeriod],
    queryFn: async () => {
      const result = await getPomodoroPeriodStats({
        period: selectedPeriod,
        referenceDate: format(new Date(), 'yyyy-MM-dd')
      })
      return result
    }
  })

  // Listen to Pomodoro events to refresh stats
  usePomodoroEvents({
    onWorkPhaseCompleted: () => {
      refetchPeriodStats()
    },
    onSessionDeleted: () => {
      refetchPeriodStats()
    }
  })

  const periodStats = periodStatsData?.data

  return (
    <div className="flex h-[700px] flex-col">
      {/* Header with period selector */}
      <Card className="flex-shrink-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">{t('pomodoro.review.statisticsPanel')}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">{t('pomodoro.review.trackYourProgress')}</p>
          </div>
          <TimePeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
        </CardHeader>
      </Card>

      {/* Stats content - scrollable */}
      <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : periodStats ? (
          <>
            {/* Statistics Overview Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="shadow-none">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">{t('pomodoro.review.overview.weeklyTotal')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums">{periodStats.weeklyTotal}</span>
                      <span className="text-muted-foreground text-sm">{t('pomodoro.review.sessions')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">{t('pomodoro.review.overview.focusHours')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums">{periodStats.focusHours.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">{t('pomodoro.review.overview.dailyAverage')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums">{periodStats.dailyAverage}</span>
                      <span className="text-muted-foreground text-sm">{t('pomodoro.review.sessions')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {t('pomodoro.review.overview.completionRate')}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums">{periodStats.completionRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Focus Chart - Only show for week period */}
            {selectedPeriod === 'week' && <WeeklyFocusChart data={periodStats.dailyData} />}
          </>
        ) : (
          <Card className="shadow-none">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
