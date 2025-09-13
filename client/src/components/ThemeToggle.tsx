import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { name: 'light', icon: Sun, label: 'Light' },
    { name: 'dark', icon: Moon, label: 'Dark' },
    { name: 'system', icon: Monitor, label: 'System' }
  ] as const

  const currentThemeIndex = themes.findIndex(t => t.name === theme)
  const nextTheme = themes[(currentThemeIndex + 1) % themes.length]

  const handleToggle = () => {
    setTheme(nextTheme.name)
  }

  const CurrentIcon = themes.find(t => t.name === theme)?.icon || Sun

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-40 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      title={`Switch to ${nextTheme.label} theme`}
      aria-label={`Switch to ${nextTheme.label} theme`}
    >
      <CurrentIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </button>
  )
}