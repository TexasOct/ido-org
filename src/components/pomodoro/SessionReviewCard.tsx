import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Clock, Activity, Target, Trash2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState, useCallback, MouseEvent } from 'react'
import { toast } from 'sonner'
import { deletePomodoroSession } from '@/lib/client/apiClient'

interface SessionReviewCardProps {
  session: {
    id: string
    user_intent: string
    actual_duration_minutes?: number
    pure_work_duration_minutes?: number
    status: string
  }
  activityCount: number
  focusLevel: 'excellent' | 'good' | 'moderate' | 'low'
  onViewDetails: () => void
  onDeleted?: () => void
}

export function SessionReviewCard({
  session,
  activityCount,
  focusLevel,
  onViewDetails,
  onDeleted
}: SessionReviewCardProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDeleteButtonClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    if (isDeleting) return
    setDeleteDialogOpen(false)
  }, [isDeleting])

  const handleConfirmDelete = useCallback(async () => {
    if (isDeleting) return

    setIsDeleting(true)
    let deletionSucceeded = false
    try {
      const result = await deletePomodoroSession({ sessionId: session.id })
      if (result.success) {
        deletionSucceeded = true
        toast.success(t('pomodoro.review.deleteSuccess'))
        onDeleted?.()
      } else {
        toast.error(t('pomodoro.review.deleteError'))
      }
    } catch (error) {
      console.error('[SessionReviewCard] Failed to delete session:', error)
      toast.error(t('pomodoro.review.deleteError'))
    } finally {
      setIsDeleting(false)
      if (deletionSucceeded) {
        setDeleteDialogOpen(false)
      }
    }
  }, [session.id, isDeleting, onDeleted, t])

  // Map focus level to badge variant and color
  const getFocusBadge = (level: string) => {
    switch (level) {
      case 'excellent':
        return {
          variant: 'default' as const,
          className: 'bg-green-600 text-white hover:bg-green-700'
        }
      case 'good':
        return {
          variant: 'default' as const,
          className: 'bg-blue-600 text-white hover:bg-blue-700'
        }
      case 'moderate':
        return {
          variant: 'default' as const,
          className: 'bg-yellow-600 text-white hover:bg-yellow-700'
        }
      case 'low':
        return {
          variant: 'default' as const,
          className: 'bg-red-600 text-white hover:bg-red-700'
        }
      default:
        return { variant: 'secondary' as const, className: '' }
    }
  }

  const focusBadge = getFocusBadge(focusLevel)

  return (
    <>
      <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onViewDetails}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 flex-1 text-base">{session.user_intent}</CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Badge {...focusBadge}>{t(`pomodoro.review.focusLevel.${focusLevel}`)}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteButtonClick}
                className="text-destructive hover:text-destructive h-8 w-8"
                title={t('pomodoro.review.deleteSession')}
                disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{session.pure_work_duration_minutes || 0} min</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>
                {activityCount}{' '}
                {activityCount === 1
                  ? t('pomodoro.review.activityTimeline.activity')
                  : t('pomodoro.review.activityTimeline.activities')}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={onViewDetails}>
            <Target className="mr-2 h-4 w-4" />
            {t('chat.viewDetails')}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialogOpen(open)
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pomodoro.review.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('pomodoro.review.deleteConfirmDescription', { count: activityCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
