import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { setTheme } from '../utils'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize from system preference — no localStorage
  const getSystemIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches
  const [theme, setThemeState] = useState<Theme>('system')
  const [isDark, setIsDark] = useState(getSystemIsDark)

  const updateIsDark = useCallback((currentTheme: Theme) => {
    if (currentTheme === 'system') {
      setIsDark(getSystemIsDark())
    } else {
      setIsDark(currentTheme === 'dark')
    }
  }, [])

  useEffect(() => {
    setTheme(theme)
    updateIsDark(theme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateIsDark('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, updateIsDark])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    setThemeState(newTheme)
    updateIsDark(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}