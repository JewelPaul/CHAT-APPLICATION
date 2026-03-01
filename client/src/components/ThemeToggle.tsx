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
  const CurrentIcon = themes.find(t => t.name === theme)?.icon || Sun

  return (
    <button
      onClick={() => setTheme(nextTheme.name)}
      className="fixed top-3 right-3 z-40 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-all duration-200 shadow-sm"
      title={`Switch to ${nextTheme.label} theme`}
      aria-label={`Switch to ${nextTheme.label} theme`}
    >
      <CurrentIcon className="w-4 h-4 text-[var(--text-secondary)]" />
    </button>
  )
}
