import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      setIsLoggingOut(true)
      try {
        await logout()
      } catch (error) {
        console.error('Logout failed:', error)
        setIsLoggingOut(false)
      }
    }
  }

  if (!user) return null

  return (
    <div className="fixed top-4 right-20 z-40">
      <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-2">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            @{user.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.displayName}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  )
}
