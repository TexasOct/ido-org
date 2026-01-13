import { useTranslation } from 'react-i18next'

import { PageLayout } from '@/components/layout/PageLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { PomodoroTodoList } from '@/components/pomodoro/PomodoroTodoList'
import { PomodoroStatsPanel } from '@/components/pomodoro/PomodoroStatsPanel'

export default function Pomodoro() {
  const { t } = useTranslation()

  return (
    <PageLayout stickyHeader>
      <PageHeader title={t('pomodoro.title')} description={t('pomodoro.description')} />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-[1600px] gap-6">
          {/* Left Sidebar - Todo List */}
          <aside className="hidden w-[360px] shrink-0 md:block">
            <div className="sticky top-6">
              <PomodoroTodoList selectedTodoId={null} onTodoSelect={() => {}} disabled={false} />
            </div>
          </aside>

          {/* Main Content - Statistics Panel */}
          <main className="min-w-0 flex-1">
            <PomodoroStatsPanel />
          </main>
        </div>
      </div>
    </PageLayout>
  )
}
