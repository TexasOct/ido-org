import { useEffect } from 'react'
import { Clock, Gauge, Zap } from 'lucide-react'

import { usePomodoroStore } from '@/lib/stores/pomodoro'
import { cn } from '@/lib/utils'

interface PresetButtonsProps {
  layout?: 'horizontal' | 'vertical'
}

// Preset configuration with icon component and color scheme
const PRESET_CONFIGS = {
  classic: {
    icon: Clock,
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    hoverBgColor: 'hover:bg-primary/20',
    selectedBgColor: 'bg-primary/30',
    borderColor: 'border-primary/30'
  },
  extended: {
    icon: Gauge,
    bgColor: 'bg-chart-3/10',
    iconColor: 'text-chart-3',
    hoverBgColor: 'hover:bg-chart-3/20',
    selectedBgColor: 'bg-chart-3/30',
    borderColor: 'border-chart-3/30'
  },
  deep: {
    icon: Zap,
    bgColor: 'bg-chart-4/10',
    iconColor: 'text-chart-4',
    hoverBgColor: 'hover:bg-chart-4/20',
    selectedBgColor: 'bg-chart-4/30',
    borderColor: 'border-chart-4/30'
  }
} as const

/**
 * Preset buttons for quick Pomodoro configuration
 * Displays 3 preset options with auto-detection of matching config
 */
export function PresetButtons({ layout = 'horizontal' }: PresetButtonsProps) {
  const { config, presets, selectedPresetId, applyPreset, setSelectedPresetId, setPresets } = usePomodoroStore()

  // Initialize default presets if empty
  useEffect(() => {
    if (presets.length === 0) {
      setPresets([
        {
          id: 'classic',
          name: '25 - 5',
          description: 'Classic Pomodoro',
          workDurationMinutes: 25,
          breakDurationMinutes: 5,
          totalRounds: 2,
          icon: '🍅'
        },
        {
          id: 'extended',
          name: '50 - 10',
          description: 'Extended Focus',
          workDurationMinutes: 50,
          breakDurationMinutes: 10,
          totalRounds: 2,
          icon: '⏰'
        },
        {
          id: 'deep',
          name: '90 - 20',
          description: 'Deep Work',
          workDurationMinutes: 90,
          breakDurationMinutes: 20,
          totalRounds: 2,
          icon: '🚀'
        }
      ])
    }
  }, [presets.length, setPresets])

  // Auto-detect if current config matches a preset
  useEffect(() => {
    if (!selectedPresetId) {
      const matchingPreset = presets.find(
        (p) =>
          p.workDurationMinutes === config.workDurationMinutes &&
          p.breakDurationMinutes === config.breakDurationMinutes &&
          p.totalRounds === config.totalRounds
      )
      if (matchingPreset) {
        setSelectedPresetId(matchingPreset.id)
      }
    }
  }, [config, presets, selectedPresetId, setSelectedPresetId])

  const handlePresetClick = (presetId: string) => {
    setSelectedPresetId(presetId)
    applyPreset(presetId)
  }

  if (presets.length === 0) {
    return null
  }

  return (
    <div className={cn('gap-2', layout === 'vertical' ? 'flex flex-col' : 'grid grid-cols-1 sm:grid-cols-3')}>
      {presets.map((preset) => {
        const isSelected = selectedPresetId === preset.id
        const presetConfig = PRESET_CONFIGS[preset.id as keyof typeof PRESET_CONFIGS]

        if (!presetConfig) return null

        const IconComponent = presetConfig.icon

        return (
          <button
            key={preset.id}
            className={cn(
              'group relative overflow-hidden rounded-lg border-2 px-3 py-2.5',
              'transition-all duration-300 ease-out',
              'hover:scale-[1.02] hover:shadow-lg',
              'active:scale-[0.98]',
              isSelected ? presetConfig.selectedBgColor : presetConfig.bgColor,
              isSelected ? presetConfig.borderColor : 'border-border',
              !isSelected && presetConfig.hoverBgColor,
              isSelected && 'ring-2 ring-offset-2',
              isSelected && 'ring-primary/20'
            )}
            onClick={() => handlePresetClick(preset.id)}>
            {/* Icon */}
            <div className="mb-2 flex justify-center">
              <div
                className={cn(
                  'rounded-full p-1.5',
                  'transition-all duration-300',
                  'bg-background/60 backdrop-blur-sm',
                  'group-hover:scale-110',
                  isSelected && 'scale-110 shadow-lg'
                )}>
                <IconComponent className={cn('h-5 w-5', presetConfig.iconColor)} strokeWidth={2.5} />
              </div>
            </div>

            {/* Title */}
            <div className="mb-0.5 text-center text-sm font-bold">{preset.name}</div>

            {/* Description */}
            <div className="text-muted-foreground text-center text-xs">
              {preset.totalRounds} × ({preset.workDurationMinutes}m + {preset.breakDurationMinutes}m)
            </div>
          </button>
        )
      })}
    </div>
  )
}
